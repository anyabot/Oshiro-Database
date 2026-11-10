"""Resolve a card's ability ids into text + effect rows.

Effect tables (Ability.atb, OrganizedAbility.atb, ...) store one ability as
its id row followed by rows whose id is 0: those continuation rows belong to
the preceding id, in file order. The parallel *Text.atb tables have the same
row layout; only the id row carries the name and description.

Stratagems (計略) live in Gimmick.atb (one row per id). A card's GimmickID may
instead be a GimmickSetID: GimmickSet.atb lists the member stratagems, and a
Gimmick row with the same id (when present) is the parent entry that
describes the set.
"""

from __future__ import annotations

import re
from typing import Any

from .cache import GameCache

ABILITY_ARC = "PlayerUnitAbilityTable.aar"

_COLOR = re.compile(r"%c\[[0-9a-fA-F]{6}\]")


def clean_text(s: str | None) -> str:
    """Game text without carriage returns and inline colour codes."""
    if not s:
        return ""
    return _COLOR.sub("", s.replace("\r", "")).strip()


def compact(row: dict[str, Any], drop: tuple[str, ...] = ()) -> dict[str, Any]:
    """Row without zero/empty fields (and without the keys in ``drop``)."""
    return {k: v for k, v in row.items() if k not in drop and v not in (0, 0.0, "", None)}


def group_rows(rows: list[dict[str, Any]], key: str) -> dict[int, list[dict[str, Any]]]:
    """Id row + its following id-0 continuation rows, keyed by id."""
    out: dict[int, list[dict[str, Any]]] = {}
    cur = None
    for r in rows:
        k = r[key]
        if k:
            cur = k
            out.setdefault(k, []).append(r)
        elif cur is not None:
            out[cur].append(r)
    return out


def first_by(rows: list[dict[str, Any]], key: str) -> dict[int, dict[str, Any]]:
    out: dict[int, dict[str, Any]] = {}
    for r in rows:
        k = r[key]
        if k and k not in out:
            out[k] = r
    return out


