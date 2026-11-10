"""Export stages (Quest.atb + their MapNNNNN.aar spawn lists), the enemies they use, and the
deliberations (審議, ArenaSingiSet) of Hell / Bushin stages.

  public/data/stages.json          stage list
  public/data/stage/<QuestID>.json one stage: rates, spawns, deliberations
  public/data/enemies.json         every enemy a stage spawns

Links (each checked against the data, see README):
  Quest.MapNo -> Map%05d.aar; EntryNo -> Entry%02d.atb inside it. Entry Type 2 rows spawn
  Enemy.EnemyID = ID (90k of 90k spawn rows resolve).
  Quest.SingiID -> ArenaSingiSet (a header row with the set ID, then one row per deliberation:
  Singi = points, SingiGroup = 同時設定不可 group) -> ArenaSingiSetDetail.
  Deliberations with ID < 20000 are MapEffect.atb rows with the same ID (their texts and the
  rows' targets/values agree); 2xxxx (castle girl base stats) and 3xxxx (tile limits) have none.
"""

from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

from oshirore.cache import GameCache
from oshirore.lazy import LazyArchive

TAB_GROUP = {11: "enma", 12: "hel", 13: "osiris", 23: "abyss", 5: "bushin"}


def grouped(rows, key):
    """Rows whose key column is 0 continue the row above (MapEffect / ArenaSingiSet layout)."""
    out = collections.OrderedDict()
    cur = None
    for r in rows:
        if r[key]:
            cur = r[key]
            out[cur] = []
        if cur is not None:
            out[cur].append(r)
    return out


