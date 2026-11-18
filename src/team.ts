// Team builder maths (pages/Team.tsx): which buffs.json rows reach a chosen castle girl from a formation,
// how they add up per effect, and how much each candidate would add.
import type { BuffRow } from "./buffData";
import { groupMatches, type ReachRule, type ReachUnit } from "./reach";

export type Mode = "off" | "def" | "util";

// StatusType numbers by what an increase does for the receiver
const OFF_UP = new Set([202, 203, 205, 206, 208, 209, 210, 212, 213, 214, 219, 220]);
const DEF_UP = new Set([101, 102, 103, 111, 301, 302, 303, 305]);
// slots that don't work by being in the formation: possession (所持) works from the collection, on-defeat
// (撃破時) when she falls
const SKIP_SLOTS = new Set(["possession", "defeat"]);

// utility: Ki coming in (per kill, over time, at once, back on retreat), natural Ki gain, and shorter
// stratagem / Great Magic cooldowns (10104 reuse %, 10101 s, 10102 progress, 10107 first use, 10454 Great Magic)
const KI_GAIN = new Set(["status:10206", "status:10201", "ki:periodic", "ki:natural", "abilitytype:5/2"]);
const COOLDOWN = new Set([10101, 10102, 10104, 10107, 10454]);
export const UTIL_GROUP = (k: string): "ki" | "natural" | "cdr" | null => {
  const [key, dir] = k.split("|");
  if (key === "ki:natural") return dir === "+" ? "natural" : null;
  if (KI_GAIN.has(key)) return dir === "+" ? "ki" : null;
  const s = Number(/^status:(\d+)/.exec(key)?.[1] ?? NaN);
  return COOLDOWN.has(s) && dir === "-" ? "cdr" : null;
};

/** Offense / defense / utility for the team builder, or null (a stat going the bad way, or none of them). */
export function modeOf(r: BuffRow): Mode | null {
  if (SKIP_SLOTS.has(r.sl)) return null;
  const [key, dir] = r.k.split("|");
  const s = Number(/^status:(\d+)/.exec(key)?.[1] ?? NaN);
  const up = dir === "+";
  if (r.sd === "a" && UTIL_GROUP(r.k)) return "util";
  // enemies give more Ki when defeated (撃破時獲得気 on enemies): Ki for the formation
  if (r.sd === "e" && key === "status:10206" && up) return "util";
  if (r.sd === "a") {
    if (key === "dmg:dealt" || key === "dmg:bonus") return up ? "off" : null;
    if (key === "dmg:taken") return up ? null : "def";
    if (key === "abilitytype:10/2") return "def";
    if (s === 207) return up ? null : "off"; // attack gap: shorter is faster
    if (OFF_UP.has(s)) return up ? "off" : null;
    if (DEF_UP.has(s)) return up ? "def" : null;
    return null;
  }
  // debuffs on enemies
  if (key === "dmg:taken") return up ? "off" : null;
  if (key === "dmg:dealt") return up ? null : "def";
  if (s === 301) return up ? null : "off";
  if (s === 202 || s === 206 || s === 205 || s === 401) return up ? null : "def";
  if (s === 207) return up ? "def" : null;
  return null;
}

/** Less weight for narrow effects (vs flying / yokai, splash size…) so the core ones lead. */
const NARROW = new Set([205, 209, 210, 213, 214, 219, 220, 303, 401]);
export function keyWeight(k: string): number {
  const s = Number(/^status:(\d+)/.exec(k)?.[1] ?? NaN);
  return NARROW.has(s) ? 0.5 : 1;
}

export interface TeamUnit extends ReachUnit {
  id: number;
  terrainWords: string[];
}

/** Rows the castle girl gives at a renovation tier: per slot, the highest tier she has reached. */
export function atTier(rows: BuffRow[], tier: number): BuffRow[] {
  const best = new Map<string, number>();
  for (const r of rows) if (r.t >= 0 && r.t <= tier && r.t > (best.get(r.sl) ?? -1)) best.set(r.sl, r.t);
  return rows.filter((r) => r.t < 0 || r.t === best.get(r.sl));
}

/** Giantification is taken at the giver's highest grade (buffData.giantGrade: 3-5 by rarity, 9 for 九龍城砦):
 *  of the rows a skill gives per stage ("at giantification stage N"), only that stage counts, or the nearest
 *  one below it. ("per giantification" rows count × that grade; "only at max giantification" ones as on.) */
export function atMaxGiant(rows: BuffRow[], maxGrade: number): BuffRow[] {
  const stageOf = (r: BuffRow) => Number(/at giantification stage (\d+)/.exec(r.n ?? "")?.[1] ?? NaN);
  const group = (r: BuffRow) => `${r.t}|${r.sl}|${r.nm ?? ""}|${r.k}|${r.w}`;
  const pick = new Map<string, number>();
  for (const r of rows) {
    const s = stageOf(r);
    if (Number.isNaN(s)) continue;
    const g = group(r), cur = pick.get(g);
    // the highest stage up to the max; past it only when nothing is at or below it
    if (cur == null || (s <= maxGrade ? cur > maxGrade || s > cur : cur > maxGrade && s < cur)) pick.set(g, s);
  }
  return rows.filter((r) => { const s = stageOf(r); return Number.isNaN(s) || pick.get(group(r)) === s; });
}

