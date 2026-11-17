// Pieces shared by the equipment list and detail pages.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { WEAPON_EN } from "./labels";
import { getLang, useFx, useT } from "./i18n";
import { nameOf } from "./data";
import { describeRow, rowBases, type EffectDefs } from "./effects";
import { StackNotes } from "./stackNotes";
import { groupRows } from "./group";
import { STAT_KEYS, weaponAbilityRows, type StatKey, type Weapon, type WeaponData, type WeaponSource } from "./weapons";
import type { RawRow, UnitIndexEntry } from "./types";
import type { StageEntry } from "./stages";

/** A weapon type's name: the game's in Japanese mode, the English table's otherwise (collab types keep theirs). */
export function weaponTypeName(data: WeaponData | undefined, type: number): string {
  const jp = data?.types[String(type)] ?? `${type}`;
  return getLang() === "ja" ? jp : WEAPON_EN[jp] ?? jp;
}

const STAT_UI: Record<StatKey, "thHp" | "thAtk" | "thDef" | "regen" | "range" | "attackSpeedPct" | "targets" | "block"> = {
  hp: "thHp", atk: "thAtk", def: "thDef", regen: "regen", range: "range", speed: "attackSpeedPct", targets: "targets", block: "block",
};

/** "ATK +40 · Range +30 · Attack speed +20%". */
export function useStatText() {
  const t = useT();
  return (stats: Partial<Record<StatKey, number>>) =>
    STAT_KEYS.filter((k) => stats[k]).map((k) => `${t(STAT_UI[k]).replace(/ [^\x00-\x7f].*$/, "")} ${stats[k]! > 0 ? "+" : "−"}${Math.abs(stats[k]!)}${k === "speed" ? "%" : ""}`);
}

/** A weapon's ability rows as decoded lines. */
export function AbilityLines({ rows, defs }: { rows: RawRow[]; defs: EffectDefs }) {
  const fx = useFx();
  const t = useT();
  const conv = weaponAbilityRows(rows, defs);
  const bases = rowBases(conv);
  const lines = groupRows(conv.map((r, i) => describeRow(r, "ability", defs, undefined, bases[i]).text));
  return (
    <>
      <ul className="fx-plain">
        {lines.map((l, i) => <li key={i} title={l.text && fx.line(l.text) !== l.text ? l.text : undefined}>{l.text ? fx.line(l.text) : t("notDecoded")}</li>)}
      </ul>
      <StackNotes texts={lines.map((l) => l.text)} />
    </>
  );
}

/** The first decoded effect lines of a weapon, in the current language (for list tiles). */
export function useEffectSummary(defs: EffectDefs | undefined) {
  const fx = useFx();
  return (rows: RawRow[], max = 2): string[] => {
    if (!defs || !rows.length) return [];
    const conv = weaponAbilityRows(rows, defs);
    const bases = rowBases(conv);
    return groupRows(conv.map((r, i) => describeRow(r, "ability", defs, undefined, bases[i]).text))
      .map((l) => l.text).filter(Boolean).slice(0, max).map((x) => fx.line(x).replace(/^(Self|自身): /, ""));
  };
}

/** One source, worded in the current language, with links to the castle girl / stage / weapon it names. */
export function SourceLine({ s, units, stages, weapons }: {
  s: WeaponSource; units: Map<number, UnitIndexEntry>; stages: Map<number, StageEntry>; weapons: Map<number, Weapon>;
}) {
  const t = useT();
  const d = String(s.detail ?? "");
  const quest = (id?: number): ReactNode => {
    if (!id) return "";
    const st = stages.get(id);
    return st ? <Link to={`/stages/${id}`}>{st.name}</Link> : `#${id}`;
  };
  // a translated sentence with one linked part: split at its placeholder
  const linked = (key: Parameters<typeof t>[0], slot: string, node: ReactNode, vars: Record<string, string | number> = {}) => {
    const [a, b = ""] = t(key, { ...vars, [slot]: "\u0000" }).split("\u0000");
    return <>{a}{node}{b}</>;
  };
  let body: ReactNode;
  switch (s.kind) {
    case "unit": {
      const u = s.card ? units.get(s.card) : undefined;
      body = linked("srcUnit", "name", u ? <Link to={`/units/${u.id}`}>{nameOf(u)}</Link> : `#${s.card}`);
      break;
    }
    case "drop": body = linked("srcDrop", "quest", quest(s.quest)); break;
    case "first_clear": body = linked("srcFirstClear", "quest", quest(s.quest)); break;
    case "achievement": body = linked("srcAchievement", "quest", quest(s.quest)); break;
    case "evolution": {
      const w = s.weapon ? weapons.get(s.weapon) : undefined;
      body = linked("srcEvolution", "weapon", w ? <Link to={`/equipment/${w.id}`}>{nameOf(w)}</Link> : `#${s.weapon}`);
      break;
    }
    case "login": body = t("srcLogin", { date: d }); break;
    case "login_beginner": body = t("srcLoginBeginner", { n: d }); break;
    case "mission": body = t("srcMission", { text: d }); break;
    case "campaign": body = t("srcCampaign", { title: d, date: s.date ?? "" }); break;
    case "exchange": body = t("srcExchange", { cost: s.cost ?? "?", date: s.date ?? "", until: s.until ?? "" }); break;
    case "shop": body = t("srcShop", { cost: s.cost ?? "?" }); break;
    case "tower": body = t("srcTower", { n: d }); break;
    case "vote": body = t("srcVote", { title: d, votes: s.votes ?? "" }); break;
    case "rental": body = t("srcRental", { n: d }); break;
    case "pack": body = t("srcPack", { title: d, date: s.date ?? "" }); break;
    case "summon": body = t("srcSummon", { title: d }); break;
    case "summon_step": body = t("srcSummonStep", { n: d }); break;
    case "bead": body = t("srcBead", { date: s.date ?? "" }); break;
    default: body = `${s.kind} ${d}`;
  }
  return (
    <>
      {body}
      {s.plus ? <span className="hub-badge">{t("plusN", { n: s.plus })}</span> : null}
      {s.count && s.count > 1 ? <span className="hub-badge">{t("timesN", { n: s.count })}</span> : null}
    </>
  );
}
