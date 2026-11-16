// Castle girl stats at a level / renovation / giantification, as the game computes them (decoded from the exe;
// growth.json comes from tools/export_growth.py):
//   corrections  Card *Correction + RenovationType points (FUN_00589d40): 改 -> effective ★ = ★+1 (max 8),
//                ★1-3 Low / ★4+ High points; 改壱 -> ★9, High points. Regeneration gets no renovation points.
//   base         ((Max − Initial) × Lv / Class.MaxLevel + Initial) × correction / 100, integer (FUN_0058a430);
//                Lv ≥ 126: × (1 + ExtraUnitLevel % / 100)
//   always       the tier's always ability (HP/ATK/DEF %, range flat) applies next (FUN_00588920 order)
//   giantify     grade g: X += X × rate / 100, rate = (100g / 5) × GrowUp % / 100 (FUN_00abae50);
//                Card.GrowUpLimitType ≥ 1000 uses GrowUpSpecial's per-grade % instead
//   level cap    min(Rarity[effective ★].LevelCap, Class.MaxLevel) + 10 per limit break, max 150 (FUN_00ab7660)
//   cost         Class.Cost + 2 when the tier has a stratagem (+1 once renovated) (FUN_00587960)
//   giantify Ki  cost × GrowUpConfig.KiConsumeRate(g) / 100, + cost again for the last grade (最大化) (FUN_004fa5f0)
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import type { RawRow } from "./types";

export interface Growth {
  rarity: Record<string, [number, number]>;
  reno: Record<string, [number, number, number, number, number, number]>;
  growUp: Record<string, [number, number, number, number, number]>;
  growUpSpecial: Record<string, [number, number, number, number, number, number, number][]>;
  kiRate: Record<string, number>;
  extraLevel: [number, number, number, number, number][];
}

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });
export const useGrowth = () => useJson<Growth>(loader, "growth");

/** 0 base, 1 改 (★+1), 2 改壱 (★9) */
export type Reno = 0 | 1 | 2;
export const MAX_LEVEL = 150;

export interface SimInput {
  card: RawRow;
  cls: RawRow;
  reno: Reno;
  level: number;
  limitBreaks: number;
  grade: number;
  /** the tier's always ability rows (EffectType / EffectValue) */
  always: RawRow[];
  /** the tier has a stratagem (計略) */
  stratagem: boolean;
  /** potential (潜在) rows unlocked by the limit breaks: EffectType / EffectValue */
  potentials?: RawRow[];
}

const n = (r: RawRow | null | undefined, k: string) => Number(r?.[k] ?? 0) || 0;
const idiv = (a: number, b: number) => (b ? Math.trunc(a / b) : 0);

export function effectiveRarity(card: RawRow, reno: Reno): number {
  const r = n(card, "Rarity");
  return reno === 2 ? 9 : reno === 1 ? Math.min(r + 1, 8) : r;
}

export function levelCap(g: Growth, card: RawRow, cls: RawRow, reno: Reno, limitBreaks: number): number {
  const rc = g.rarity[String(effectiveRarity(card, reno))]?.[0] ?? MAX_LEVEL;
  const cm = n(cls, "MaxLevel") || MAX_LEVEL;
  return Math.min(Math.min(rc, cm) + 10 * limitBreaks, MAX_LEVEL);
}

/** Highest giantification grade: GrowUpSpecial rows, else Card.GrowUpLimitType 1-4, else Rarity.GrowUpLimit. */
export function maxGrade(g: Growth, card: RawRow, reno: Reno): number {
  const type = n(card, "GrowUpLimitType");
  if (type >= 1000) return g.growUpSpecial[String(type)]?.length ?? 0;
  if (type >= 1 && type <= 4) return type;
  return g.rarity[String(effectiveRarity(card, reno))]?.[1] ?? 5;
}

/** [HP, ATK, DEF, Regen, Range] % gained at a grade. */
export function growthRates(g: Growth, card: RawRow, grade: number): number[] {
  if (grade <= 0) return [0, 0, 0, 0, 0];
  const type = n(card, "GrowUpLimitType");
  if (type >= 1000) {
    const row = g.growUpSpecial[String(type)]?.find((r) => r[0] === grade);
    return row ? row.slice(1, 6) : [0, 0, 0, 0, 0];
  }
  const total = g.growUp[String(n(card, "GrowUpID"))] ?? g.growUp["0"];
  const f = idiv(100 * grade, 5);
  return total.map((x) => idiv(f * x, 100));
}

export function unitCost(cls: RawRow, reno: Reno, stratagem: boolean): number {
  return n(cls, "Cost") + (stratagem ? (reno ? 1 : 2) : 0);
}

