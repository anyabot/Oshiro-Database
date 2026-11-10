"""Export effect-code definitions + mined labels for the site.

    python export_effects.py [--out ../public]

Writes <out>/data/effects.json:
    smt            ModifierID -> [StatusType, ExpressionType, ValueType, ReferenceStatusType, ReferenceSenderUnit]
                   (StatusModifierType.atb, the game's own definition of each modifier code)
    attack_bonus   AttackBonusStatusEffectID -> row (conditional damage bonus definitions)
    unit_effect    UnitEffectID -> [UnitEffectType, ActualEffectID]
    labels         "<vocabulary>:<code>" -> {jp, n, of, ex}
                   jp = the game's own wording for the code, mined from ability descriptions
                   (see mine_effects.py); n = clauses that used that word, of = clauses matched.
                   Only written when the evidence clears MIN_COUNT / MIN_SHARE.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

from mine_effects import CLAUSE, mine, value_forms
from oshirore.abilities import ABILITY_ARC, clean_text, compact, first_by, group_rows
from oshirore.cache import GameCache

MIN_COUNT = 3
MIN_SHARE = 0.5
TARGET_MIN = 5
TARGET_SHARE = 0.45

_ATOM_BAD = re.compile(r"^[ぁ-ん]|[と/･・0-9０-９]|秒|毎|度に|時に|につき|以上|以下")


def pick_label(nouns: list[list], matched: int) -> dict | None:
    """Most-used single word (not a compound 'AとB' or a phrase with numbers)."""
    total = sum(c for _, c in nouns)
    if not total or matched < MIN_COUNT:
        return None
    for word, cnt in nouns:
        if not word or _ATOM_BAD.search(word):
            continue
        # compounds like 攻撃と防御 also contain the word, so count them toward it; the game also
        # words one timer two ways on the same code (計略使用までの時間 / 計略再使用時間)
        same_timer = lambda w: word.endswith("時間") and w.endswith("時間") and w[:2] == word[:2]
        support = sum(c for w, c in nouns if word in w or same_timer(w))
        if support < MIN_COUNT or support / total < MIN_SHARE:
            return None
        # a longer word containing it (時間 -> 計略再使用時間) names the code more precisely
        longer = [(w, c) for w, c in nouns if w != word and word in w and not _ATOM_BAD.search(w) and c >= 0.3 * cnt]
        if longer:
            word = max(longer, key=lambda wc: wc[1])[0]
        return {"jp": word, "n": support, "of": total}
    return None


_UP = ("上昇", "増加", "延長")
_DOWN = ("低下", "短縮", "軽減", "減少", "削減")


def wording(d: dict) -> dict:
    """Direction and unit the descriptions use with a code ("上昇" -> up, "%"),
    when one reading clearly dominates (>= 70% of the clauses that have one)."""
    out = {}
    up = sum(c for v, c in d["verbs"] if v.startswith(_UP))
    down = sum(c for v, c in d["verbs"] if v.startswith(_DOWN))
    if up + down and max(up, down) >= 0.7 * (up + down):
        out["dir"] = "+" if up > down else "-"
    units = {u: c for u, c in d["units"]}
    total = sum(units.values())
    if total:
        u, c = max(units.items(), key=lambda kv: kv[1])
        if c >= 0.7 * total:
            out["unit"] = {"-": "", "％": "%"}.get(u, u)
    forms = dict(d.get("forms", []))
    ftotal = sum(forms.values())
    if ftotal:
        f, c = max(forms.items(), key=lambda kv: kv[1])
        if c >= 0.7 * ftotal:
            out["form"] = f
    return out


TRIGGER = re.compile(r"(敵を撃破する度に|敵撃破毎に|敵撃破時に|攻撃する度に|攻撃毎に|攻撃を受ける度に|被攻撃毎に|被攻撃時に|"
                     r"巨大化する度に|巨大化毎に|大破する度に|大破毎に|計略使用時に|\d+秒毎に)")
# same trigger, different wording
TRIGGER_SAME = {"敵撃破毎に": "敵を撃破する度に", "敵撃破時に": "敵を撃破する度に", "攻撃毎に": "攻撃する度に",
                "被攻撃毎に": "攻撃を受ける度に", "被攻撃時に": "攻撃を受ける度に", "巨大化毎に": "巨大化する度に",
                "大破毎に": "大破する度に"}


def mine_targets(c: GameCache) -> dict[str, collections.Counter]:
    """Phrase before the stat word, per AbilityTargetType (射程内の城娘の攻撃 -> 射程内の城娘)."""
    groups = group_rows(c.table(ABILITY_ARC, "Ability.atb"), "AbilityID")
    texts = first_by(c.table(ABILITY_ARC, "AbilityText.atb"), "AbilityID")
    out: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for aid, rows in groups.items():
        if aid not in texts:
            continue
        desc = clean_text(texts[aid]["Description"])
        for r in rows:
            if not r["StatusModifierType"] or not r["AbilityTargetType"]:
                continue
            forms = value_forms(r["EffectValue"])
            for m in CLAUSE.finditer(desc):
                if round(float(m.group("num")), 4) in forms:
                    noun = m.group("noun")
                    # descriptions wrap lines mid-sentence, so only punctuation ends a clause
                    clause_start = max(desc.rfind(ch, 0, m.start()) for ch in "｡。、､") + 1
                    lead = desc[clause_start:m.end("noun")].replace("\n", "")
                    trig = TRIGGER.search(lead)
                    phrase = TRIGGER_SAME.get(trig.group(1), trig.group(1)) if trig else ""
                    out[f"trigger:{r['AbilityType']}"][re.sub(r"\d+", "N", phrase)] += 1
                    if phrase == "巨大化する度に":
                        out["growup"][f"{1 if r['EachGrowUp'] else 0}:yes"] += 1
                    if "の" in noun:
                        pre = noun.rsplit("の", 1)[0]
                        pre = re.sub(r"^.*[｡。]", "", pre)
                        pre = re.sub(r"^(\d+秒(間|毎に)?|巨大化する度に|【[^】]+】)", "", pre)
                        if pre and not re.search(r"\d", pre):
                            m2 = re.match(r"^(射程内の|射程内|全ての|全)?(.+)$", pre)
                            area_word, subject = m2.group(1) or "", m2.group(2)
                            out[f"target:{r['AbilityTargetType']}"][subject] += 1
                            area_word = {"射程内の": "射程内", "射程内": "射程内", "全ての": "全て", "全": "全て"}.get(area_word, "")
                            if subject.startswith("自身"):
                                area_word = "自身"
                            if area_word:
                                out[f"area:{r['AbilityAreaType']}"][area_word] += 1
                    elif noun.startswith("自身"):
                        out[f"area:{r['AbilityAreaType']}"]["自身"] += 1
                    break
    return out


def exe_target_labels(c: GameCache) -> dict[str, dict]:
    """target:/otarget: labels from the exe's target-code registry + the game's name tables."""
    path = Path(__file__).resolve().parent / "data" / "target_codes.json"
    codes = json.loads(path.read_text(encoding="utf-8"))["codes"]
    menu = {r["ID"]: r["Text"] for r in c.table("Text.aar", "MenuText.atb")}
    weapons = {r["WeaponTypeID"]: r["WeaponTypeName"] for r in c.table("WeaponTable.aar", "WeaponType.atb")}
    name_of = {
        "region": lambda v: (f"{menu.get(1703 + v)}城娘", f"Card.AreaType == {v}; name MenuText {1703 + v}"),
        "trait": lambda v: (f"[{menu.get(4300 + v)}]城娘", f"Card.Tokusei1/2/3 == {v}; name MenuText {4300 + v}"),
        "weapon": lambda v: (f"{weapons.get(v)}城娘", f"weapon type == {v}; name WeaponType {v}"),
        "rarity": lambda v: (f"{menu.get(1999 + v)}城娘", f"Card.Rarity == {v}; name MenuText {1999 + v}"),
    }
    out = {}
    castle = json.loads((Path(__file__).resolve().parent / "data" / "castle_type_codes.json").read_text(encoding="utf-8"))
    for code, d in castle["codes"].items():
        lab = {"jp": d["name"], "n": 0, "of": 0, "src": "exe",
               "ex": [f"castle type in {d['castle_types']} (FUN_00ab4360({d['a']},{d['b']})); name InstallationCastleTypeLimit"
                      + (f"; {d['note']}" if d.get("note") else "")]}
        out[f"target:{code}"] = lab
        out[f"otarget:{code}"] = lab
    cats = {r["ID"]: r["CardCategoryName"] for r in c.table("PlayerUnitTable.aar", "CardCategoryName.atb")}
    etypes = {r["EnemyTypeID"]: r["EnemyTypeName"] for r in c.table("EnemyTable.aar", "EnemyType.atb")}
    name_of["category"] = lambda v: (f"[{cats.get(v)}]城娘", f"Card.CardCategory == {v} (unit +0x16c); name CardCategoryName {v}")

    def enemy(d):
        groups = d["value"]
        names = ["・".join(etypes.get(t, str(t)) for t in g) for g in groups]
        # a narrower group ANDed with a wider one: the narrower one names it
        jp = min(names, key=len) if names else "敵"
        fly = d.get("flying")
        if fly is True:
            jp = ("飛行" + jp) if names else "飛行敵"
        elif fly is False:
            jp = "飛行以外の敵"
        how = "enemy (FUN_0056e450) with " + " and ".join(
            f"EnemyTypeID/EnemyTypeID2 in {g}" for g in groups) + (
            "; flying flag (FUN_004155d0)" if fly is True else "; not flying" if fly is False else "") + "; names EnemyType.atb"
        return jp, how

    def token(d):
        if d.get("own"):
            return "自身のトークン", "token unit (kind 5, FUN_005788f0) whose summoner (+0x15b8, set by FUN_0057bcd0) is the ability's owner"
        if d["value"] is None:
            return "トークン", "token unit (kind 5, FUN_005788f0; created from TokenConfig by FUN_0057bcd0)"
        # TokenConfig.TokenUnitType, named from its member cards: 1 = all 390 ordinary 伏兵 tokens,
        # 4 = the 6 boats (筏, 小舟, 渡し舟, 砲撃舟, ボロ舟, 水蜘蛛), 2/3 = one test card each
        name = {1: "伏兵(種別1)", 2: "トークンB", 3: "トークンC", 4: "舟(種別4)"}.get(d["value"], f"トークン(種別{d['value']})")
        return name, f"token unit with TokenConfig.TokenUnitType (トークン種別) == {d['value']} (+0x15c4)"

    for code, d in codes.items():
        if d["kind"] == "named":
            jp, how = d["jp"], d["how"]
        elif d["kind"] == "enemytype":
            jp, how = enemy(d)
        elif d["kind"] == "token":
            jp, how = token(d)
        else:
            jp, how = name_of[d["kind"]](d["value"])
        if d.get("except_self"):
            jp, how = jp + "(自身を除く)", how + "; excluding the ability's owner"
        lab = {"jp": jp, "n": 0, "of": 0, "ex": [how], "src": "exe"}
        out[f"target:{code}"] = lab
        out[f"otarget:{code}"] = lab
    return out


def target_names(c: GameCache) -> list[str]:
    """Names a description can use for who an effect hits, all taken from game data."""
    menu = {r["ID"]: r["Text"] for r in c.table("Text.aar", "MenuText.atb")}
    regions = [menu[i] for i in range(1704, 1718) if i in menu]                  # 北海道 … 異界
    attributes = [menu[i] for i in range(3411, 3415) if i in menu] + ["地獄"]    # 平 平山 山 水 (+ 地獄)
    weapons = [r["WeaponTypeName"] for r in c.table("WeaponTable.aar", "WeaponType.atb") if 1 <= r["WeaponTypeID"] <= 24]
    cats = [r["CardCategoryName"] for r in c.table("PlayerUnitTable.aar", "CardCategoryName.atb") if r["ID"] > 0]
    groups = set()
    for r in c.table(ABILITY_ARC, "OrganizedAbilityText.atb") + c.table(ABILITY_ARC, "AbilityText.atb"):
        groups |= set(re.findall(r"\[[^\]]{1,12}\]", r["Description"] or ""))
    names = (["近接城娘", "遠隔城娘", "城娘", "敵", "味方", "伏兵", "殿", "蔵", "妖怪", "飛行敵"]
             + [f"{w}城娘" for w in weapons] + [f"{a}城" for a in attributes] + regions + cats + sorted(groups))
    return sorted(set(names), key=len, reverse=True)


def mine_target_constraints(c: GameCache) -> dict[str, tuple[set[str], int]]:
    """Target codes by elimination: in every clause stating a row's value, the code must be one of the
    names that clause uses, so intersect those name sets over all of the code's rows."""
    names = target_names(c)
    pattern = re.compile("|".join(re.escape(n) for n in names))
    out: dict[str, tuple[set[str], int]] = {}
    for eff, txt, field, prefix in (("OrganizedAbility.atb", "OrganizedAbilityText.atb", "TargetType", "otarget"),
                                    ("Ability.atb", "AbilityText.atb", "AbilityTargetType", "target")):
        groups = group_rows(c.table(ABILITY_ARC, eff), "AbilityID")
        texts = first_by(c.table(ABILITY_ARC, txt), "AbilityID")
        for aid, rows in groups.items():
            if aid not in texts:
                continue
            clauses = re.split(r"[\n｡。､、]", clean_text(texts[aid]["Description"]))
            for r in rows:
                code = r[field]
                if not code:
                    continue
                forms = [x for x in value_forms(r["EffectValue"]) if x]
                found: set[str] = set()
                for cl in clauses:
                    if any(re.search(rf"(?<![\d.]){x:g}(?!\d)", cl) for x in forms):
                        found |= set(pattern.findall(cl))
                if not found:
                    continue
                key = f"{prefix}:{code}"
                prev, n = out.get(key, (found, 0))
                out[key] = (prev & found, n + 1)
    return out


