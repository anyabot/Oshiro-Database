"""Export castle girls (cards) to the site's JSON + face icons.

    python export_units.py [--out ../public] [--no-icons]

Writes
    <out>/data/units.json        slim list for the unit index
    <out>/data/unit/<id>.json    one full card, loaded by the detail page
    <out>/data/meta.json         label tables + data version
    <out>/unit-icon/<face>.webp  120x120 face icons

Reads the game files from the desktop client's cache (see oshirore.cache).
"""

from __future__ import annotations

import argparse
import collections
import io
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from oshirore.abilities import AbilityResolver, clean_text, compact
from oshirore.cache import GameCache

UNIT_ARC = "PlayerUnitTable.aar"
FACE_ARCS = [f"PlayerUnitFace{i}.aar" for i in range(10)]

# MenuText.atb ids of the game's own labels
MENU_REGION_BASE = 1703      # AreaType n -> MenuText[1703 + n] (1 = 北海道 ... 14 = 異界)
MENU_RARITY_BASE = 1999      # Rarity n   -> MenuText[1999 + n] (★1 ... ★9)
MENU_RENOVATION = {0: 2009, 1: 2010, 2: 2011}  # 未改築 / 改壱 / 改弐

# Card fields per renovation tier: (slot, base field, tier field template)
TIER_SLOTS = [
    ("ability", "AbilityID", "Renovation{n}AbilityID"),
    ("organized", "OrganizedAbilityID", "Renovation{n}OrganizedAbilityID"),
    ("possessed", "PossessedAbilityID", "Renovation{n}PossessedAbilityID"),
    ("always", "AlwaysAbilityID", "Renovation{n}AlwaysAbilityID"),
    ("quest", "QuestAbilityID", "Renovation{n}QuestAbilityID"),
    ("defeated", "DefeatedAbilityID", "Renovation{n}DefeatedAbilityID"),
]

_BRACKET = re.compile(r"^\[([^\]]+)\]")


def terrain_table(c: GameCache) -> dict:
    """Card.GrowUpID (巨大化種別) is the castle's terrain type: the exe's castle-type target
    matcher FUN_00ab4360 reads it (unit +0x1e0). InstallationCastleTypeLimit.atb names the types
    (1 平城, 2 山城, 3 平山城, 4 水城, 5 平/水城 ...) and its "Xを含む城" sets list, per terrain X,
    every type that includes it (a head row, then ID-0 rows with the other members)."""
    rows = c.table("InstallationTable.aar", "InstallationCastleTypeLimit.atb")
    types: dict[int, str] = {}
    parts: dict[str, list[int]] = {}
    cur = None
    for r in rows:
        rid, ct, name = r.get("ID", 0), r.get("CastleType", 0), r.get("Name", "")
        if rid:
            cur = None
            m = re.fullmatch(r"(.+?)を含む城?", name)
            if m and "と" not in m[1]:
                cur = parts.setdefault(m[1], [])
                cur.append(ct)
            elif ct and "、" not in name and ct not in types:
                types[ct] = name
        elif cur is not None and ct:
            cur.append(ct)
    return {"types": types, "parts": {k: sorted(set(v)) for k, v in parts.items()}}


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def face_icons(c: GameCache) -> dict[int, object]:
    """CardID -> ALTX face object, from every PlayerUnitFace<n>.aar in the cache."""
    out = {}
    for arc in FACE_ARCS:
        if not c.has(arc):
            continue
        for name, obj in c.members(arc).items():
            m = re.match(r"(\d+)_face\.atx$", name)
            if m and obj is not None:
                out[int(m.group(1))] = obj
    return out


def save_icon(obj, path: Path) -> bool:
    img = obj.data.get("image") if obj is not None else None
    if img is None or "rgba" not in img.data:
        return False
    im = Image.frombytes("RGBA", (img.data["width"], img.data["height"]), img.data["rgba"])
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=90, method=6)
    data = buf.getvalue()
    if path.is_file() and path.read_bytes() == data:
        return True
    path.write_bytes(data)
    return True