/** Ki to giantify into each grade 1..max (the last one is 最大化); `cut` = flat reduction (潜在 巨大化気軽減). */
export function giantKi(g: Growth, card: RawRow, cost: number, reno: Reno, cut = 0): number[] {
  const max = maxGrade(g, card, reno);
  const type = n(card, "GrowUpLimitType");
  const out: number[] = [];
  for (let grade = 1; grade <= max; grade++) {
    const rate = type >= 1000
      ? g.growUpSpecial[String(type)]?.find((r) => r[0] === grade)?.[6] ?? 0
      : g.kiRate[String(grade)] ?? 0;
    out.push(Math.max(0, idiv(cost * rate, 100) + (grade === max ? cost : 0) - cut));
  }
  return out;
}

export interface SimResult {
  hp: number; atk: number; def: number; regen: number; range: number;
  /** deploy Ki (配置気, after 潜在 cuts) and the giantify base cost (without them, FUN_00587960 param 4 = 0) */
  cost: number; giantBase: number; giantCut: number; atkSpeed: number;
  cap: number; maxGrade: number; rarity: number;
  corrections: { hp: number; atk: number; def: number; regen: number };
  growth: number[];
  /** always-ability rows the simulator applied (EffectType) */
  applied: number[];
}

// always-ability EffectTypes on the castle girl's own stats: 1001 HP %, 1011 ATK %, 1021 DEF %, 1012 range +flat
const ALWAYS_PCT: Record<number, "hp" | "atk" | "def"> = { 1001: "hp", 1011: "atk", 1021: "def" };

export function simulate(g: Growth, s: SimInput): SimResult {
  const { card, cls } = s;
  const rarity = effectiveRarity(card, s.reno);
  const pts = s.reno ? g.reno[String(n(card, "RenovationType"))] : undefined;
  const high = s.reno === 2 || rarity >= 4;
  const add = (i: number) => (pts ? pts[high ? i + 3 : i] : 0);
  const corr = {
    hp: n(card, "HealthCorrection") + add(0),
    atk: n(card, "AttackCorrection") + add(1),
    def: n(card, "DefenseCorrection") + add(2),
    regen: n(card, "RegenerationCorrection"),
  };
  const cap = levelCap(g, card, cls, s.reno, s.limitBreaks);
  const lv = Math.max(1, Math.min(s.level, cap));
  const maxLv = n(cls, "MaxLevel") || 1;
  const extra = [...g.extraLevel].reverse().find((r) => r[0] <= lv);
  const base = (init: string, max: string, c: number, ei: number) => {
    let v = idiv((idiv((n(cls, max) - n(cls, init)) * lv, maxLv) + n(cls, init)) * c, 100);
    if (extra && extra[ei] > 0) v = Math.trunc((extra[ei] / 100 + 1) * v);
    return v;
  };
  const st = {
    hp: base("InitialHealth", "MaxHealth", corr.hp, 1),
    atk: base("InitialAttack", "MaxAttack", corr.atk, 2),
    def: base("InitialDefense", "MaxDefense", corr.def, 3),
    regen: base("InitialRegeneration", "MaxRegeneration", corr.regen, 4),
    range: n(cls, "AttackRange"),
  };
  // always ability + potentials: % on the same stat add up, applied once before giantification
  const applied: number[] = [];
  const pct = { hp: 0, atk: 0, def: 0 };
  let deployCut = 0, giantCut = 0, atkSpeed = 0;
  for (const [i, r] of [...s.always, ...(s.potentials ?? [])].entries()) {
    const t = n(r, "EffectType"), v = n(r, "EffectValue");
    const k = ALWAYS_PCT[t];
    const mine = i < s.always.length;
    if (k) pct[k] += v;
    else if (t === 1012) st.range += v;
    else if (t === 4043) deployCut += v;
    else if (t === 4042) giantCut += v;
    else if (t === 3011) atkSpeed += v;
    else continue;
    if (mine) applied.push(t);
  }
  for (const k of ["hp", "atk", "def"] as const) st[k] += idiv(st[k] * pct[k], 100);
  const mg = maxGrade(g, card, s.reno);
  const grade = Math.max(0, Math.min(s.grade, mg));
  const gr = growthRates(g, card, grade);
  const grow = (v: number, rate: number) => v + idiv(v * rate, 100);
  const giantBase = unitCost(cls, s.reno, s.stratagem);
  const cost = Math.max(0, giantBase - deployCut);
  return {
    hp: grow(st.hp, gr[0]), atk: grow(st.atk, gr[1]), def: grow(st.def, gr[2]), regen: grow(st.regen, gr[3]),
    range: grow(st.range, gr[4]), cost, giantBase, giantCut, atkSpeed, cap, maxGrade: mg, rarity, corrections: corr, growth: gr, applied,
  };
}