def nz(r):
    return {k: v for k, v in r.items() if v not in (0, "", None, 0.0)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public"))
    args = ap.parse_args()
    out = Path(args.out) / "data"
    (out / "stage").mkdir(parents=True, exist_ok=True)
    c = GameCache()

    quests = c.table("Quest.atb")
    qtext = {r["QuestID"]: r for r in c.table("QuestText.atb")}
    map_effect = grouped(c.table("MapEffect.atb"), "MapEffectID")
    sets = grouped(c.table("ArenaTable.aar", "ArenaSingiSet.atb"), "ID")
    details = {r["ID"]: r for r in c.table("ArenaTable.aar", "ArenaSingiSetDetail.atb")}
    bushin = {}
    for b in c.table("BushinQuestList.atb"):
        for q in str(b["QuestIDs"]).split(","):
            if q.strip():
                bushin[int(q)] = {"name": b["BushinName"], "gold": b["AchieveRankA"], "silver": b["AchieveRankB"]}

    enemy_rows = {r["EnemyID"]: r for r in c.table("EnemyTable.aar", "Enemy.atb")}
    enemy_text = {r["EnemyID"]: r for r in c.table("EnemyTable.aar", "EnemyText.atb")}
    enemy_types = {r["EnemyTypeID"]: r["EnemyTypeName"] for r in c.table("EnemyTable.aar", "EnemyType.atb") if r["EnemyTypeID"]}
    enemy_ability = grouped(c.table("EnemyTable.aar", "EnemyAbility.atb"), "AbilityID")
    transforms = collections.defaultdict(list)
    for t in c.table("EnemyTable.aar", "EnemyTransform.atb"):
        if t["EnemyID"]:
            transforms[t["EnemyID"]].append(nz(t))
    missiles = {r["MissileID"]: r for r in c.table("Missile.atb") if r["MissileID"]}

    used_enemies: set[int] = set()
    stage_list = []
    for q in quests:
        qid, map_no = q["QuestID"], q["MapNo"]
        if not qid or not map_no:
            continue
        name = qtext.get(qid, {}).get("QuestName") or f"Quest {qid}"
        try:
            arc = LazyArchive(c.read("Map%05d.aar" % map_no))
        except FileNotFoundError:
            continue
        entry_name = "Entry%02d.atb" % (q["EntryNo"] or 1)
        if entry_name not in arc.offsets:
            continue
        # spawn script: Type 2 = spawn EnemyID on a route; Type 0 = wait (frames, 30 per second)
        spawns, t, counts = [], 0, collections.Counter()
        for e in arc.table(entry_name):
            t += e["Wait"]
            if e["Type"] == 2 and e["ID"] in enemy_rows:
                used_enemies.add(e["ID"])
                counts[e["ID"]] += 1
                s = {"t": t, "e": e["ID"], "r": e["RouteNo"]}
                if e["Level"]:
                    s["lv"] = e["Level"]
                if e["GrowUpGrade"]:
                    s["g"] = e["GrowUpGrade"]
                if e["Secret"]:
                    s["hid"] = 1
                spawns.append(s)
        group = TAB_GROUP.get(q["TabType"]) or ("bushin" if qid in bushin else "other")

        def rates(prefix):
            a, h, d = q[f"{prefix}AttackRate"], q[f"{prefix}HealthRate"], q[f"{prefix}DefenseRate"]
            return [a, h, d] if (a or h or d) else None

        singi = None
        if q["SingiID"] and q["SingiID"] in sets:
            opts = []
            for r in sets[q["SingiID"]]:
                d = details.get(r["SingiSetDetailID"], {})
                did = d.get("ID", r["SingiSetDetailID"])
                o = {"id": did, "name": d.get("Name", ""), "text": d.get("Explanation", ""),
                     "pts": r["Singi"], "grp": r["SingiGroup"]}
                if did < 20000 and did in map_effect:
                    o["rows"] = [nz(x) for x in map_effect[did]]
                opts.append(o)
            singi = {"set": q["SingiID"], "options": opts}
            if qid in bushin:
                singi["gold"], singi["silver"] = bushin[qid]["gold"], bushin[qid]["silver"]

        detail = {
            "id": qid, "name": name, "group": group, "tab": q["TabType"], "tabNo": q["TabNumber"],
            "type": q["Type"], "map": map_no,
            "description": qtext.get(qid, {}).get("QuestDescription") or "",
            "battlefield": qtext.get(qid, {}).get("BattleFieldDescription") or "",
            "terrain": qtext.get(qid, {}).get("TerrainDescription") or "",
            "rates": {"normal": rates("Normal"), "hard": rates("Hard")},
            "veryHard": bool(q["VeryHardEnabled"]),
            "ki": q["InitialKi"], "coreLife": q["CoreLife"],
            "mapEffect": [nz(x) for x in map_effect.get(q["MapEffect"], [])] if q["MapEffect"] else [],
            "spawns": spawns,
            "counts": dict(counts),
            "singi": singi,
            **({"bushin": bushin[qid]["name"]} if qid in bushin else {}),
        }
        (out / "stage" / f"{qid}.json").write_text(json.dumps(detail, ensure_ascii=False), encoding="utf-8")
        stage_list.append({
            "id": qid, "name": name, "group": group, "tab": q["TabType"], "tabNo": q["TabNumber"],
            "index": q["Index"], "enemies": len(counts), "spawns": len(spawns), "singi": bool(singi),
            "veryHard": bool(q["VeryHardEnabled"]),
            **({"bushin": bushin[qid]["name"]} if qid in bushin else {}),
        })

    def missile_info(mid):
        m = missiles.get(mid)
        if not m:
            return None
        keep = ("CrowdControlType", "DurationInMillis1", "DurationInMillis2", "StatusModifierType1",
                "StatusEffectValue1", "StatusModifierType2", "StatusEffectValue2", "DealDamageEffectID",
                "DealDamageEffectValue", "DealDamageEffectDurationInMillis", "DamageRepeatNum",
                "RepeatDamageDelayMillis")
        return {k: m[k] for k in keep if m.get(k)} | {"id": mid}

    enemies = {}
    for eid in sorted(used_enemies):
        e, t = enemy_rows[eid], enemy_text.get(eid, {})
        ab = enemy_ability.get(e["AbilityID"], []) if e["AbilityID"] else []
        enemies[eid] = {
            "name": t.get("EnemyName") or f"Enemy {eid}",
            "typeText": t.get("EnemyTypeText") or "",
            "types": [x for x in (e["EnemyTypeID"], e["EnemyTypeID2"]) if x],
            "flying": bool(e["Flying"]), "magic": bool(e["MagicAttack"]), "boss": bool(e["BossFlag"]),
            "hp": e["MaxHealth"] or e["Health"], "atk": e["AttackPower"], "def": e["DefenseArmor"],
            "mdef": e["DefenseMagicResistance"], "range": e["AttackRange"], "wait": e["AttackWait"],
            "move": e["MoveSpeed"], "block": e["BlockRequiredNum"], "targets": e["MaxTarget"],
            "core": e["CoreLifeDamage"], "weak": e["WeakAttribute"], "hpStock": e["HealthStock"],
            "ability": {"id": e["AbilityID"], "name": t.get("EnemyAbilityName") or "",
                        "text": t.get("EnemyAbilityExplanation") or "", "rows": [nz(x) for x in ab]} if ab else None,
            "missiles": [m for m in (missile_info(e[k]) for k in ("MissileID", "MissileID2", "SpreadMissileID",
                                                                     "SpreadMissileID2")) if m],
            "deadMissiles": [m for m in (missile_info(e[k]) for k in ("DeadMissileID", "DeadSpreadMissileID")) if m],
            "transforms": transforms.get(eid, []),
        }

    (out / "stages.json").write_text(json.dumps(stage_list, ensure_ascii=False), encoding="utf-8")
    # target codes that test enemies (data/target_codes.json, read out of the exe): EnemyTypeID/EnemyTypeID2
    # groups (every group must match) and the flying flag; 4 / 6 (敵) are every enemy
    codes = json.loads((Path(__file__).resolve().parent / "data" / "target_codes.json").read_text(encoding="utf-8"))["codes"]
    targets = {"4": {"all": True}, "6": {"all": True}}
    for code, d in codes.items():
        if d.get("kind") == "enemytype":
            targets[code] = {"groups": d["value"], **({"flying": d["flying"]} if "flying" in d else {})}
    (out / "enemies.json").write_text(json.dumps({"types": enemy_types, "targets": targets, "enemies": enemies},
                                                 ensure_ascii=False), encoding="utf-8")
    groups = collections.Counter(s["group"] for s in stage_list)
    print(f"{len(stage_list)} stages {dict(groups)}, {len(enemies)} enemies")


if __name__ == "__main__":
    main()
