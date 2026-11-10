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

TAB_GROUP = {11: "enma", 12: "hel", 13: "osiris", 23: "hades", 5: "bushin", 1: "story"}
# Event.atb Type -> site group (types with one event are named by it: 6 閻魔の闘技場, 7 ヘルの遊戯場,
# 8 オシリスの審判場, 15 ハデスの死闘場 = the 深淵 stages, 4 = 武神降臨, 11 第2部「夢幻航海」, 13 天魔大乱, 9 戦術指南)
EVENT_GROUP = {6: "enma", 7: "hel", 8: "osiris", 15: "hades", 4: "bushin", 11: "voyage", 13: "tenma",
               18: "osaka", 14: "palace", 17: "palace", 1: "events", 2: "events", 3: "events", 10: "events",
               12: "events", 16: "events", 9: "other"}  # 14 絢爛御殿・平/平山/…, 17 四季御殿・春/…


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
    # 2xxxx deliberations (castle girl base stats): SingiSetDetailParameter = PreBattleEffect.atb set
    # (every 2xxxx row's text agrees with its set's rows)
    pre_battle = grouped(c.table("PreBattleEffect.atb"), "ID")
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

    # Event.atb: every event the game still lists (past ones too) with its quest-ID range
    events = []
    for i, e in enumerate(c.table("Event.atb")):
        if e["HeadBattleID"] and e["TailBattleID"]:
            events.append({"id": i, "title": e["Title"], "type": e["Type"], "start": e["StartDate"], "end": e["EndDate"],
                           "head": e["HeadBattleID"], "tail": e["TailBattleID"]})

    def event_of(qid):
        hit = [e for e in events if e["head"] <= qid <= e["tail"]]
        return min(hit, key=lambda e: e["tail"] - e["head"]) if hit else None

    def group_of(ev, tab, qid):
        if ev and ev["type"] in EVENT_GROUP:
            return EVENT_GROUP[ev["type"]]
        return TAB_GROUP.get(tab) or ("bushin" if qid in bushin else "other")

    used_enemies: set[int] = set()
    stage_list = []

    def route_forms(arc, spawns):
        """Route events: @RouteEventType 4 on a route point turns the enemy walking it into enemy
        @RouteEventParam1 (5434 of 5446 such events in all cached maps name an EnemyID)."""
        out = collections.defaultdict(set)
        cache = {}
        for sp in spawns:
            name = "Route%02d.atb" % sp["r"]
            if name not in arc.offsets:
                continue
            if name not in cache:
                cache[name] = [r["@RouteEventParam1"] for r in arc.table(name)
                               if r["@RouteEventType"] == 4 and r["@RouteEventParam1"] in enemy_rows]
            for to in cache[name]:
                if to != sp["e"]:
                    out[sp["e"]].add(to)
        return out

    def forms_of(counts, routes=None):
        """Forms of the spawned enemies: EnemyTransform chains and route events (trigger -4):
        {enemy: [[to, trigger, seconds-or-0], ...]}."""
        out, todo = {}, list(counts)
        while todo:
            eid = todo.pop()
            if eid in out:
                continue
            out[eid] = []
            for to in sorted((routes or {}).get(eid, ())):
                used_enemies.add(to)
                out[eid].append([to, -4, 0])
                todo.append(to)
            for t in transforms.get(eid, []):
                to = t.get("TransformedEnemyID")
                if not to or to not in enemy_rows or to == eid:
                    continue
                used_enemies.add(to)
                out[eid].append([to, t.get("Trigger", 0), round(t.get("TimeElapsedTransformFrame", 0) / 30, 1)])
                todo.append(to)
        return {k: v for k, v in out.items() if v}

    def spawn_list(arc, entry_name):
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
        return spawns, counts

    def singi_of(set_id, qid):
        if not set_id or set_id not in sets:
            return None
        opts = []
        for r in sets[set_id]:
            d = details.get(r["SingiSetDetailID"], {})
            did = d.get("ID", r["SingiSetDetailID"])
            o = {"id": did, "name": d.get("Name", ""), "text": d.get("Explanation", ""),
                 "pts": r["Singi"], "grp": r["SingiGroup"]}
            if did < 20000 and did in map_effect:
                o["rows"] = [nz(x) for x in map_effect[did]]
            elif 20000 <= did < 30000 and d.get("SingiSetDetailParameter") in pre_battle:
                o["pre"] = [nz(x) for x in pre_battle[d["SingiSetDetailParameter"]]]
            opts.append(o)
        singi = {"set": set_id, "options": opts}
        if qid in bushin:
            singi["gold"], singi["silver"] = bushin[qid]["gold"], bushin[qid]["silver"]
        return singi

    def write_stage(detail, index):
        (out / "stage" / f"{detail['id']}.json").write_text(json.dumps(detail, ensure_ascii=False), encoding="utf-8")
        stage_list.append({
            "id": detail["id"], "name": detail["name"], "group": detail["group"], "event": detail.get("event"),
            "tab": detail["tab"], "tabNo": detail["tabNo"], "index": index, "map": detail["map"],
            "enemies": len(detail["counts"]), "spawns": len(detail["spawns"]), "singi": bool(detail["singi"]),
            "veryHard": detail["veryHard"], "live": detail["live"],
            **({"recovered": True} if detail.get("recovered") else {}),
            **({"bushin": detail["bushin"]} if detail.get("bushin") else {}),
        })

    live_ids = set()
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
        spawns, counts = spawn_list(arc, entry_name)
        ev = event_of(qid)

        def rates(prefix):
            a, h, d = q[f"{prefix}AttackRate"], q[f"{prefix}HealthRate"], q[f"{prefix}DefenseRate"]
            return [a, h, d] if (a or h or d) else None

        live_ids.add(qid)
        write_stage({
            "id": qid, "name": name, "group": group_of(ev, q["TabType"], qid), "event": ev["id"] if ev else None,
            "tab": q["TabType"], "tabNo": q["TabNumber"], "type": q["Type"], "map": map_no, "live": True,
            "description": qtext.get(qid, {}).get("QuestDescription") or "",
            "battlefield": qtext.get(qid, {}).get("BattleFieldDescription") or "",
            "terrain": qtext.get(qid, {}).get("TerrainDescription") or "",
            "rates": {"normal": rates("Normal"), "hard": rates("Hard")},
            "veryHard": bool(q["VeryHardEnabled"]),
            "ki": q["InitialKi"], "coreLife": q["CoreLife"],
            "mapEffect": [nz(x) for x in map_effect.get(q["MapEffect"], [])] if q["MapEffect"] else [],
            "spawns": spawns, "counts": dict(counts), "forms": forms_of(counts, route_forms(arc, spawns)),
            "singi": singi_of(q["SingiID"], qid),
            **({"bushin": bushin[qid]["name"]} if qid in bushin else {}),
        }, q["Index"])

    # Stages of past events: their Quest.atb rows are gone, but Event.atb still lists the quest range
    # and the client cache still holds the maps. Quest ID -> map = (id // 1000) * 100 + id % 100 for
    # every live quest of every event type except the three Hell arenas (which keep their own maps),
    # so it is used for those event types only. Live Bushin quests use deliberation set = quest ID.
    # rebuilt Bushin have no multipliers: offer the ones the live Bushin of the same rank use (the
    # most common [ATK, HP, DEF] among them), shown on the page as an estimate
    def rank_of(qid):
        same = sorted(i for i in bushin if bushin[i]["name"] == bushin[qid]["name"])
        return 0 if same.index(qid) == 0 else 1

    live_bushin = collections.defaultdict(list)
    for q in quests:
        if q["QuestID"] in bushin:
            live_bushin[rank_of(q["QuestID"])].append(q)

    def bushin_estimate(qid):
        qs = live_bushin.get(rank_of(qid), [])
        if not qs:
            return None
        def common(prefix):
            vals = collections.Counter((q[f"{prefix}AttackRate"], q[f"{prefix}HealthRate"], q[f"{prefix}DefenseRate"]) for q in qs)
            v, n = vals.most_common(1)[0]
            return {"rates": list(v), "of": len(qs), "n": n, "values": [list(x) for x in vals]} if any(v) else None
        return {"normal": common("Normal"), "hard": common("Hard"), "from": sorted(q["QuestID"] for q in qs)}

    recovered = 0
    used_maps = {x["map"] for x in stage_list}
    for ev in events:
        if ev["type"] in (6, 7, 8):
            continue
        ids = [i for i in range(ev["head"], ev["tail"] + 1) if i not in live_ids]
        if ev["type"] == 4:
            ids = [i for i in ids if i in bushin]
        k = 0
        for qid in ids:
            # the rule was checked on live quest IDs, which all have 0 as their hundreds digit
            if (qid // 100) % 10:
                continue
            map_no = (qid // 1000) * 100 + qid % 100
            if map_no in used_maps or not c.has("Map%05d.aar" % map_no) or event_of(qid) is not ev:
                continue
            used_maps.add(map_no)
            arc = LazyArchive(c.read("Map%05d.aar" % map_no))
            if "Entry01.atb" not in arc.offsets:
                continue
            spawns, counts = spawn_list(arc, "Entry01.atb")
            if not spawns:
                continue
            k += 1
            if qid in bushin:
                same = sorted(i for i in bushin if bushin[i]["name"] == bushin[qid]["name"])
                label = f"{same.index(qid) + 1}/{len(same)}"
            else:
                label = f"#{k}"
            live_ids.add(qid)
            recovered += 1
            write_stage({
                "id": qid, "name": f"{ev['title']} {label}", "group": group_of(ev, 0, qid), "event": ev["id"],
                "tab": 0, "tabNo": 0, "type": 0, "map": map_no, "live": False, "recovered": True,
                "description": "", "battlefield": "", "terrain": "",
                "rates": {"normal": None, "hard": None}, "veryHard": False, "ki": 0, "coreLife": 0,
                "mapEffect": [], "spawns": spawns, "counts": dict(counts), "forms": forms_of(counts, route_forms(arc, spawns)),
                "singi": singi_of(qid, qid) if qid in bushin else None,
                **({"estimate": bushin_estimate(qid)} if qid in bushin else {}),
                **({"bushin": bushin[qid]["name"]} if qid in bushin else {}),
            }, k)

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
            # battle sprite: Enemy%03d.atx of EnemyStory1.aar (export_enemy_images.py); DotID 0 = own ID
            "dot": e["DotID"] or eid,
            "typeText": t.get("EnemyTypeText") or "",
            "types": [x for x in (e["EnemyTypeID"], e["EnemyTypeID2"]) if x],
            "flying": bool(e["Flying"]), "magic": bool(e["MagicAttack"]), "boss": bool(e["BossFlag"]),
            "hp": e["Health"] or e["MaxHealth"], "atk": e["AttackPower"], "def": e["DefenseArmor"],
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

    # never drop a stage: one exported before and missing now (removed from the game) keeps its
    # entry and its stage file, marked not live; its enemies stay in enemies.json too
    prev_path = out / "stages.json"
    kept = 0
    if prev_path.is_file():
        seen = {x["id"] for x in stage_list}
        for old in json.loads(prev_path.read_text(encoding="utf-8")):
            if old["id"] not in seen and (out / "stage" / f"{old['id']}.json").is_file():
                old["live"] = False
                stage_list.append(old)
                kept += 1
    prev_enemies = out / "enemies.json"
    if prev_enemies.is_file():
        for k, v in json.loads(prev_enemies.read_text(encoding="utf-8")).get("enemies", {}).items():
            enemies.setdefault(int(k), v)
    (out / "stages.json").write_text(json.dumps(stage_list, ensure_ascii=False), encoding="utf-8")
    (out / "events.json").write_text(json.dumps(events, ensure_ascii=False), encoding="utf-8")
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
    print(f"{len(stage_list)} stages {dict(groups)} ({recovered} recovered from the cache, {kept} kept from earlier exports), {len(enemies)} enemies")


if __name__ == "__main__":
    main()