_NOT_TARGET = {"攻撃", "攻撃後", "耐久", "防御", "射程", "回復", "敵撃破時"}


def _split_outside(s: str, seps: str) -> list[str]:
    """Split on any char in seps that is not inside [..] or 「..」."""
    parts, cur, depth = [], "", 0
    for ch in s:
        if ch in "[「":
            depth += 1
        elif ch in "]」":
            depth = max(0, depth - 1)
        if ch in seps and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return parts


ORG_AREA = {"部隊の": "部隊", "全ての": "全て", "全": "全て", "射程内の": "射程内"}
_ORG_NUM = re.compile(r"(\d+(?:\.\d+)?)(%|％|倍|秒)?")


def mine_organized_targets(c: GameCache, labels: dict[str, dict]) -> dict[str, collections.Counter]:
    """Formation (編成特技) rows: who each row applies to, per TargetType / AreaType.

    Their descriptions may omit が ("部隊の城娘の攻撃200上昇") and one clause can name
    several targets ("兜娘と近接城娘の攻撃後の隙が20%短縮"); every named part counts once.
    """
    groups = group_rows(c.table(ABILITY_ARC, "OrganizedAbility.atb"), "AbilityID")
    texts = first_by(c.table(ABILITY_ARC, "OrganizedAbilityText.atb"), "AbilityID")
    out: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for aid, rows in groups.items():
        if aid not in texts:
            continue
        # formation text puts one clause per line, so a line break also ends a clause
        desc = clean_text(texts[aid]["Description"])
        for r in rows:
            stat = labels.get(f"effecttype:{r['EffectType']}", {}).get("jp")
            if not stat or not r["TargetType"]:
                continue
            forms = value_forms(r["EffectValue"])
            for m in _ORG_NUM.finditer(desc):
                if round(float(m.group(1)), 4) not in forms:
                    continue
                start = max(desc.rfind(ch, 0, m.start()) for ch in "｡。、､,\n") + 1
                lead = re.sub(r"[がを]$", "", desc[start:m.start()])
                if not lead.endswith(stat):
                    continue
                # the unit this exact clause prints the value with (10% vs 200)
                out[f"ounit:{r['EffectType']}"][{"％": "%"}.get(m.group(2) or "", m.group(2) or "")] += 1
                who = re.sub(r"(の攻撃後)?の$", "", lead[: -len(stat)])
                area = next((v for k, v in ORG_AREA.items() if who.startswith(k)), "")
                if area:
                    who = who[len(next(k for k in ORG_AREA if who.startswith(k))):]
                    out[f"oarea:{r['AreaType']}"][area] += 1
                # "近接城娘の攻撃と防御" -> the target is the part before the first の;
                # の / と inside [..] or 「..」 belong to a name ([進撃の巨人], [大宰府と古代山城])
                who = _split_outside(who, "の")[0]
                for part in _split_outside(who, "と・･"):
                    part = re.sub(r"(は|はさらに|は更に)$", "", part)
                    if part and part not in _NOT_TARGET and not re.search(r"\d|%|上昇|低下", part):
                        out[f"otarget:{r['TargetType']}"][part] += 1
                break
    return out


