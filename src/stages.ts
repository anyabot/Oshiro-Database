// Stage / enemy data (tools/export_stages.py) and how deliberations (審議) change each enemy.
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import { describeRow, sideOfTarget, type BuffFact, type EffectDefs } from "./effects";
import { tagEN } from "./labels";
import type { RawRow } from "./types";

export type StageGroup = "enma" | "hel" | "osiris" | "hades" | "bushin" | "story" | "voyage" | "tenma" | "osaka" | "palace" | "events" | "other";

export interface StageEntry {
  id: number; name: string; group: StageGroup; tab: number; tabNo: number; index: number;
  /** Event.atb row the quest ID falls in (index into events.json) */
  event: number | null;
  map: number;
  enemies: number; spawns: number; singi: boolean; veryHard: boolean; bushin?: string;
  /** in the game's current Quest.atb */
  live: boolean;
  /** rebuilt from a cached map of a past event (no Quest.atb row: no names, multipliers or Ki) */
  recovered?: boolean;
}

/** Event.atb: title, dates and the quest-ID range of an event. */
export interface GameEvent { id: number; title: string; type: number; start: string; end: string; head: number; tail: number }

export interface Spawn { t: number; e: number; r: number; lv?: number; g?: number; hid?: 1 }

export interface SingiOption {
  id: number; name: string; text: string;
  /** 審議 points */
  pts: number;
  /** SingiGroup (同時設定不可): options of one non-zero group can't be chosen together */
  grp: number;
  /** MapEffect.atb rows (deliberations below 20000); absent = text only */
  rows?: RawRow[];
  /** PreBattleEffect.atb rows (2xxxx deliberations: castle girl base stats) */
  pre?: RawRow[];
}

export interface StageDetail {
  id: number; name: string; group: StageGroup; tab: number; tabNo: number; type: number; map: number;
  event?: number | null; live?: boolean; recovered?: boolean;
  description: string; battlefield: string; terrain: string;
  /** [ATK, HP, DEF] % (攻撃/耐久/防御補正); 0 = unchanged */
  rates: { normal: [number, number, number] | null; hard: [number, number, number] | null };
  veryHard: boolean; ki: number; coreLife: number;
  mapEffect: RawRow[];
  spawns: Spawn[];
  counts: Record<string, number>;
  /** EnemyTransform chains: enemy -> [form, Trigger, seconds (TimeElapsedTransformFrame / 30) or 0][] */
  forms?: Record<string, [number, number, number][]>;
  /** rebuilt Bushin: the multipliers live Bushin of the same rank use (most common of `of`) */
  estimate?: {
    normal: { rates: [number, number, number]; of: number; n: number; values: number[][] } | null;
    hard: { rates: [number, number, number]; of: number; n: number; values: number[][] } | null;
    from: number[];
  };
  singi: { set: number; options: SingiOption[]; gold?: number; silver?: number } | null;
  bushin?: string;
}

export interface MissileInfo { id: number; CrowdControlType?: number; DealDamageEffectID?: number; [k: string]: number | undefined }

export interface Enemy {
  name: string; typeText: string; types: number[];
  /** battle sprite id: Enemy.DotID, or the EnemyID when that is 0 */
  dot?: number;
  flying: boolean; magic: boolean; boss: boolean;
  hp: number; atk: number; def: number; mdef: number; range: number; wait: number; move: number;
  block: number; targets: number; core: number; weak: number; hpStock: number;
  ability: { id: number; name: string; text: string; rows: RawRow[] } | null;
  missiles: MissileInfo[];
  deadMissiles: MissileInfo[];
  transforms: RawRow[];
}

export interface EnemyTarget { all?: boolean; groups?: number[][]; flying?: boolean }

export interface EnemyData {
  types: Record<string, string>;
  targets: Record<string, EnemyTarget>;
  enemies: Record<string, Enemy>;
}

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });
export const useStages = () => useJson<StageEntry[]>(loader, "stages");
export const useStage = (id: number | null) => useJson<StageDetail>(loader, id == null ? null : `stage/${id}`);
export const useEnemies = () => useJson<EnemyData>(loader, "enemies");
export const useEvents = () => useJson<GameEvent[]>(loader, "events");

