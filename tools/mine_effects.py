"""Pair effect rows with the description clause that states their value.

    python mine_effects.py [--out ../tools/out]

Ability descriptions in this game spell out every clause with its number
("射程内の城娘の射程が15上昇"). For each effect row we look for a clause in the
owning ability's description whose number matches the row's value (as N, N%,
or 1+N/100 倍 / N/100 倍), and record the noun before が and the verb after the
number. Tallied per code, this gives each code the game's own wording.

Writes out/effect_mining.json and a readable out/effect_mining.md.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

from oshirore.abilities import ABILITY_ARC, clean_text, first_by, group_rows
from oshirore.cache import GameCache

CLAUSE = re.compile(
    r"(?P<noun>[^\n、。､,，が]{1,24}?)(?:が|を)(?P<num>\d+(?:\.\d+)?)(?P<unit>%|％|倍|秒)?(?P<verb>[^\n、。､,，0-9]{0,6})"
)


def clauses(text: str):
    for m in CLAUSE.finditer(text or ""):
        yield m.group("noun").strip(), float(m.group("num")), m.group("unit") or "", m.group("verb")


def value_forms(v: float) -> set[float]:
    """Numbers a description may print for a stored value."""
    out = {float(v)}
    if v:
        out.add(round(1 + v / 100, 4))   # 20 -> 1.2倍
        out.add(round(v / 100, 4))       # 120 -> 1.2倍
        out.add(round(v / 1000, 4))      # millis -> seconds
        out.add(round(abs(v), 4))
    return out


def value_form(v: float, num: float) -> str:
    """How a printed number relates to the stored value: same, 1+v/100, v/100 or v/1000."""
    n = round(num, 4)
    if n == round(v, 4) or n == round(abs(v), 4):
        return "raw"
    if n == round(1 + v / 100, 4):
        return "add"
    if n == round(v / 100, 4):
        return "mul"
    return "milli"


GENERIC = {"時間", "ダメージ", "範囲", "気"}


def noun_core(noun: str) -> str:
    """The stat word: the part after the last の (射程内の城娘の射程 -> 射程).
    A generic word keeps the phrase that qualifies it (計略使用までの時間)."""
    parts = noun.split("の")
    core = parts[-1].strip("「」【】()（）[] ")
    if core in GENERIC and len(parts) > 1 and parts[-2].endswith("まで"):
        core = f"{parts[-2]}の{core}"
    # 再配置までの時間 and 再配置時間 are the same thing
    return {"再配置までの時間": "再配置時間"}.get(core, core)


class Tally:
    def __init__(self):
        self.data: dict[str, dict] = collections.defaultdict(
            lambda: {"rows": 0, "matched": 0, "nouns": collections.Counter(), "verbs": collections.Counter(),
                     "units": collections.Counter(), "forms": collections.Counter(), "examples": []})

    def add(self, key: str, row_value: float, text: str, example: str, single: bool):
        d = self.data[key]
        d["rows"] += 1
        forms = value_forms(row_value)
        for noun, num, unit, verb in clauses(text):
            if round(num, 4) in forms:
                w = 3 if single else 1
                d["matched"] += 1
                d["nouns"][noun_core(noun)] += w
                d["verbs"][verb] += w
                d["units"][unit or "-"] += w
                d["forms"][value_form(row_value, num)] += w
                if len(d["examples"]) < 4:
                    d["examples"].append(f"{example}: {noun}が{num:g}{unit}{verb}")
                break

    def dump(self):
        out = {}
        for k, d in sorted(self.data.items(), key=lambda kv: (kv[0].split(":")[0], _num(kv[0]))):
            out[k] = {
                "rows": d["rows"], "matched": d["matched"],
                "nouns": d["nouns"].most_common(5), "verbs": d["verbs"].most_common(4),
                "units": d["units"].most_common(3), "forms": d["forms"].most_common(3), "examples": d["examples"],
            }
        return out


def _num(k: str) -> float:
    try:
        return float(k.split(":")[1].split("/")[0])
    except (IndexError, ValueError):
        return 0


def mine(c: GameCache) -> dict:
    """Mining results keyed "<vocabulary>:<code>"."""
    smt = {r["ModifierID"]: r for r in c.table("UnitEffect.aar", "StatusModifierType.atb") if r["ModifierID"]}
    t = Tally()

    def smt_key(code: int) -> str:
        d = smt.get(code)
        return f"status:{d['StatusType']}" if d else f"smt?:{code}"

    # unit ability slots that carry StatusModifierType + text
    for eff, txt in [("Ability.atb", "AbilityText.atb"), ("PossessedAbility.atb", "PossessedAbilityText.atb"),
                     ("DefeatedAbility.atb", "DefeatedAbilityText.atb")]:
        groups = group_rows(c.table(ABILITY_ARC, eff), "AbilityID")
        texts = first_by(c.table(ABILITY_ARC, txt), "AbilityID")
        for aid, rows in groups.items():
            tx = texts.get(aid)
            if not tx:
                continue
            desc = clean_text(tx["Description"])
            single = len(rows) == 1
            for r in rows:
                ex = f"{eff[:-4]}#{aid} {clean_text(tx['Name'])}"
                if r.get("StatusModifierType"):
                    t.add(smt_key(r["StatusModifierType"]), r["EffectValue"], desc, ex, single)
                    t.add(f"smt:{r['StatusModifierType']}", r["EffectValue"], desc, ex, single)
                t.add(f"abilitytype:{r['AbilityType']}/{r.get('AbilityTypeDetail', 0)}", r["EffectValue"], desc, ex, single)
                if r.get("AbilityTargetType"):
                    t.add(f"target:{r['AbilityTargetType']}", r["EffectValue"], desc, ex, single)

    # organized (formation) abilities: EffectType vocabulary
    groups = group_rows(c.table(ABILITY_ARC, "OrganizedAbility.atb"), "AbilityID")
    texts = first_by(c.table(ABILITY_ARC, "OrganizedAbilityText.atb"), "AbilityID")
    for aid, rows in groups.items():
        tx = texts.get(aid)
        if not tx:
            continue
        for r in rows:
            t.add(f"effecttype:{r['EffectType']}", r["EffectValue"], clean_text(tx["Description"]),
                  f"Organized#{aid} {clean_text(tx['Name'])}", len(rows) == 1)

    # potential rows carry their own one-clause description
    for r in c.table(ABILITY_ARC, "PotentialAbility.atb"):
        if r["EffectType"]:
            t.add(f"effecttype:{r['EffectType']}", r["EffectValue"], clean_text(r["Description"]),
                  f"Potential {clean_text(r['Name']) or '-'}", True)

    # stratagems: EnchantEffect ally/opponent modifiers + effect sets
    gim = [r for r in c.table("Gimmick.atb") if r["GimmickID"]]
    enchant = first_by(c.table("EnchantEffect.atb"), "EnchantEffectID")
    sets = group_rows(c.table("EnchantEffectSet.atb"), "ID")
    for g in gim:
        e = enchant.get(g["EffectID"])
        if not e:
            continue
        desc = clean_text(g["Description"])
        ex = f"Gimmick#{g['GimmickID']} {clean_text(g['GimmickName'])}"
        mods = [(e[f"AllyModifierType{i}"], e[f"AllyEffectValue{i}"]) for i in (1, 2, 3)]
        mods += [(e.get(f"OpponentModifierType{i}", 0), e.get(f"OpponentEffectValue{i}", 0)) for i in (1, 2, 3)]
        mods = [m for m in mods if m[0]]
        for code, val in mods:
            t.add(smt_key(code), val, desc, ex, len(mods) == 1)
            t.add(f"smt:{code}", val, desc, ex, len(mods) == 1)
        for side in ("AllyEffectSetID", "OpponentEffectSetID"):
            for r in sets.get(e.get(side) or 0, []):
                t.add(f"enchanttype:{r['EnchantEffectType']}", r["EffectValue"], desc, ex, False)

    return t.dump()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent / "out"))
    args = ap.parse_args()
    data = mine(GameCache())
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "effect_mining.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = []
    for k, d in data.items():
        nouns = ", ".join(f"{n}×{c}" for n, c in d["nouns"])
        verbs = ", ".join(f"{n or '∅'}×{c}" for n, c in d["verbs"])
        lines.append(f"- **{k}** rows={d['rows']} matched={d['matched']} | {nouns} | {verbs}")
        for e in d["examples"][:2]:
            lines.append(f"    - {e}")
    (out / "effect_mining.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"{len(data)} keys -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
