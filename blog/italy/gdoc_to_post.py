import re
import zipfile
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO

# ----------------------------
# CONFIG
# ----------------------------
# ensure sharing is enabled in the google doc (anyone with link). paste the link below. Open cmd inside file explorer of this folder (website/blog/italy). 
# Then run "py gdoc_to_post.py"
# This only works if you have really good wifi and are paitent b/c it takes a while for the html extract to work.
DOC_URL = "https://docs.google.com/document/d/1N59cI8dcmCjrP6-6UP9eOVHKh5RroL4gjnGiZeuD03s/edit?usp=sharing"

POST_TITLE = "Italy"
POST_META = "2026 • Italy Trip"  # edit this
PREFIX = "italy_"               # italy_01.jpg, italy_02.jpg... This is the prefix before the images its looking for.
IMAGES_DIR = "images_italy"  # this is the image folder (its created when you run this)
EXPORT_HTML = "gdoc-export.html"
ZIP_NAME = "italy_images.zip"

# Where your final blog post page is
INDEX_FILE = "index.html"

# Network behavior
HEADERS = {"User-Agent": "Mozilla/5.0"}
TIMEOUT = (15, 280)  # connect, read (seconds)
RETRIES = 2

# ----------------------------
# Helpers
# ----------------------------
def doc_id_from_url(url: str) -> str:
    # expects .../document/d/<ID>/...
    m = re.search(r"/document/d/([^/]+)/", url)
    if not m:
        raise ValueError("Could not find Google Doc ID in the URL.")
    return m.group(1)

def export_html_url(doc_id: str) -> str:
    return f"https://docs.google.com/document/d/{doc_id}/export?format=html"

def download_text(url: str) -> str:
    last_err = None
    for attempt in range(RETRIES + 1):
        try:
            with requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True) as resp:
                resp.raise_for_status()
                # Read chunks so slow connections don't look "frozen"
                chunks = []
                for chunk in resp.iter_content(chunk_size=1024 * 256):
                    if chunk:
                        chunks.append(chunk)
                data = b"".join(chunks)
                return data.decode("utf-8", errors="ignore")
        except Exception as e:
            last_err = e
            print(f"Export attempt {attempt+1} failed: {e}")
    raise RuntimeError(f"Failed to download export HTML after retries. Last error: {last_err}")

def download_bytes(url: str) -> bytes:
    last_err = None
    for attempt in range(RETRIES + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            resp.raise_for_status()
            return resp.content
        except Exception as e:
            last_err = e
    raise RuntimeError(f"Failed to download after retries: {url}\n{last_err}")

def to_jpg_bytes(image_bytes: bytes) -> bytes:
    # Convert any image format to jpg
    im = Image.open(BytesIO(image_bytes))
    im = im.convert("RGB")
    out = BytesIO()
    im.save(out, format="JPEG", quality=92)
    return out.getvalue()

def sanitize_for_post_body(html_fragment: str) -> str:
    """
    Keep content clean. We strip the outer <html><head>... and keep body content.
    """
    soup = BeautifulSoup(html_fragment, "html.parser")
    body = soup.body
    if not body:
        return html_fragment  # fallback

    # Remove some common Google export junk if present
    for tag in body.find_all(["meta", "style", "script"]):
        tag.decompose()

    # Return body inner HTML
    return "".join(str(x) for x in body.contents)

def main():
    base = Path(__file__).resolve().parent
    images_dir = base / IMAGES_DIR
    images_dir.mkdir(parents=True, exist_ok=True)

    # 1) Export doc as HTML
    doc_id = doc_id_from_url(DOC_URL)
    html_url = export_html_url(doc_id)

    print("Exporting Google Doc as HTML...")
    html = download_text(html_url)

    # Save raw export for reference/debug
    (base / EXPORT_HTML).write_text(html, encoding="utf-8")
    print(f"Saved raw export: {EXPORT_HTML}")

    # 2) Parse HTML, extract images in-order
    soup = BeautifulSoup(html, "html.parser")
    imgs = soup.find_all("img")

    print(f"Found {len(imgs)} <img> tags in exported doc.")

    # 3) Download images, convert to JPG, rewrite src to local
    downloaded = []
    for idx, img in enumerate(imgs, start=1):
        src = img.get("src", "").strip()
        if not src.startswith("http"):
            continue

        filename = f"{PREFIX}{idx:02d}.jpg"
        out_path = images_dir / filename

        print(f"[{idx:02d}] Downloading image...")
        try:
            raw = download_bytes(src)
            jpg = to_jpg_bytes(raw)
            out_path.write_bytes(jpg)
            downloaded.append(out_path)

            # rewrite HTML to local path
            img["src"] = f"{IMAGES_DIR}/{filename}"
            img["loading"] = "lazy"
        except Exception as e:
            print(f"  FAILED image {idx:02d}: {e}")
            # Keep numbering stable by writing a placeholder image
            # (simple placeholder)
            placeholder = Image.new("RGB", (1200, 675), (180, 40, 60))
            ph_out = BytesIO()
            placeholder.save(ph_out, "JPEG", quality=85)
            out_path.write_bytes(ph_out.getvalue())
            downloaded.append(out_path)
            img["src"] = f"{IMAGES_DIR}/{filename}"
            img["loading"] = "lazy"

    print(f"Saved {len(downloaded)} images to {IMAGES_DIR}/")

    # 4) Build clean post body HTML from the modified soup
    new_body_html = sanitize_for_post_body(str(soup))

    # 5) Inject into your blog post index.html template
    index_path = base / INDEX_FILE
    if not index_path.exists():
        raise FileNotFoundError(f"Missing {INDEX_FILE} in {base}")

    index_html = index_path.read_text(encoding="utf-8", errors="ignore")

    # Replace title/meta if you want (optional)
    index_html = re.sub(r"<h1 class=\"post-title\">.*?</h1>",
                        f"<h1 class=\"post-title\">{POST_TITLE}</h1>",
                        index_html, flags=re.DOTALL)

    index_html = re.sub(r"<p class=\"post-meta\">.*?</p>",
                        f"<p class=\"post-meta\">{POST_META}</p>",
                        index_html, flags=re.DOTALL)

    marker = "<!-- PASTE POST HERE -->"
    if marker not in index_html:
        raise RuntimeError("Could not find <!-- PASTE POST HERE --> marker in index.html")

    backup = base / "index.html.bak"
    backup.write_text(index_html, encoding="utf-8")
    print("Backup created: index.html.bak")

    final_html = index_html.replace(marker, new_body_html)
    index_path.write_text(final_html, encoding="utf-8")
    print("✅ index.html updated with converted Google Doc content.")

    # 6) Zip images (optional)
    zip_path = base / ZIP_NAME
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(images_dir.glob(f"{PREFIX}[0-9][0-9].jpg")):
            zf.write(f, arcname=f.name)
    print(f"Zip created: {ZIP_NAME}")

if __name__ == "__main__":
    main()