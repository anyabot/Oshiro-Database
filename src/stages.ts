// Stage / enemy data (tools/export_stages.py) and how deliberations (審議) change each enemy.
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import { describeRow, sideOfTarget, targetJp, type BuffFact, type EffectDefs } from "./effects";
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
  /** 配置マス制限 (3xxxx): the Location DeleteFlag bits this option removes */
  mask?: number;
}

/** One Location01.atb point, in the game's 1280x720 space. k = type (ObjectID % 10000 / 100): 0 本陣,
 *  1 赤/青, 2 蔵, 3 building, 4 近接, 5 遠隔, 7 pre-placed unit, 8 配置効果 slot, 9 水上; 11/12/14 undecoded. */
export interface MapSpot {
  id: number; k: number; x: number; y: number;
  /** layer (ObjectID / 10000): exists while the battle has switched to that layout */
  l?: number;
  /** Parameter: Building.atb ID for 蔵 / buildings */
  p?: number;
  /** PlacementEffect.atb ID */
  pe?: number;
  /** DeleteFlag bits: removed by the deliberations whose mask has one of them */
  del?: number;
}

export interface StageSpots {
  spots: MapSpot[];
  /** Entry Type 12: at frame t (30 per second) the map switches to layer n (0 = the base layout) */
  layers?: { t: number; n: number }[];
  /** PlacementEffect.atb rows by ID */
  pe?: Record<string, RawRow[]>;
  buildings?: Record<string, { BuildingType?: number; Health?: number; Defense?: number; BlockCount?: number }>;
  /** GuestUnitConfig: unit placed at the start; diff 1 = normal only, 2 = hard only */
  guests?: { loc: number; card: number; name: string; lv: number; diff?: number }[];
  /** LocationEffectConfig: invisible 配置効果 unit on the spot (99999 配置効果, 99998 猛毒, 99997 水没) */
  hazards?: { loc: number; card: number; name: string }[];
  /** the hazard cards' Ability.atb rows, by CardID */
  hazardRows?: Record<string, RawRow[]>;
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
  spots?: StageSpots | null;
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

/** A series' name for the UI: "Enma 閻魔" in English, "閻魔" in Japanese. */
export function groupLabel(g: { k: StageGroup; label: string; jp: string }, lang: "en" | "ja"): string {
  if (lang === "ja") return g.jp || ({ story: "メインストーリー", other: "その他" } as Record<string, string>)[g.k] || g.label;
  return `${g.label}${g.jp ? ` ${g.jp}` : ""}`;
}

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
    // a blank cell repeats the row above: 防御参照攻撃 names AreaType 4 (部隊) on its first row only
    if (r.TargetType) { tg = Number(r.TargetType); ar = r.AreaType != null ? Number(r.AreaType) : ar; return { ...r, AreaType: ar }; }
    return { ...r, TargetType: tg, AreaType: ar };
  });
}

