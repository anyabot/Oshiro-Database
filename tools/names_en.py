"""English castle girl names from tools/data/unit_names_en.json (built by translate_names.py, hand-fixed).

`[夏]仙台城` -> `[Summer] Sendai Castle`: the [prefix] and the base name are looked up separately.

    python tools/names_en.py      # add name_en to the already exported public/data JSON
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TABLE = ROOT / "tools" / "data" / "unit_names_en.json"
_table: dict | None = None


def name_en(jp: str) -> str | None:
    global _table
    if _table is None:
        _table = json.loads(TABLE.read_text(encoding="utf-8")) if TABLE.exists() else {"prefix": {}, "name": {}}
    m = re.fullmatch(r"\[([^\]]+)\](.+)", jp or "")
    prefix, base = (m.group(1), m.group(2)) if m else (None, jp)
    en = _table["name"].get(base)
    if not en:
        return None
    return f"[{_table['prefix'].get(prefix, prefix)}] {en}" if prefix else en


def _patch(path: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))

    def fix(d: dict) -> dict:
        en = name_en(d.get("name", ""))
        out = {}
        for k, v in d.items():
            if k == "name_en":
                continue
            out[k] = v
            if k == "name":
                out["name_en"] = en
        return out

    data = [fix(d) for d in data] if isinstance(data, list) else fix(data)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    pub = ROOT / "public" / "data"
    _patch(pub / "units.json")
    for p in (pub / "unit").glob("*.json"):
        _patch(p)
    print("name_en added")
