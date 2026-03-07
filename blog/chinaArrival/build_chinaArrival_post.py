import re
from pathlib import Path

# ----------------------------
# Config
# ----------------------------
INDEX_FILE = "index.html"
WP_EXPORT_FILE = "wp-export.html"
IMAGES_DIR = "images_chinaArrival"
IMAGE_PREFIX = "chinaArrival_"  # nz_01.jpg etc

def read_text(path: Path) -> str:
    # Try common encodings
    for enc in ("utf-8", "utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=enc)
        except Exception:
            pass
    return path.read_text(encoding="utf-8", errors="ignore")

def main():
    base = Path(__file__).resolve().parent
    index_path = base / INDEX_FILE
    wp_path = base / WP_EXPORT_FILE
    img_dir = base / IMAGES_DIR

    if not index_path.exists():
        raise FileNotFoundError(f"Missing {index_path}")
    if not wp_path.exists():
        raise FileNotFoundError(f"Missing {wp_path}")
    if not img_dir.exists():
        raise FileNotFoundError(f"Missing folder {img_dir}")

    # Load files
    index_html = read_text(index_path)
    wp_html = read_text(wp_path)

    # Find all <img ... src="..."> and <img ... src='...'>
    img_src_pattern = re.compile(r"<img([^>]*?)\s+src\s*=\s*(['\"])(.*?)\2([^>]*?)>", re.IGNORECASE)
    matches = list(img_src_pattern.finditer(wp_html))

    if not matches:
        print("No <img src=...> tags found in wp-export.html")
        return

    # Count local images available (any extension)
    local_images = sorted(img_dir.glob(f"{IMAGE_PREFIX}[0-9][0-9].*"))
    if not local_images:
        print(f"No local images found in {img_dir} matching {IMAGE_PREFIX}01.* etc")
        return

    # We’ll assign images in the order they appear in wp-export.html
    used = 0
    total_imgs_in_wp = len(matches)

    def replacement(_m):
        nonlocal used
        used += 1
        # Build local filename with same numbering
        # Prefer existing file extension by checking what's on disk
        num = f"{used:02d}"
        candidates = sorted(img_dir.glob(f"{IMAGE_PREFIX}{num}.*"))
        if candidates:
            local_name = candidates[0].name
        else:
            # fallback to jpg if missing
            local_name = f"{IMAGE_PREFIX}{num}.jpg"

        local_src = f"{IMAGES_DIR}/{local_name}"

        # Preserve any existing attributes EXCEPT the old src
        before_attrs = (_m.group(1) or "").strip()
        after_attrs = (_m.group(4) or "").strip()

        # Remove any existing loading attr so we can set it consistently
        attrs = f"{before_attrs} {after_attrs}".strip()
        attrs = re.sub(r"\s+loading\s*=\s*(['\"]).*?\1", "", attrs, flags=re.IGNORECASE)

        # Keep alt if present; if not, add alt=""
        if re.search(r"\salt\s*=", attrs, flags=re.IGNORECASE) is None:
            attrs = (attrs + ' alt=""').strip()

        # Ensure lazy loading
        attrs = (attrs + ' loading="lazy"').strip()

        return f'<img src="{local_src}" {attrs}>'

    new_wp_html = img_src_pattern.sub(replacement, wp_html)

    print(f"Found {total_imgs_in_wp} images in wp-export.html")
    print(f"Replaced {used} images with local paths like {IMAGES_DIR}/{IMAGE_PREFIX}01.jpg")

    # Now inject into index.html
    marker = "<!-- PASTE POST HERE -->"
    if marker not in index_html:
        print("Could not find marker <!-- PASTE POST HERE --> in index.html")
        print("Add it inside <div class=\"post-body\"> and re-run.")
        return

    # Backup original index.html
    backup_path = index_path.with_suffix(".html.bak")
    backup_path.write_text(index_html, encoding="utf-8")
    print(f"Backup created: {backup_path.name}")

    # Replace marker with content
    index_updated = index_html.replace(marker, new_wp_html)

    index_path.write_text(index_updated, encoding="utf-8")
    print("✅ Done! index.html updated with converted post content.")

if __name__ == "__main__":
    main()