_STRAT_AREA = [("対象の射程内の", "対象の射程内"), ("対象の射程内", "対象の射程内"), ("射程内の", "射程内"),
               ("範囲内の", "範囲内"), ("全ての", "全て"), ("対象の", "対象")]


_SET_DETAIL = r"(敵\d+体につき|攻撃する度に|大破数に応じて|撃破する度に|被攻撃時に|攻撃を受ける度に|\d+秒毎に|巨大化する度に)"


def mine_stratagem_targets(c: GameCache) -> dict[str, collections.Counter]:
    """Stratagem (計略) wording per code: who each EnchantEffect / EnchantEffectSet row hits.

    etarget:<TargetType>      how the stratagem picks its target (counts the 自分のみ marker)
    starget / sarea:<code>    set rows' EffectTargetType / EffectAreaType (phrase before the stat word)
    oparea:<code>             OpponentAreaType (phrase before the enemy-side stat word)
    """
    gim = [r for r in c.table("Gimmick.atb") if r["GimmickID"]]
    ench = first_by(c.table("EnchantEffect.atb"), "EnchantEffectID")
    sets = group_rows(c.table("EnchantEffectSet.atb"), "ID")
    out: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)

    def lead(desc: str, v: float) -> str | None:
        forms = value_forms(v)
        for m in CLAUSE.finditer(desc):
            if round(float(m.group("num")), 4) in forms:
                noun = re.sub(r"^.*[｡。、､]", "", m.group("noun"))
                noun = re.sub(r"^\d+秒間", "", noun)
                return noun.rsplit("の", 1)[0] if "の" in noun else ""
        return None

    def split_area(phrase: str) -> tuple[str, str]:
        for prefix, area in _STRAT_AREA:
            if phrase.startswith(prefix):
                return area, phrase[len(prefix):]
        return "", phrase

    for g in gim:
        e = ench.get(g["EffectID"])
        if not e:
            continue
        desc = clean_text(g["Description"]).replace("\n", "")
        out[f"etarget:{e['TargetType']}"]["自分のみ" if re.search(r"自分のみ|自身のみ", desc) else ""] += 1
        if e.get("OpponentModifierType1"):
            # the enemies a stratagem debuffs: 射程内の敵 and 対象の射程内の敵 both say "in range"
            found = re.findall(r"(?:対象の)?射程内の敵|範囲内の敵|全ての敵|全敵", desc)
            for w in set("射程内" if "射程内" in x else x for x in found) or {""}:
                out[f"oparea:{e['OpponentAreaType']}"][w] += 1
        for r in sets.get(e.get("AllyEffectSetID") or 0, []):
            if r["EffectDetailType"]:
                found = {re.sub(r"\d+", "N", x) for x in re.findall(_SET_DETAIL, desc)}
                for w in found or {""}:
                    out[f"setdetail:{r['EffectDetailType']}"][w] += 1
            w = lead(desc, r["EffectValue"])
            if w is None:
                continue
            area, subject = split_area(w) if w else ("対象", "")
            if area:
                out[f"sarea:{r['EffectAreaType']}"][area] += 1
            if subject and not re.search(r"\d|%", subject):
                out[f"starget:{r['EffectTargetType']}"][subject] += 1
    return out