def trait_labels(cards: list[dict], names: dict[int, str]) -> dict[int, dict]:
    """Tokusei has no name table: label a value with the [prefix] most of its
    carriers' names share (e.g. 2 -> 夏), marked as derived."""
    carriers: dict[int, list[str]] = collections.defaultdict(list)
    for r in cards:
        if r["CardType"] != 0:
            continue
        for k in ("Tokusei1", "Tokusei2", "Tokusei3"):
            if r[k]:
                carriers[r[k]].append(names.get(r["CardID"], ""))
    out = {}
    for t, ns in sorted(carriers.items()):
        pre = collections.Counter(m.group(1) for n in ns if (m := _BRACKET.match(n)))
        label = None
        if pre:
            top, cnt = pre.most_common(1)[0]
            if cnt >= 0.8 * len(ns):
                label = top
        out[t] = {"label": label, "count": len(ns), "examples": ns[:5]}
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public"))
    ap.add_argument("--no-icons", action="store_true")
    args = ap.parse_args()
    out = Path(args.out)
    t0 = time.time()

    c = GameCache()
    cards = c.table(UNIT_ARC, "Card.atb")
    names = {r["CardID"]: r for r in c.table(UNIT_ARC, "CardName.atb")}
    classes = {r["ClassID"]: r for r in c.table(UNIT_ARC, "Class.atb")}
    categories = {r["ID"]: r["CardCategoryName"] for r in c.table(UNIT_ARC, "CardCategoryName.atb")}
    voice = {r["CardID"]: r["VoiceActor"] for r in c.table(UNIT_ARC, "VoiceActor.atb")}
    flavor = {r["CardID"]: r for r in c.table(UNIT_ARC, "Flavor.atb")}
    intro = {r["CardID"]: r["Text"] for r in c.table(UNIT_ARC, "Introduction.atb")}
    welcome = {r["CardID"]: r["Text"] for r in c.table(UNIT_ARC, "Welcome.atb")}
    menu = {r["ID"]: r["Text"] for r in c.table("Text.aar", "MenuText.atb")}
    wtypes = {r["WeaponTypeID"]: r for r in c.table("WeaponTable.aar", "WeaponType.atb")}
    weapons = {r["WeaponID"]: r for r in c.table("WeaponTable.aar", "Weapon.atb")}
    wnames = {r["WeaponID"]: r["WeaponName"] for r in c.table("WeaponTable.aar", "WeaponName.atb")}
    wtext = {r["WeaponID"]: r["WeaponExplanation"] for r in c.table("WeaponTable.aar", "WeaponText.atb")}
    res = AbilityResolver(c)
    reactive = {x["ID"]: x for x in c.table("PlayerUnitEtcTable.aar", "OneTimeEffectReactive.atb")}
    card_name = {cid: r["CardName"] for cid, r in names.items()}
    print(f"tables loaded: {len(cards)} cards, {len(classes)} classes ({time.time() - t0:.1f}s)")

    faces = face_icons(c)
    print(f"face icons in cache: {len(faces)} ({time.time() - t0:.1f}s)")

    def weapon_type_of(cls: dict | None) -> int:
        if not cls:
            return 0
        return cls["WeaponType"] or weapons.get(cls["DefaultWeaponID"], {}).get("WeaponType", 0)

    def face_of(r: dict) -> int | None:
        for fid in (r["FaceIcon"], r["CardID"], r["DependenceCardId"]):
            if fid and fid in faces:
                return fid
        return None

    skin_groups: dict[int, list[int]] = collections.defaultdict(list)
    for r in cards:
        if r["SkinGroupID"]:
            skin_groups[r["SkinGroupID"]].append(r["CardID"])

    def class_block(class_id: int) -> dict | None:
        k = classes.get(class_id)
        if not k:
            return None
        w = weapon_type_of(k)
        return {
            "class_id": class_id,
            "weapon": {"type": w or None, "name": wtypes.get(w, {}).get("WeaponTypeName")},
            "class_ability": res.ability("ability", k["ClassAbilityID"]),
            "class": compact(k),
        }

    # Transform stratagems turn the card into its CardType-15 twin (they point at each other
    # through DependenceCardId); the twin's own stratagem returns it to the base state.
    card_by_id = {r["CardID"]: r for r in cards}
    gimmick_fields = ("GimmickID", "Renovation1GimmickID", "Renovation2GimmickID")
    transform_of: dict[int, int] = {}
    for r in cards:
        dep = card_by_id.get(r["DependenceCardId"])
        if r["CardType"] == 15 or not dep or dep["CardType"] != 15 or dep["DependenceCardId"] != r["CardID"]:
            continue
        special_transforms = bool(res.special.get(r["SpecialAbilityID"], {}).get("Transform"))
        if special_transforms or any(s.get("transform") for f in gimmick_fields for s in res.stratagems(r[f])):
            transform_of[dep["CardID"]] = r["CardID"]

    def transformed(base: dict) -> dict:
        """The transformed card's weapons and abilities, for the base card's page."""
        t = card_by_id[base["DependenceCardId"]]
        out = {"id": t["CardID"], "name": card_name.get(t["CardID"], ""), "main_class": class_block(t["ClassID"])}
        if t["SubClassID"]:
            out["sub_class"] = class_block(t["SubClassID"])
        if t["AbilityID"] and t["AbilityID"] != base["AbilityID"]:
            out["ability"] = res.ability("ability", t["AbilityID"])
        if t["GeneralAbilityID1"] and t["GeneralAbilityID1"] != base["GeneralAbilityID1"]:
            out["general_ability"] = res.ability("ability", t["GeneralAbilityID1"])
        if t["SpecialAbilityID"] and t["SpecialAbilityID"] != base["SpecialAbilityID"]:
            out["special_ability"] = res.special_ability(t["SpecialAbilityID"])
        return out

    traits = trait_labels(cards, card_name)
    used_faces: set[int] = set()
    used_wtypes: set[int] = set()
    index = []
    unit_dir = out / "data" / "unit"
    unit_dir.mkdir(parents=True, exist_ok=True)
    stale = {p.stem for p in unit_dir.glob("*.json")}

    for r in cards:
        cid = r["CardID"]
        nm = names.get(cid, {})
        name = nm.get("CardName", "")
        cls = classes.get(r["ClassID"])
        wt = weapon_type_of(cls)
        used_wtypes.add(wt)
        face = face_of(r)
        if face:
            used_faces.add(face)
        dep = r["DependenceCardId"]
        t_of = transform_of.get(cid)
        # other twin entries (CardType 15) point at the base card of the same name
        dup_of = dep if not t_of and r["CardType"] == 15 and dep and card_name.get(dep) == name else None
        npc = r["CardType"] != 0
        trait_ids = [r[k] for k in ("Tokusei1", "Tokusei2", "Tokusei3") if r[k]]

        index.append({
            "id": cid,
            "name": name,
            "ruby": nm.get("CardRuby") or None,
            "rarity": r["Rarity"],
            "weapon": wt or None,
            "region": r["AreaType"] or None,
            "category": r["CardCategory"],
            "traits": trait_ids or None,
            "cost": cls["Cost"] if cls else None,
            "face": face,
            "npc": npc or None,
            "dup_of": dup_of,
            "transform_of": t_of,
            "card_type": r["CardType"],
            "terrain": r["GrowUpID"] or None,
            "renovation": r["MaxRenovationCount"],
        })

        forms = []
        for n in range(0, 3):
            if n and n > r["MaxRenovationCount"]:
                break
            form: dict = {"tier": n, "label": menu.get(MENU_RENOVATION[n], f"tier {n}")}
            for slot, base_f, tier_f in TIER_SLOTS:
                aid = r[base_f] if n == 0 else r[tier_f.format(n=n)]
                a = res.ability(slot, aid)
                if a:
                    form[slot] = a
            gid = r["GimmickID"] if n == 0 else r[f"Renovation{n}GimmickID"]
            strat = res.stratagems(gid)
            if strat:
                form["stratagems"] = strat
            said = r["SpecialAttackID"] if n == 0 else r[f"Renovation{n}SpecialAttackID"]
            sa = res.special_attack_of(said)
            if sa:
                form["special_attack"] = sa
            if n == 0 or len(form) > 2:
                forms.append(form)

        special = res.special_ability(r["SpecialAbilityID"])
        if special and special.get("raw", {}).get("SwitchSubClass"):
            sub = classes.get(r["SubClassID"])
            special["switch"] = [wtypes.get(weapon_type_of(k), {}).get("WeaponTypeName") for k in (cls, sub)]

        wtrow = wtypes.get(wt, {})
        dw = r["DedicatedWeaponID"]
        fl = flavor.get(cid)
        detail = {
            "id": cid,
            "name": name,
            "ruby": nm.get("CardRuby") or None,
            "rarity": r["Rarity"],
            "card_type": r["CardType"],
            "npc": npc,
            "dup_of": dup_of,
            "depends_on": dep or None,
            "category": r["CardCategory"],
            "region": r["AreaType"] or None,
            "terrain": r["GrowUpID"] or None,
            "traits": trait_ids,
            "face": face,
            "skins": [x for x in skin_groups.get(r["SkinGroupID"], []) if x != cid],
            "weapon": {
                "type": wt or None,
                "name": wtrow.get("WeaponTypeName"),
                "description": clean_text(wtrow.get("Description")),
                "battle_description": clean_text(wtrow.get("BattleDescription")),
            },
            "class": compact(cls) if cls else None,
            "corrections": {
                "hp": r["HealthCorrection"],
                "atk": r["AttackCorrection"],
                "def": r["DefenseCorrection"],
                "regen": r["RegenerationCorrection"],
            },
            "class_ability": res.ability("ability", cls["ClassAbilityID"]) if cls else None,
            "potential": res.potential_of(cls["PotentialAbilityID"]) if cls else [],
            "sub_class": class_block(r["SubClassID"]) if r["SubClassID"] else None,
            "forms": forms,
            "special_ability": special,
            # more ability slots on the card row (all ids found in Ability.atb / MovingAttack.atb)
            "general_ability": res.ability("ability", r["GeneralAbilityID1"]),
            "before_attack": res.ability("ability", r["BeforeAttackAbilityID"]),
            "moving_attack": res.moving_attack(r["MovingAttackID"]),
            "one_time_reactive": compact(reactive[r["OneTimeEffectReactiveType"]], ("ID",))
            if r["OneTimeEffectReactiveType"] in reactive else None,
            "transform_of": t_of,
            "transform_into": transformed(r) if dep and transform_of.get(dep) == cid else None,
            "dedicated_weapon": {
                "id": dw,
                "name": wnames.get(dw, ""),
                "description": clean_text(wtext.get(dw)),
            } if dw else None,
            "max_renovation": r["MaxRenovationCount"],
            "voice_actor": (voice.get(cid) or "").removeprefix("声：") or None,
            "flavor": [clean_text(fl[k]) for k in ("Text1", "Text2", "Text3") if fl and fl[k]],
            "introduction": clean_text(intro.get(cid)) or None,
            "welcome": clean_text(welcome.get(cid)) or None,
            "raw": compact(r),
        }
        write_json(unit_dir / f"{cid}.json", detail)
        stale.discard(str(cid))

    for s in stale:
        (unit_dir / f"{s}.json").unlink()
    write_json(out / "data" / "units.json", index)

    meta = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "source_md5": c.md5(UNIT_ARC),
        "weapons": {wt: wtypes[wt]["WeaponTypeName"] for wt in sorted(used_wtypes) if wt in wtypes and wt},
        "regions": {n: menu.get(MENU_REGION_BASE + n) for n in range(1, 15) if menu.get(MENU_REGION_BASE + n)},
        "rarities": {n: menu.get(MENU_RARITY_BASE + n) for n in range(1, 10)},
        "categories": {k: v for k, v in categories.items() if k >= 0},
        # Tokusei names: MenuText 4300 + value (the unit filter's trait list)
        "traits": {t: {**info, "label": menu.get(4300 + t) or info["label"], "source": "MenuText"}
                   for t, info in traits.items()},
    }
    meta["terrain"] = terrain_table(c)
    write_json(out / "data" / "meta.json", meta)
    print(f"wrote {len(index)} units ({time.time() - t0:.1f}s)")

    if not args.no_icons:
        icon_dir = out / "unit-icon"
        icon_dir.mkdir(parents=True, exist_ok=True)
        ok = 0
        for fid in sorted(used_faces):
            ok += save_icon(faces[fid], icon_dir / f"{fid}.webp")
        for p in icon_dir.glob("*.webp"):
            if int(p.stem) not in used_faces:
                p.unlink()
        print(f"icons: {ok}/{len(used_faces)} ({time.time() - t0:.1f}s)")

    playable = [u for u in index if not u["npc"]]
    print(f"playable {len(playable)}, without face {sum(1 for u in playable if not u['face'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