/** Enemy battle sprite, one standing frame (tools/export_enemy_images.py). */
export const enemyImage = (dot: number) => `${import.meta.env.BASE_URL}enemy-icon/${dot}.webp`;

/** Map background (tools/export_stage_images.py). */
export const mapImage = (map: number) => `${import.meta.env.BASE_URL}stage-map/${map}.webp`;

export const GROUPS: { k: StageGroup; label: string; jp: string }[] = [
  { k: "enma", label: "Enma", jp: "閻魔" },
  { k: "hel", label: "Hel", jp: "ヘル" },
  { k: "osiris", label: "Osiris", jp: "オシリス" },
  // ハデスの死闘場 (Event.atb): its stages are the 深淵 (Abyss) ones
  { k: "hades", label: "Hades", jp: "ハデス・深淵" },
  { k: "bushin", label: "Bushin", jp: "武神" },
  { k: "story", label: "Main story", jp: "" },
  // Event.atb titles: 第2部「夢幻航海」 (type 11), 天魔大乱 (13), 群雄割拠 (18: 大坂の陣)
  { k: "voyage", label: "Voyage", jp: "夢幻航海" },
  { k: "tenma", label: "Tenma", jp: "天魔大乱" },
  { k: "osaka", label: "Osaka", jp: "大坂の陣・群雄割拠" },
  // Event.atb types 14 (絢爛御殿・平, …) and 17 (四季御殿・春, …)
  { k: "palace", label: "Palace", jp: "御殿" },
  { k: "events", label: "Events", jp: "イベント" },
  { k: "other", label: "Other", jp: "" },
];

/** Entry Wait is in frames; the battle runs at 30 per second (DAT_00c6d97c). */
export const frameSec = (f: number) => Math.round((f / 30) * 10) / 10;

/** EnemyAbility rows in Ability.atb's shape: AbilityEffectType is a UnitEffectID (every row), the
 *  detail type/value are the ability condition kind and its parameter (same codes as AbilityTypeDetail). */
export function enemyAbilityRows(rows: RawRow[]): RawRow[] {
  return rows.map((r) => {
    const o: RawRow = { AbilityType: 1 };
    if (r.AbilityTargetType) o.AbilityTargetType = r.AbilityTargetType;
    if (r.AbilityAreaType) o.AbilityAreaType = r.AbilityAreaType;
    if (r.AbilityEffectType) o.UnitEffectID = r.AbilityEffectType;
    if (r.AbilityDetailType) o.AbilityTypeDetail = r.AbilityDetailType;
    if (r.AbilityDetailValue) o.AbilityEffectDetail = r.AbilityDetailValue;
    for (const k of ["EffectValue", "LimitValue", "EachGrowUp", "Passive"]) if (r[k]) o[k] = r[k];
    return o;
  });
}

/** MapEffect rows with TargetType/AreaType 0 continue the target of the row above. */
export function withTargets(rows: RawRow[]): RawRow[] {
  let tg = 0, ar = 0;
  return rows.map((r) => {
    if (r.TargetType) { tg = Number(r.TargetType); ar = Number(r.AreaType ?? 0); return r; }
    return { ...r, TargetType: tg, AreaType: ar };
  });
}

/** Does a target code select this enemy? null = the code tests something else (a state, a unit kind). */
export function hits(e: Enemy, code: number, targets: Record<string, EnemyTarget>): boolean | null {
  const t = targets[String(code)];
  if (!t) return null;
  if (t.all) return true;
  if (t.flying !== undefined && t.flying !== e.flying) return false;
  return (t.groups ?? []).every((g) => g.some((id) => e.types.includes(id)));
}

export interface EnemyMod extends BuffFact { src: string; text: string }

/** Every stat change the chosen options make on this enemy, plus the enemy-side ones whose target
 *  the page can't test (shown, not applied). */