_OPS = {"以上": "≥", "以下": "≤", "未満": "<", "超": ">", "低い程": "≤", "高い程": "≥"}


# phrases that mark how an ability type works, counted per AbilityType
_TYPE_MARKERS = ("攻撃した敵", "大魔法", "特殊攻撃", "攻撃する度に", "攻撃を受ける度に", "敵を撃破する度に", "計略中", "伏兵")
# words that may name a StatusType-201 flag bit
_FLAG_WORDS = ("防御無視", "防御を無視", "飛行", "妖怪", "術", "連続", "貫通", "周囲", "後退", "地上", "標的", "半減")


def mine_status_units(c: GameCache, smt: dict, labels: dict, unit_effect: dict) -> dict[str, dict]:
    """statunit:<StatusType> = "%" for statuses whose flat (ValueType 1) amounts the descriptions print
    with % (防御を20%無視, 再配置時間が40%短縮): the status itself holds a percentage. Counted per row
    whose EffectValue appears in its ability's text: "20%" vs a bare "20" (not 20倍 / 20秒)."""
    groups = group_rows(c.table(ABILITY_ARC, "Ability.atb"), "AbilityID")
    texts = first_by(c.table(ABILITY_ARC, "AbilityText.atb"), "AbilityID")
    tally: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    for aid, rows in groups.items():
        desc = clean_text(texts.get(aid, {}).get("Description", ""))
        if not desc:
            continue
        for r in rows:
            m = smt.get(r.get("StatusModifierType"))
            v = r.get("EffectValue")
            if not m or m[2] != 1 or m[1] not in (1, 2, 3) or not v:
                continue
            pct = re.search(rf"(?<![\d.]){v}[%％]", desc)
            flat = re.search(rf"(?<![\d.]){v}(?![\d.%％倍秒])", desc)
            if pct and not flat:
                tally[m[0]]["%"] += 1
            elif flat and not pct:
                tally[m[0]]["flat"] += 1
    # formation rows: ounit:<EffectType> (the unit their clauses print) via UnitEffect type 1 -> modifier
    for key, lab in labels.items():
        if not key.startswith("ounit:") or lab.get("unit") not in ("%", ""):
            continue
        ue = unit_effect.get(int(key.split(":")[1]))
        m = smt.get(ue[1]) if ue and ue[0] == 1 else None
        if m and m[2] == 1 and m[1] in (1, 2, 3):
            tally[m[0]]["%" if lab["unit"] == "%" else "flat"] += lab["n"]
    out = {}
    for st, cnt in tally.items():
        if cnt["%"] >= 2 and cnt["%"] >= 5 * cnt["flat"]:
            out[f"statunit:{st}"] = {"jp": "%", "unit": "%", "n": cnt["%"], "of": cnt["%"] + cnt["flat"], "ex": []}
    return out


