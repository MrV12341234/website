import os
import re
import zipfile
from pathlib import Path

import requests

# ----------------------------
# Config (edit if you want)
# ----------------------------
HTML_FILE = "wp-export.html"          # input: your pasted WP HTML
OUT_DIR = "images_firstMonth"         # output folder
ZIP_NAME = "firstMonth_images.zip"    # output zip
PREFIX = "firstMonth_"                        # nz_01, nz_02, ...
START_INDEX = 1

TIMEOUT = 30
HEADERS = {"User-Agent": "Mozilla/5.0"}

# Map response Content-Type -> file extension
CONTENT_TYPE_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

def extract_img_urls(html_text: str) -> list[str]:
    # Finds src="..." in img tags
    # Also catches <img src='...'> and weird spacing
    pattern = re.compile(r"<img[^>]+src\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE)
    urls = pattern.findall(html_text)

    # Deduplicate while preserving order
    seen = set()
    ordered = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            ordered.append(u)
    return ordered

def ext_from_response(resp: requests.Response) -> str:
    ctype = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    return CONTENT_TYPE_TO_EXT.get(ctype, ".jpg")  # default .jpg

def main():
    html_path = Path(HTML_FILE)
    if not html_path.exists():
        raise FileNotFoundError(f"Can't find {HTML_FILE}. Put it next to this script.")

    out_dir = Path(OUT_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)

    html_text = html_path.read_text(encoding="utf-8", errors="ignore")
    urls = extract_img_urls(html_text)

    if not urls:
        print("No image URLs found. Make sure your HTML contains <img src=...> tags.")
        return

    print(f"Found {len(urls)} unique image URLs.")
    downloaded_files: list[Path] = []

    session = requests.Session()
    session.headers.update(HEADERS)

    for i, url in enumerate(urls, start=START_INDEX):
        try:
            resp = session.get(url, timeout=(10, 30))
            resp.raise_for_status()

            ext = ext_from_response(resp)
            filename = f"{PREFIX}{i:02d}{ext}"
            file_path = out_dir / filename

            file_path.write_bytes(resp.content)
            print(f"Downloading {i:02d}: {url}")
            downloaded_files.append(file_path)
            print(f"[{i:02d}/{len(urls):02d}] Saved {filename}")

        except Exception as e:
            print(f"[{i:02d}] FAILED: {url}\n  -> {e}")

    # Zip them up
    zip_path = Path(ZIP_NAME)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in downloaded_files:
            zf.write(f, arcname=f.name)

    print("\nDone!")
    print(f"Images folder: {out_dir.resolve()}")
    print(f"Zip file:      {zip_path.resolve()}")

if __name__ == "__main__":
    main()