class AbilityResolver:
    # slot -> (effect table, text table or None, id field)
    SLOTS = {
        "ability": ("Ability.atb", "AbilityText.atb", "AbilityID"),
        "organized": ("OrganizedAbility.atb", "OrganizedAbilityText.atb", "AbilityID"),
        "possessed": ("PossessedAbility.atb", "PossessedAbilityText.atb", "AbilityID"),
        "defeated": ("DefeatedAbility.atb", "DefeatedAbilityText.atb", "AbilityID"),
        "always": ("AlwaysAbility.atb", None, "AbilityID"),
        "quest": ("QuestAbility.atb", None, "AbilityID"),
    }

    def __init__(self, cache: GameCache):
        self.c = cache
        self.effects: dict[str, dict[int, list[dict]]] = {}
        self.texts: dict[str, dict[int, dict]] = {}
        for slot, (eff, txt, key) in self.SLOTS.items():
            self.effects[slot] = group_rows(cache.table(ABILITY_ARC, eff), key)
            self.texts[slot] = first_by(cache.table(ABILITY_ARC, txt), key) if txt else {}
        self.special = first_by(cache.table(ABILITY_ARC, "SpecialAbility.atb"), "ID")
        self.special_attack = first_by(cache.table(ABILITY_ARC, "SpecialAttack.atb"), "ID")
        self.moving = first_by(cache.table(ABILITY_ARC, "MovingAttack.atb"), "ID")
        self.potential = group_rows(cache.table(ABILITY_ARC, "PotentialAbility.atb"), "ID")
        self.defeated_field = first_by(cache.table(ABILITY_ARC, "DefeatedFieldEffect.atb"), "FieldEffectID")
        self.missile = first_by(cache.table("Missile.atb"), "MissileID")

        self.gimmick = first_by(cache.table("Gimmick.atb"), "GimmickID")
        self.field = first_by(cache.table("FieldEffect.atb"), "FieldEffectID")
        self.token = first_by(cache.table("TokenConfig.atb"), "TokenID")
        self.cards = {r["CardID"]: r for r in cache.table("PlayerUnitTable.aar", "Card.atb")}
        self.card_names = {r["CardID"]: r["CardName"] for r in cache.table("PlayerUnitTable.aar", "CardName.atb")}
        self.gimmick_set = group_rows(cache.table("GimmickSet.atb"), "GimmickSetID")
        self.guide = first_by(cache.table("GimmickGuideText.atb"), "ID")
        self.enchant = first_by(cache.table("EnchantEffect.atb"), "EnchantEffectID")
        self.enchant_set = group_rows(cache.table("EnchantEffectSet.atb"), "ID")

    def ability(self, slot: str, aid: int) -> dict[str, Any] | None:
        if not aid:
            return None
        key = self.SLOTS[slot][2]
        text = self.texts[slot].get(aid, {})
        rows = self.effects[slot].get(aid, [])
        if not text and not rows:
            return {"id": aid, "missing": True}
        out: dict[str, Any] = {"id": aid}
        if text:
            out["name"] = clean_text(text.get("Name"))
            out["description"] = clean_text(text.get("Description"))
        out["effects"] = [compact(r, (key,)) for r in rows]
        if rows and "AbilityType" in rows[0]:
            # AbilityType 21: EffectValue is a DefeatedFieldEffectID (every type-21 row, in
            # DefeatedAbility and Ability alike), whose Param1 is a MissileID (every field effect)
            links = {}
            for i, r in enumerate(rows):
                fe = self.defeated_field.get(r["EffectValue"]) if r["AbilityType"] == 21 else None
                if fe:
                    links[i] = {"field": compact(fe, ("FieldEffectID",)), "field_id": fe["FieldEffectID"],
                                "missile": compact(self.missile.get(fe["Param1"], {}), ("MissileID",))}
            if links:
                out["field_links"] = links
        return out

    def special_ability(self, sid: int) -> dict[str, Any] | None:
        if not sid:
            return None
        r = self.special.get(sid)
        if not r:
            return {"id": sid, "missing": True}
        out = {
            "id": sid,
            "name": clean_text(r["Name"]),
            "description": clean_text(r["Description"]),
            "ki": r["ConsumeKi"] or None,
            "duration": r["TransformDuration"] or None,
            "reuse": r["ReuseWaitSeconds"] or None,
            "deploy_wait": r["DeployedWaitSeconds"] or None,
            "raw": compact(r, ("ID", "Name", "Description")),
        }
        sub = self.ability("ability", r["AbilityID"])
        if sub:
            out["sub_ability"] = sub
        return out

    def moving_attack(self, mid: int) -> dict[str, Any] | None:
        """MovingAttack.atb row + its MovingAttackAbilityID ability."""
        if not mid:
            return None
        r = self.moving.get(mid)
        if not r:
            return {"id": mid, "missing": True}
        out: dict[str, Any] = {"id": mid, "raw": compact(r, ("ID",))}
        sub = self.ability("ability", r["MovingAttackAbilityID"])
        if sub:
            out["ability"] = sub
        return out

    def special_attack_of(self, said: int) -> dict[str, Any] | None:
        if not said:
            return None
        r = self.special_attack.get(said)
        if not r:
            return {"id": said, "missing": True}
        out: dict[str, Any] = {"id": said, "raw": compact(r, ("ID",))}
        sub = self.ability("ability", r["SpecialAttackAbilityID"])
        if sub:
            out["ability"] = sub
        return out

    def potential_of(self, pid: int) -> list[dict[str, Any]]:
        rows = self.potential.get(pid, [])
        name = clean_text(rows[0]["Name"]) if rows else ""
        return [
            {
                "name": name,
                "limit_break": r["LimitBreakIndex"],
                "description": clean_text(r["Description"]),
                "raw": compact(r, ("ID", "Name", "Description", "LimitBreakIndex")),
            }
            for r in rows
        ]

    def _enchant(self, eid: int) -> dict[str, Any] | None:
        r = self.enchant.get(eid)
        if not r:
            return None
        out: dict[str, Any] = {"id": eid, "row": compact(r, ("EnchantEffectID",))}
        for side in ("AllyEffectSetID", "OpponentEffectSetID"):
            sid = r.get(side)
            if sid and sid in self.enchant_set:
                out[side] = [compact(x, ("ID",)) for x in self.enchant_set[sid]]
        return out

    def _gimmick_row(self, gid: int) -> dict[str, Any] | None:
        r = self.gimmick.get(gid)
        if not r:
            return None
        guide = self.guide.get(r["GuideTextID"])
        out = {
            "id": gid,
            "name": clean_text(r["GimmickName"]),
            "description": clean_text(r["Description"]),
            "ki": r["Ki"],
            "cooldown": r["GimmickPoint"],
            "stock": r["GimmickDefaultStockCount"] or None,
            "guide": clean_text(guide["Description"]) if guide else None,
            "raw": compact(r, ("GimmickID", "GimmickName", "Description")),
        }
        # GimmickType decides which table EffectID points into (each holds 100% of its type's ids):
        # 1 EnchantEffect, 2 TokenConfig (a placed 伏兵 unit), 3 FieldEffect, 5 GimmickSet parent
        if r["GimmickType"] == 2 and r["EffectID"] in self.token:
            out["token"] = self._token(r["EffectID"])
        elif r["GimmickType"] == 3 and r["EffectID"] in self.field:
            fe = self.field[r["EffectID"]]
            # FieldEffectType 3: Param1 is an EnchantEffectID (77/77); types 1/5/7: a MissileID (all)
            if fe["FieldEffectType"] == 3:
                out["field"] = {"field_id": fe["FieldEffectID"], "field": compact(fe, ("FieldEffectID",)), "missile": {}}
                ench = self._enchant(fe["Param1"])
                if ench:
                    out["effect"] = ench
            else:
                out["field"] = {"field_id": fe["FieldEffectID"], "field": compact(fe, ("FieldEffectID",)),
                                "missile": compact(self.missile.get(fe["Param1"], {}), ("MissileID",))}
        eff = self._enchant(r["EffectID"]) if r["GimmickType"] == 1 else None
        if eff:
            out["effect"] = eff
            raw = self.enchant[r["EffectID"]]
            # the unit turns into its transformed card (Card.DependenceCardId) while this runs
            if raw.get("TransformEnabled") or raw.get("TransformEnabledCT"):
                out["transform"] = True
        return out

    def _token(self, tid: int) -> dict[str, Any]:
        """The unit a 伏兵 stratagem places: TokenConfig row + the token card's abilities."""
        t = self.token[tid]
        card = self.cards.get(t["CardID"], {})
        out: dict[str, Any] = {"token_id": tid, "card_id": t["CardID"], "name": self.card_names.get(t["CardID"], ""),
                               "config": compact(t, ("TokenID", "CardID"))}
        for slot, field in (("ability", "AbilityID"), ("general_ability", "GeneralAbilityID1")):
            a = self.ability("ability", card.get(field, 0))
            if a:
                out[slot] = a
        return out

    def stratagems(self, gid: int) -> list[dict[str, Any]]:
        """Every stratagem a GimmickID gives: the parent entry first, then set members."""
        if not gid:
            return []
        out = []
        parent = self._gimmick_row(gid)
        if parent:
            out.append(parent)
        for m in self.gimmick_set.get(gid, []):
            g = self._gimmick_row(m["GimmickID"])
            if g:
                g["set_member"] = True
                out.append(g)
        if not out:
            out.append({"id": gid, "missing": True})
        return out