export function modsFor(e: Enemy, options: SingiOption[], defs: EffectDefs, targets: Record<string, EnemyTarget>) {
  const applied: EnemyMod[] = [];
  const unknown: EnemyMod[] = [];
  /** enemy-side effects with no stat number (immunities, attack properties…), as sentences */
  const notes: { src: string; text: string; sure: boolean }[] = [];
  for (const o of options) {
    for (const r of withTargets(o.rows ?? [])) {
      if (!rowIsEnemySide(r, defs)) continue;
      const h = hits(e, Number(r.TargetType), targets);
      if (h === false) continue;
      const s = describeRow(r, "organized", defs);
      for (const f of s.facts) (h ? applied : unknown).push({ ...f, src: o.name, text: s.text[f.line] ?? "" });
      if (!s.facts.length) for (const t of s.text) notes.push({ src: o.name, text: t, sure: !!h });
    }
  }
  return { applied, unknown, notes };
}

/** Does a MapEffect row target enemies? (its TargetType's name: 敵, an enemy type, …) */
export function rowIsEnemySide(r: RawRow, defs: EffectDefs): boolean {
  return sideOfTarget(defs.labels[`otarget:${r.TargetType}`]?.jp ?? defs.labels[`target:${r.TargetType}`]?.jp) === "enemy"
    && !!r.TargetType;
}

// PreBattleEffectType, named from the deliberation texts whose rows use it: 1 基礎攻撃…低下 (20009, 20014,
// 20016, 20018), 4 基礎射程…低下 (20010, 20011, 20019), 5 基礎巨大化気(と時間)…増加 (20012: its only
// increase row), 6 配置気…増加 (20014, 20015). Types 2, 3 and 7 are used by no deliberation.
const PRE_TYPE: Record<number, string> = {
  1: "base ATK −", 4: "base range −", 5: "base giantify Ki (and time) +", 6: "deploy Ki +",
};

/** A PreBattleEffect row as text: "Melee castle girls: base ATK −50". */
export function preText(r: RawRow, defs: EffectDefs): string {
  const tg = Number(r.TargetType ?? 0);
  const jp = defs.labels[`target:${tg}`]?.jp ?? defs.labels[`otarget:${tg}`]?.jp;
  const who = jp ? (tagEN(jp) ?? (jp === "城娘" ? "castle girls" : jp)) : `target ${tg}`;
  const t = Number(r.PreBattleEffectType ?? 0);
  const what = PRE_TYPE[t] ? `${PRE_TYPE[t]}${r.EffectValue ?? 0}` : `pre-battle effect ${t}: ${r.EffectValue ?? 0}`;
  return `${who.charAt(0).toUpperCase()}${who.slice(1)}: ${what}`;
}

/** Game text markup: %c[rrggbb] colour switches. */
export const plainText = (s: string) => s.replace(/%c\[[0-9a-fA-F]{6}\]/g, "");

/** Status codes of the stats shown in the enemy table. */
export const STAT = { hp: "status:101", atk: "status:202", def: "status:301", mdef: "status:304", range: "status:205", move: "status:401" } as const;

/** One stat after the changes: plain % changes keep only the strongest increase and the strongest
 *  decrease ("doesn't stack", FUN_00549240), stacking % kinds and multipliers add up, flat values add. */
export function applyStat(base: number, mods: EnemyMod[]): number {
  let upMax = 0, downMax = 0, sum = 0, flat = 0;
  for (const m of mods) {
    const sign = m.dir === "+" ? 1 : -1;
    if (m.unit === "%" || m.unit === "×") {
      const pct = m.unit === "×" ? Math.abs(m.v - 1) * 100 : m.v;
      if (m.stack === "doesn't stack") {
        if (sign > 0) upMax = Math.max(upMax, pct); else downMax = Math.max(downMax, pct);
      } else sum += sign * pct;
    } else if (m.unit === "") flat += sign * m.v;
  }
  return Math.max(0, Math.round(base * (1 + (upMax - downMax + sum) / 100) + flat));
}

/** Stage rate (攻撃/耐久/防御補正 %), 0 = unchanged. */
export const rate = (r: number | undefined) => (r ? r / 100 : 1);
