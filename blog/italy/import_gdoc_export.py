from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag

EXPORT_HTML = "gdoc-export.html"
INDEX_HTML = "index.html"
MARKER = "<!-- PASTE POST HERE -->"


def is_blank_text(node) -> bool:
    return isinstance(node, NavigableString) and not str(node).strip()


def clean_google_export(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    body = soup.body
    if not body:
        return html

    # Remove stuff that shouldn't be in your post body
    for t in body.find_all(["style", "script", "meta"]):
        t.decompose()

    # --- 1) Convert paragraphs containing images into <figure> blocks IN PLACE ---
    # (This avoids the "not part of a tree" errors from stale <p> references.)
    for p in list(body.find_all("p")):
        imgs = p.find_all("img")
        if not imgs:
            continue

        # Build a figure that contains all images found in this paragraph (usually 1)
        figure = soup.new_tag("figure")
        figure["class"] = ["post-figure"]

        for img in imgs:
            # Clean attributes
            img.attrs.pop("style", None)
            img.attrs.pop("width", None)
            img.attrs.pop("height", None)

            if "alt" not in img.attrs:
                img["alt"] = ""
            img["loading"] = "lazy"

            # Remove title if you don't want it
            # img.attrs.pop("title", None)

            img.extract()
            figure.append(img)

        # Replace THIS paragraph with the figure (safe because p is still in the tree)
        if p.parent is not None:
            p.replace_with(figure)

    # --- 2) Unwrap Google formatting spans (after image conversion) ---
    for span in list(body.find_all("span")):
        # If span still contains images (rare), keep it
        if span.find("img"):
            continue
        span.unwrap()

    # --- 3) Remove Google Doc classes like c1/c2 and inline styles ---
    for tag in body.find_all(True):
        tag.attrs.pop("style", None)
        # Strip those Google export classes
        if tag.name in {"p", "h1", "h2", "h3", "h4", "h5", "h6"}:
            tag.attrs.pop("class", None)

    # --- 4) Remove empty paragraphs AFTER images are handled ---
    for p in list(body.find_all("p")):
        if not p.get_text(strip=True) and not p.find("img"):
            p.decompose()

    # --- 5) Output readable HTML: separate top-level blocks with blank lines ---
    blocks = []
    for node in body.contents:
        if is_blank_text(node):
            continue
        blocks.append(str(node))

    return "\n\n".join(blocks).strip() + "\n"


def main():
    base = Path(__file__).resolve().parent
    export_path = base / EXPORT_HTML
    index_path = base / INDEX_HTML

    if not export_path.exists():
        raise FileNotFoundError(f"Missing {EXPORT_HTML} in {base}")
    if not index_path.exists():
        raise FileNotFoundError(f"Missing {INDEX_HTML} in {base}")

    export_html = export_path.read_text(encoding="utf-8", errors="ignore")
    cleaned_fragment = clean_google_export(export_html)

    index_html = index_path.read_text(encoding="utf-8", errors="ignore")
    if MARKER not in index_html:
        raise RuntimeError(f"Marker not found in {INDEX_HTML}: {MARKER}")

    # Backup current index
    backup_path = base / "index.html.bak"
    backup_path.write_text(index_html, encoding="utf-8")

    updated = index_html.replace(MARKER, cleaned_fragment)
    index_path.write_text(updated, encoding="utf-8")

    print("✅ Done!")
    print(f"- Imported: {EXPORT_HTML}")
    print(f"- Updated:  {INDEX_HTML}")
    print(f"- Backup:   index.html.bak")


if __name__ == "__main__":
    main()