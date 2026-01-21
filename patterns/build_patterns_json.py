import json
import re
from pathlib import Path

PATTERNS_DIR = Path("./patterns")
OUTPUT_FILE = PATTERNS_DIR / "patterns.json"


def make_label(name: str) -> str:
    name = name.replace("_", " ")
    return " ".join(word.capitalize() for word in name.split())


def dump_json_with_inline_formats(data, file):
    """
    Pretty-print JSON but force `"format": [...]` arrays onto one line.
    """
    text = json.dumps(data, indent=2)

    # Collapse only the format arrays
    text = re.sub(
        r'"format": \[\s*([^\]]+?)\s*\]',
        lambda m: '"format": [' + " ".join(
            line.strip() for line in m.group(1).splitlines()
        ).replace(", ", ", ") + ']',
        text,
        flags=re.MULTILINE
    )

    file.write(text)


def main():
    if not PATTERNS_DIR.exists():
        raise FileNotFoundError(f"{PATTERNS_DIR} does not exist")

    patterns = {}

    for file in sorted(PATTERNS_DIR.iterdir()):
        if not file.is_file():
            continue

        # skip generator files
        if file.suffix in {".py", ".json"}:
            continue

        pattern_id = file.stem
        ext = file.suffix.lstrip(".")

        try:
            text = file.read_text(encoding="utf-8")
        except Exception:
            continue

        if pattern_id not in patterns:
            patterns[pattern_id] = {
                "label": make_label(pattern_id),
                "desc": "",
                "format": [],
                "lines": 0
            }

        entry = patterns[pattern_id]

        if ext not in entry["format"]:
            entry["format"].append(ext)

        lines = text.count("\n") + 1 if text else 0
        entry["lines"] = max(entry["lines"], lines)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        dump_json_with_inline_formats(patterns, f)

    print(f"Wrote {len(patterns)} patterns to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