def mine_row_markers(c: GameCache, attack_bonus: dict) -> dict[str, dict]:
    """Codes named by a marker word in their ability's description.

    location:<AbilityLocationType>  the 【…】 tag its descriptions carry (【水上】)
    op:<ConditionOperator>          the comparison word next to attack-bonus thresholds (以上 / 以下 …)
    """
    groups = group_rows(c.table(ABILITY_ARC, "Ability.atb"), "AbilityID")
    texts = first_by(c.table(ABILITY_ARC, "AbilityText.atb"), "AbilityID")
    flag_codes = {r["ModifierID"] for r in c.table("UnitEffect.aar", "StatusModifierType.atb") if r["StatusType"] == 201}
    loc: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    ops: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    abtype: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    flags: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    flag_rows: collections.Counter = collections.Counter()
    for aid, rows in groups.items():
        desc = clean_text(texts.get(aid, {}).get("Description", "")).replace("\n", "")
        # 【水上】 or written out: 水上マス配置時
        tags = set(re.findall(r"【([^】]+)】", desc)) | set(re.findall(r"(水上|陸上|山上)マス", desc))
        words = set(re.findall("|".join(_OPS), desc))
        markers = {m for m in _TYPE_MARKERS if m in desc}
        for r in rows:
            for mk in markers or {""}:
                abtype[r["AbilityType"]][mk] += 1
            # StatusType 201 modifiers carry bit flags in EffectValue
            if r["StatusModifierType"] in flag_codes:
                for b in range(16):
                    if r["EffectValue"] >> b & 1:
                        flag_rows[1 << b] += 1
                        for w in _FLAG_WORDS:
                            if w in desc:
                                flags[1 << b][w] += 1
            if r["AbilityLocationType"]:
                for t in tags or {""}:
                    loc[r["AbilityLocationType"]][t] += 1
            if r["AbilityType"] == 22 and r["AbilityTypeDetail"] in attack_bonus:
                op = attack_bonus[r["AbilityTypeDetail"]].get("ConditionOperator")
                for w in words or {""}:
                    ops[op][_OPS.get(w, "")] += 1
    out = {}
    for bit, cnt in flags.items():
        word, n = cnt.most_common(1)[0]
        if n >= MIN_COUNT and n / flag_rows[bit] > 0.5:
            out[f"flag:{bit}"] = {"jp": word, "n": n, "of": flag_rows[bit], "ex": [w for w, _ in cnt.most_common(3)]}
    for key, table in (("location", loc), ("op", ops), ("abtype", abtype)):
        for code, cnt in table.items():
            total = sum(cnt.values())
            word, n = cnt.most_common(1)[0]
            if word and n >= MIN_COUNT and n / total > 0.5:
                out[f"{key}:{code}"] = {"jp": word, "n": n, "of": total, "ex": [w for w, _ in cnt.most_common(3)]}
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public"))
    args = ap.parse_args()
    c = GameCache()

    smt = {
        r["ModifierID"]: [r["StatusType"], r["ExpressionType"], r["ValueType"], r["ReferenceStatusType"], r["ReferenceSenderUnit"]]
        for r in c.table("UnitEffect.aar", "StatusModifierType.atb") if r["ModifierID"]
    }
    attack_bonus = {
        r["AttackBonusStatusEffectID"]: compact(r, ("AttackBonusStatusEffectID", "StartEffect"))
        for r in c.table("UnitEffect.aar", "AttackBonusStatusEffect.atb") if r["AttackBonusStatusEffectID"]
    }
    # missiles referenced by effect rows: their status modifiers ([code, value, millis] x2)
    missiles = {}
    missile_cc = {}
    # DamageRepeatNum (ダメージ発生回数) + RepeatDamageDelayMillis (連続ダメージ発生遅延): every missile with
    # a repeat count is described as (count + 1)連続 (20 of 20 stratagem missiles)
    missile_repeat = {}
    # DealDamageEffectID (ダメージ発生効果) + value + duration: the damage a missile's hit leaves behind
    missile_dde = {}
    for r in c.table("Missile.atb"):
        if r["MissileID"] and r["DealDamageEffectID"]:
            missile_dde[r["MissileID"]] = [r["DealDamageEffectID"], r["DealDamageEffectValue"], r["DealDamageEffectDurationInMillis"]]
        if r["MissileID"] and r["DamageRepeatNum"]:
            missile_repeat[r["MissileID"]] = [r["DamageRepeatNum"], r["RepeatDamageDelayMillis"]]
        mods = [[r[f"StatusModifierType{i}"], r[f"StatusEffectValue{i}"], r[f"DurationInMillis{i}"]] for i in (1, 2)
                if r[f"StatusModifierType{i}"]]
        if r["MissileID"] and mods:
            missiles[r["MissileID"]] = mods
        if r["MissileID"] and r["CrowdControlType"]:
            # CrowdControlType (状態異常) with the DurationInMillis1 column that precedes it
            missile_cc[r["MissileID"]] = [r["CrowdControlType"], r["DurationInMillis1"]]
    unit_effect = {
        r["UnitEffectID"]: [r["UnitEffectType"], r["ActualEffectID"]]
        for r in c.table("UnitEffect.aar", "UnitEffect.atb") if r["UnitEffectID"]
    }

    labels: dict[str, dict] = {}
    mined = mine(c)
    for key, d in mined.items():
        if key.startswith("smt:"):
            # per modifier code: how its descriptions word the change (短縮 = down, 秒 = seconds);
            # the StatusType alone can't say, since one stat has both buffs and debuffs
            w = wording(d)
            if w and d["matched"] >= MIN_COUNT:
                labels[key] = {"jp": "", "n": d["matched"], "of": d["rows"], "ex": d["examples"][:2], **w}
            continue
        if key.startswith(("smt?:", "target:")):
            continue
        lab = pick_label(d["nouns"], d["matched"])
        if lab:
            # 敵の防御を20%無視: the verb, not the noun, says what the code does
            ignore = sum(c for v, c in d["verbs"] if v.startswith("無視"))
            if ignore >= 0.5 * sum(c for _, c in d["verbs"]):
                lab["jp"] += "無視"
            lab["ex"] = d["examples"][:2]
            lab.update(wording(d))
            labels[key] = lab

    mined_targets = mine_targets(c)
    for key, cnt in mined_targets.items():
        total = sum(cnt.values())
        word, n = cnt.most_common(1)[0]
        if key.startswith("trigger:"):
            if not word:
                word, n = next(((w, k) for w, k in cnt.most_common() if w), ("", 0))
            # or: it is (nearly) the only trigger wording this type's clauses ever use
            nonempty = sum(k for w, k in cnt.items() if w)
            exclusive = word and n >= 0.9 * nonempty
            if word and n >= MIN_COUNT and (n / total >= MIN_SHARE or (exclusive and n / total >= 0.3)):
                labels[key] = {"jp": word, "n": n, "of": total, "ex": [w for w, _ in cnt.most_common(4) if w]}
            continue
        if key == "growup":
            labels["field:EachGrowUp"] = {"jp": "巨大化する度に", "n": cnt["1:yes"], "of": cnt["1:yes"] + cnt["0:yes"],
                                          "ex": [f"EachGrowUp=1 on {cnt['1:yes']} of the clauses worded 巨大化する度に; "
                                                 f"EachGrowUp=0 on {cnt['0:yes']}"]}
            continue
        if n >= TARGET_MIN and n / total >= (TARGET_SHARE if key.startswith("target:") else MIN_SHARE):
            labels[key] = {"jp": word, "n": n, "of": total, "ex": [w for w, _ in cnt.most_common(4)]}

    # formation (編成特技) TargetType / AreaType: their own vocabulary, labelled only from
    # formation descriptions; few clauses per code, so one is enough when nothing contradicts it
    for key, cnt in mine_organized_targets(c, labels).items():
        total = sum(cnt.values())
        word, n = cnt.most_common(1)[0]
        if key.startswith("ounit:"):
            if n / total > 0.5:
                labels[key] = {"jp": "", "unit": word, "n": n, "of": total, "ex": []}
            continue
        if n / total > 0.5:
            labels[key] = {"jp": word, "n": n, "of": total, "ex": [w for w, _ in cnt.most_common(4)]}

    # stratagem targets: labelled on a strict majority of their own stratagem texts
    for key, cnt in mine_stratagem_targets(c).items():
        total = sum(cnt.values())
        word, n = cnt.most_common(1)[0]
        if key.startswith("etarget:"):
            # only the 自分のみ marker is evidence here; its absence names nothing
            if word == "自分のみ" and n / total > 0.5:
                labels[key] = {"jp": word, "n": n, "of": total, "ex": []}
            continue
        if key.startswith(("oparea:", "setdetail:")):
            # marker phrases: label on a strict majority of the code's stratagems
            if word and n >= MIN_COUNT and n / total > 0.5:
                labels[key] = {"jp": word, "n": n, "of": total, "ex": [w for w, _ in cnt.most_common(3)]}
            continue
        if word and n >= 3 and n / total > 0.5:
            labels[key] = {"jp": word, "n": n, "of": total, "ex": [w for w, _ in cnt.most_common(4)]}

    # target codes the game's own code defines (data/target_codes.json, read out of the exe):
    # each tests one card field against a value, named here from the game's name tables
    for key, lab in exe_target_labels(c).items():
        labels[key] = lab
    # StatusTypes the exe binds to table columns (data/status_types_exe.json)
    st = json.loads((Path(__file__).resolve().parent / "data" / "status_types_exe.json").read_text(encoding="utf-8"))
    for code, d in st["status"].items():
        labels[f"status:{code}"] = {"jp": d["name"], "n": 0, "of": 0, "ex": [d["proof"]], "src": "exe"}
    # statuses named only by their rows' own descriptions (no exe name): shown with the "?" evidence
    for code, d in st.get("status_text", {}).items():
        if f"status:{code}" not in labels:
            labels[f"status:{code}"] = {"jp": d["name"], "n": d["n"], "of": d["of"], "ex": d["ex"], "src": "text"}
    for key, d in st.get("labels_text", {}).items():
        labels.setdefault(key, {**d, "src": "text"})
    for code, d in st.get("target_text", {}).items():
        for pre in ("target", "otarget"):
            if f"{pre}:{code}" not in labels:
                labels[f"{pre}:{code}"] = {"jp": d["name"], "n": d["n"], "of": d["of"], "ex": d["ex"], "src": "text"}
    for bit, d in st.get("flagbits", {}).items():
        labels[f"flag:{bit}"] = {"jp": d["name"], "n": 0, "of": 0, "ex": [d["proof"]], "src": "exe"}
    for w in c.table("Weather.atb"):
        if w["ID"] > 0:
            labels[f"weatherbit:{1 << (w['ID'] - 1)}"] = {"jp": w["Name"], "n": 0, "of": 0, "src": "exe",
                                                       "ex": [f"Weather.atb ID {w['ID']}; bit = 1 << (ID-1) (Artifact 131/714)"]}
    # status 225 attack-attribute bits: column order of EnemyWeakAttribute.atb (after ID)
    wa = c.members("EnemyTable.aar")["EnemyWeakAttribute.atb"].header.rows
    for i, f in enumerate(f for f in wa if f.name_en != "ID"):
        labels[f"attrbit:{1 << i}"] = {"jp": f.name_jp, "n": 0, "of": 0, "src": "exe",
                                       "ex": [f"EnemyWeakAttribute.atb column {i + 1} ({f.name_en}); status 225 bit {1 << i}"]}
    for key, d in st.get("abilitytypes", {}).items():
        prev = labels.get(f"abilitytype:{key}", {})
        lab = {**prev, "jp": d["name"], "n": 0, "of": 0, "ex": [d["proof"]], "src": "item"}
        # the item text quoted in the proof ('獲得金が15%上昇') gives the unit and direction
        m = re.search(r"'[^']*?\d+(%|％)?(上昇|増加|低下|減少|短縮|軽減)[^']*'", d["proof"])
        if m:
            lab["dir"] = "+" if m[2] in _UP else "-"
            if m[1]:
                lab["unit"] = "%"
        labels[f"abilitytype:{key}"] = lab
    cct = st.get("cctypes", {})
    for code, d in cct.items():
        labels[f"cc:{code}"] = {"jp": d["name"], "n": 0, "of": 0, "src": "item", "ex": [d["proof"]]}
    for bit, cc in st.get("ccbits", {}).items():
        name = cct.get(str(cc), {}).get("name", str(cc))
        labels[f"ccbit:{bit}"] = {"jp": name, "n": 0, "of": 0, "src": "exe",
                                  "ex": [f"bit {bit} of status 312/313 = CrowdControlType {cc} (FUN_00acea70)"]}
    # Tokusei (trait) names: MenuText 4300 + id, the unit filter's own list; ability condition kind 10
    # counts units by Tokusei id in AbilityEffectDetail (FUN_00548d20 / FUN_00549fc0)
    menu = {r["ID"]: r["Text"] for r in c.table("Text.aar", "MenuText.atb")}
    tokusei = {r[k] for r in c.table("PlayerUnitTable.aar", "Card.atb") for k in ("Tokusei1", "Tokusei2", "Tokusei3") if r.get(k)}
    for t in sorted(tokusei):
        if menu.get(4300 + t):
            labels[f"trait:{t}"] = {"jp": menu[4300 + t], "n": 0, "of": 0, "src": "exe", "ex": [f"MenuText {4300 + t}"]}
    for code, d in st.get("kinds", {}).items():
        labels[f"statuskind:{code}"] = {"jp": d["kind"], "n": 0, "of": 0, "ex": [d["proof"]], "src": "exe"}

    labels.update(mine_status_units(c, smt, labels, unit_effect))
    # AbilityType 10/2: FUN_00af7830 sends TypeDetail 1 rows to damage (FUN_00aaa920), 2 to its own effect
    # record (FUN_00af2a50(1, .., EffectValue)), only 3 to the modifier/condition path. Every text with a
    # 10/2 row says 耐久が最大のN%回復 with N = EffectValue (counted here); the word-miner had matched 射程.
    groups = group_rows(c.table(ABILITY_ARC, "Ability.atb"), "AbilityID")
    texts = first_by(c.table(ABILITY_ARC, "AbilityText.atb"), "AbilityID")
    heal = total = 0
    for aid, rows in groups.items():
        desc = clean_text(texts.get(aid, {}).get("Description", "")).replace("\n", "")
        for r in rows:
            if r.get("AbilityType") == 10 and r.get("AbilityTypeDetail") == 2:
                total += 1
                heal += bool(re.search(rf"最大(?:耐久)?の{r.get('EffectValue')}%回復", desc))
    if total and heal * 2 > total:
        labels["abilitytype:10/2"] = {"jp": "最大耐久の%回復", "dir": "+", "unit": "%", "n": heal, "of": total, "src": "text",
                                      "ex": ["FUN_00af7830: TypeDetail 2 -> FUN_00af2a50 effect record; text 耐久が最大のN%回復"]}
    out = Path(args.out) / "data" / "effects.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    for key, lab in mine_row_markers(c, attack_bonus).items():
        labels[key] = lab


    # UnitEffect targets: rows whose own column names say what they do
    effect_tables = {}
    for name, key in (("DealDamageEffect.atb", "DealDamageEffectID"), ("OnTakeDamageEffect.atb", "OTDEffectID"),
                      ("OnGiveDamageEffect.atb", "OGDEffectID"), ("ImmunityEffect.atb", "ImmunityID")):
        effect_tables[name[:-4]] = {r[key]: compact(r, (key,)) for r in c.table("UnitEffect.aar", name) if r[key]}

    target_sets = {k: [r["TargetType"] for r in rows if r["TargetType"]]
                   for k, rows in group_rows(c.table("EnchantTargetSet.atb"), "ID").items()}
    # Quest.atb Type -> example quest names (QuestText), for quest-only abilities' QuestType
    qtext = {r["QuestID"]: r["QuestName"] for r in c.table("QuestText.atb")}
    quest_types: dict[int, list[str]] = {}
    for r in c.table("Quest.atb"):
        name = (qtext.get(r["QuestID"]) or "").strip()
        if name and len(quest_types.setdefault(r["Type"], [])) < 3:
            quest_types[r["Type"]].append(name)
    # class ability 6/7: EffectValue is an AbilityID (all 7 values used are Ability.atb ids); keep their names
    atext = {r["AbilityID"]: r["Name"] for r in c.table(ABILITY_ARC, "AbilityText.atb")}
    ability_names, head = {}, None
    for r in c.table(ABILITY_ARC, "Ability.atb"):
        if r["AbilityType"]:
            head = r
        if head and head["AbilityType"] == 6 and (r["AbilityTypeDetail"] if r["AbilityType"] else head["AbilityTypeDetail"]) == 7:
            if r["EffectValue"] in atext:
                ability_names[r["EffectValue"]] = atext[r["EffectValue"]]
    out.write_text(json.dumps({"ability_names": ability_names, "quest_types": quest_types, "target_sets": target_sets, "smt": smt, "missile_dde": missile_dde, "missile_repeat": missile_repeat, "attack_bonus": attack_bonus, "unit_effect": unit_effect,
                               "missiles": missiles, "missile_cc": missile_cc, "effect_tables": effect_tables, "labels": labels},
                              ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    by_vocab = collections.Counter(k.split(":")[0] for k in labels)
    print(f"labels: {dict(by_vocab)} -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