/** Does a target code select this enemy? null = the code tests something else (a state, a unit kind). */
export function hits(e: Enemy, code: number, targets: Record<string, EnemyTarget>): boolean | null {
  // 14 in a map effect = the opposing side's castle girls (「難攻不落: 敵城娘の被ダメージが減少」): EnemyType 101 敵城娘
  if (code === 14) return e.types.includes(101);
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
  // map effects belong to the player's side: owner-relative codes read from it (14 = 敵城娘)
  return !!r.TargetType && sideOfTarget(targetJp(defs, Number(r.TargetType), true)) === "enemy";
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

/** The game's sortie-menu art (tools/export_sortie.py), by the exe's sprite key. */
export const sortieImage = (key: number) => `${import.meta.env.BASE_URL}sortie/${key}.webp`;

export interface StageCategory {
  k: string; en: string; jp: string;
  /** SortieMenu.aar button (a tall sub-menu card for subs) */
  img?: number;
  /** SortieMenuBgTexture.aar page background */
  bg?: number;
  match: (s: StagePlace) => boolean;
  subs?: StageCategory[];
}

/** What decides a stage's series: enough of a StageEntry or a StageDetail. */
export type StagePlace = Pick<StageEntry, "group" | "tab" | "name" | "live">;

const corridor = (k: string, jp: string, en: string, img: number): StageCategory =>
  ({ k, jp: `${jp}の回廊`, en: `${en} corridor`, img, match: (s) => s.name.startsWith(`${jp}の回廊`) });

/** The quest menu's series, in the game's order, each with the game's own button. A stage belongs to
 *  the first series that matches (Quest.TabType for the ones Event.atb doesn't name); "events" takes the rest. */
export const CATEGORIES: StageCategory[] = [
  { k: "story", en: "Main story", jp: "天下統一", img: 4208, bg: 4361, match: (s) => s.group === "story" },
  { k: "voyage", en: "Voyage", jp: "夢幻航海", img: 4206, bg: 4357, match: (s) => s.group === "voyage" || s.tab === 16 },
  { k: "tenma", en: "Tenma", jp: "天魔大乱", img: 4246, match: (s) => s.group === "tenma" || s.tab === 18 },
  { k: "osaka", en: "Gun'yū Kakkyo", jp: "群雄割拠", img: 4316, match: (s) => s.group === "osaka" },
  {
    k: "hell", en: "Hell", jp: "地獄", img: 4165, match: (s) => ["enma", "hel", "osiris", "hades"].includes(s.group),
    subs: [
      { k: "enma", en: "Enma's Arena", jp: "閻魔の闘技場", img: 4309, bg: 4352, match: (s) => s.group === "enma" },
      { k: "hel", en: "Hel's Playground", jp: "ヘルの遊戯場", img: 4310, bg: 4353, match: (s) => s.group === "hel" },
      { k: "osiris", en: "Osiris' Tribunal", jp: "オシリスの審判場", img: 4311, bg: 4354, match: (s) => s.group === "osiris" },
      { k: "hades", en: "Hades' Death Arena (Abyss)", jp: "ハデスの死闘場", img: 4312, bg: 4359, match: (s) => s.group === "hades" },
    ],
  },
  {
    k: "palace", en: "Kenran Palace", jp: "絢爛御殿", img: 4281, bg: 4358, match: (s) => s.group === "palace" && s.tab !== 25,
    subs: [corridor("hira", "平", "Plain", 4296), corridor("hirayama", "平山", "Hill", 4297), corridor("yama", "山", "Mountain", 4298),
      corridor("mizu", "水", "Water", 4299), corridor("mu", "無", "Void", 4304)],
  },
  {
    k: "seasons", en: "Four Seasons Palace", jp: "四季御殿", img: 4300, bg: 4360, match: (s) => s.group === "palace" && s.tab === 25,
    subs: [corridor("haru", "春", "Spring", 4305), corridor("natsu", "夏", "Summer", 4306), corridor("aki", "秋", "Autumn", 4307),
      corridor("fuyu", "冬", "Winter", 4308)],
  },
  { k: "bushin", en: "Bushin", jp: "武神降臨", img: 4221, match: (s) => s.group === "bushin" },
  { k: "kabuto", en: "Great Helm", jp: "討伐武将大兜", img: 4249, match: (s) => s.tab === 19 },
  { k: "kenranshou", en: "Kenran Crystals", jp: "絢爛晶と導かれし城娘", img: 4294, match: (s) => s.tab === 24 },
  { k: "daily", en: "Daily reprint", jp: "日次復刻", img: 4122, match: (s) => s.tab === 15 },
  { k: "reprint", en: "Reprints", jp: "復刻討伐", img: 4251, match: (s) => s.live && [4, 6, 7].includes(s.tab) },
  { k: "kura", en: "Storehouse defense", jp: "蔵防衛戦", img: 4121, match: (s) => s.tab === 2 },
  { k: "tutorial", en: "Tactics school", jp: "戦術指南所", img: 4203, match: (s) => s.tab === 3 },
  { k: "events", en: "Events", jp: "イベント", bg: 4361, match: () => true },
];

/** The series (and sub-menu entry) a stage is listed under. */
export function categoryOf(s: StagePlace): { cat: StageCategory; sub?: StageCategory } {
  const cat = CATEGORIES.find((c) => c.match(s))!;
  return { cat, sub: cat.subs?.find((x) => x.match(s)) };
}

/** Find a series by its key or by a sub-menu key (old links used ?group=enma). */
export function findCategory(k: string): { cat?: StageCategory; sub?: StageCategory } {
  for (const cat of CATEGORIES) {
    if (cat.k === k) return { cat };
    const sub = cat.subs?.find((x) => x.k === k);
    if (sub) return { cat, sub };
  }
  return {};
}

export const catLabel = (c: StageCategory, lang: "en" | "ja") => (lang === "ja" ? c.jp : `${c.en} ${c.jp}`);

/** data/sortie.json (tools/export_sortie.py): QuestID -> the card the game shows beside its quest list. */
export const useSortie = () => useJson<{ quest: Record<string, number> }>(loader, "sortie");

const KANJI = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** Series whose quest page has tabs (Quest.TabNumber), with the game's tab names. */
export function tabLabel(tab: number, n: number, lang: "en" | "ja"): string | null {
  const ja = lang === "ja";
  switch (tab) {
    case 1: return ["始動編", "征伐編", "魔王編", "覚醒編", "戦闘編", "継承編", "天下編"][n - 1] ?? `${n}`;
    case 16: return n === 7 ? "EX" : ja ? `第${n}章` : `Ch. ${n}`;
    // TabNumber 6 is 異伝 (the game's tab art 6149 reads 「異伝 6章」)
    case 18: return n === 7 ? "EX" : n === 6 ? (ja ? "異伝 第六章" : "Side story ch. 6") : ja ? `第${KANJI[n]}章` : `Ch. ${n}`;
    case 11: case 12: case 13: return ja ? `${KANJI[n]}層` : `Floor ${n}`;
    case 23: case 24: return ja ? `${KANJI[n]}` : `${n}`;
    case 2: return ["要石の巻", "贈物の巻", "金策の巻", "武器の巻", "神娘の巻"][n - 1] ?? `${n}`;
    case 3: return ["初級", "中級", "上級"][n - 1] ?? `${n}`;
    default: return null;
  }
}