export interface Contribution {
  row: BuffRow;
  giver: number;
  /** the amount used: the most it reaches (its cap, full giantification) */
  v: number;
  /** placement-dependent: in range / in an area */
  near: boolean;
}

/** Which of a giver's rows reach the target; null receivers (unparsed) are left out. */
export function reaching(rows: BuffRow[], giver: number, target: TeamUnit, reach: Record<string, ReachRule>, mode: Mode, grade: number): Contribution[] {
  const out: Contribution[] = [];
  for (const r of rows) {
    if (modeOf(r) !== mode) continue;
    const rule = reach[`${r.sd}|${r.w}`];
    if (!rule || rule.s === "no") continue;
    // Ki and cooldowns help the whole formation whoever they land on: every member's count
    if (mode === "util") {
      out.push({ row: r, giver, v: r.nc ? r.v : r.pg ? r.v * grade : r.mx ?? r.v, near: rule.p === "range" });
      continue;
    }
    if (rule.s === "self" && giver !== target.id) continue;
    if (rule.s === "ally" && ((rule.x && giver === target.id) || !groupMatches(rule, target, target.terrainWords))) continue;
    out.push({ row: r, giver, v: r.nc ? r.v : r.pg ? r.v * grade : r.mx ?? r.v, near: rule.p === "range" || (rule.s === "enemy" && /in range|area|hit|blocks|^Target/.test(r.w)) });
  }
  return out;
}

/** How big a change is, as a positive number (× rows: distance from ×1). */
export function magnitude(k: string, v: number): number {
  const [, dir, unit] = k.split("|");
  if (unit === "×") return dir === "-" ? 1 - v : v - 1;
  return v;
}

/** Total per effect: the strongest non-stacking source, plus every one that says it stacks (× ones multiply).
 *  Within one skill, rows under different conditions add up (九龍城砦: DEF ignore 4% per giantification + 40%
 *  at max = 76%), while rows under the same one are one buff split over overlapping groups (上田城「射程内の城娘と
 *  全ての近接城娘の与ダメージが25%上昇」: +25%, not +50%). "Doesn't stack" is between skills. */
export function total(k: string, list: Contribution[]): number {
  const mult = k.endsWith("|×");
  let stack = mult ? 1 : 0;
  // skill -> condition -> strongest
  const sources = new Map<string, Map<string, number>>();
  // one row from one giver counts once (the same text may come from two tiers of a twin)
  const seen = new Set<string>();
  for (const c of list) {
    const id = `${c.giver}|${c.row.sl}|${c.row.nm ?? ""}|${c.row.w}|${c.row.n ?? ""}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const m = magnitude(k, c.v);
    if (c.row.st === 1) { stack = mult ? stack * (1 + m) : stack + m; continue; }
    const src = `${c.giver}|${c.row.sl}|${c.row.nm ?? ""}`;
    const conds = sources.get(src) ?? new Map<string, number>();
    conds.set(c.row.n ?? "", Math.max(conds.get(c.row.n ?? "") ?? 0, m));
    sources.set(src, conds);
  }
  const sum = (conds: Map<string, number>) => [...conds.values()].reduce((a, m) => (mult ? (1 + a) * (1 + m) - 1 : a + m), 0);
  const best = Math.max(0, ...[...sources.values()].map(sum));
  return mult ? (1 + best) * stack - 1 : best + stack;
}

export function byKey(list: Contribution[]): Map<string, Contribution[]> {
  const m = new Map<string, Contribution[]>();
  for (const c of list) m.set(c.row.k, [...(m.get(c.row.k) || []), c]);
  return m;
}

export interface Gain {
  k: string;
  /** totals before / after (magnitudes) */
  before: number;
  after: number;
  best: Contribution;
  isNew: boolean;
}

/** What a candidate adds over the current team, per effect, and a score to rank by. */
export function gains(current: Map<string, Contribution[]>, mine: Contribution[], focus: Set<string>): { score: number; list: Gain[]; fresh: number } {
  const list: Gain[] = [];
  let score = 0, fresh = 0;
  for (const [k, cs] of byKey(mine)) {
    if (focus.size && !focus.has(k)) continue;
    const cur = current.get(k) || [];
    const before = total(k, cur);
    const after = total(k, [...cur, ...cs]);
    const best = cs.reduce((a, b) => (magnitude(k, b.v) > magnitude(k, a.v) ? b : a));
    const isNew = before <= 0 && after > 0;
    list.push({ k, before, after, best, isNew });
    if (after > before) {
      // the share of the new total she brings, new effects counting extra; range-bound ones a bit less
      const rel = (after - before) / after;
      const near = cs.every((c) => c.near) ? 0.85 : 1;
      score += keyWeight(k) * near * (rel + (isNew ? 0.5 : 0));
      if (isNew) fresh++;
    }
  }
  list.sort((a, b) => Number(b.after > b.before) - Number(a.after > a.before) || Number(b.isNew) - Number(a.isNew) || (b.after - b.before) / (b.after || 1) - (a.after - a.before) / (a.after || 1));
  return { score, list, fresh };
}

/** A magnitude back as a signed amount for display ("+35%", "×1.3"). */
export function amountOf(k: string, m: number): number {
  const [, dir, unit] = k.split("|");
  if (unit === "×") return dir === "-" ? 1 - m : 1 + m;
  return m;
}
