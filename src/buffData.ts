// public/data/buffs.json (scripts/buffs.ts) and the words for its effect keys, shared by the buff ranking
// (pages/Buffs.tsx) and the team builder (pages/Team.tsx).
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import { getLang } from "./i18n";
import { clauseJa, hasEnglish } from "./effectsJa";
import type { ReachRule } from "./reach";

/** One row of public/data/buffs.json (scripts/buffs.ts). */
export interface BuffRow {
  u: number;
  /** renovation tier the slot comes from; -1 = every tier */
  t: number;
  sl: string;
  /** "<stat key>|<+|->|<unit>" */
  k: string;
  v: number;
  mx?: number;
  /** grows with no cap (LimitValue 9999+) */
  nc?: 1;
  sd: "a" | "e";
  w: string;
  n?: string;
  st?: 0 | 1 | string;
  nm?: string;
  /** per giantification: mx = v × the giver's highest grade at this tier */
  pg?: 1;
  /** equipment rows (u = weapon id): the castle girls its bonus ability is for */
  sp?: number[];
}
export interface BuffData {
  keys: Record<string, string>;
  rows: BuffRow[];
  /** highest giantification grade per renovation tier, for castle girls where it isn't 5 */
  gm?: Record<string, number[]>;
  /** equipment abilities (sl "equipment", u = weapon id), apart from the castle girls' rows */
  eq?: BuffRow[];
}
/** A castle girl's highest giantification grade at a renovation tier. */
export const giantGrade = (d: BuffData | undefined, u: number, tier: number) => {
  const g = d?.gm?.[u];
  return g ? g[Math.max(0, Math.min(tier, g.length - 1))] : 5;
};

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });

export const useBuffData = () => useJson<BuffData>(loader, "buffs");
/** "a|<receiver>" / "e|<receiver>" -> who it reaches (src/reach.ts) */
export const useReach = () => useJson<Record<string, ReachRule>>(loader, "reach");

const UNIT_TAG: Record<string, string> = { "%": "%", "": "flat", "×": "×", s: "sec", "/s": "per second" };
const UNIT_TAG_JA: Record<string, string> = { "%": "%", "": "固定値", "×": "×", s: "秒", "/s": "毎秒" };
export const HITS = "hits|+|hits";
export function effectLabel(k: string, names: Record<string, string>): string {
  const [key, dir, unit] = k.split("|");
  const en = names[key] ?? key;
  const ja = getLang() === "ja" ? clauseJa(en) : "";
  const name = ja && !hasEnglish(ja) ? ja : en;
  const tag = getLang() === "ja" ? UNIT_TAG_JA[unit] ?? unit : UNIT_TAG[unit] ?? unit;
  // utility effects have no amount: just the name; hit counts likewise
  if (key.startsWith("util:") || k === HITS) return name;
  // "set to" a value: "Targets = (set)"
  if (dir === "=") return `${name} = ${getLang() === "ja" ? "設定" : "set"}${unit === "%" ? " %" : ""}`;
  return `${name} ${dir === "+" ? "↑" : "↓"} ${tag}`;
}

/** Just the effect's name ("ATK", "Damage dealt"), for chips that print the signed amount next to it. */
export function effectName(k: string, names: Record<string, string>): string {
  const key = k.split("|")[0];
  const en = names[key] ?? key;
  const ja = getLang() === "ja" ? clauseJa(en) : "";
  return ja && !hasEnglish(ja) ? ja : en;
}

const fmtNum = (n: number) => String(Math.round(n * 1000) / 1000);
export function fmtAmount(k: string, v: number): string {
  const [, dir, unit] = k.split("|");
  if (k === HITS) return getLang() === "ja" ? `${v}回` : `${v} hits`;
  if (unit === "×") return `×${fmtNum(v)}`;
  if (dir === "=") return `=${fmtNum(v)}${unit === "s" ? "s" : unit}`;
  return `${dir === "+" ? "+" : "−"}${fmtNum(v)}${unit === "s" ? "s" : unit}`;
}
/** The group a slot's effects are applied in. The game builds a stat as: base + equipment stats (flat, merged first),
 *  then groups 1..9 in order (exe FUN_005472b0), each applied to the value the previous one left; inside a group plain %
 *  changes of one stat keep only the strongest increase and decrease (FUN_00547bc0), then flat values are added.
 *  Traced in battle (tools/frida/trace_hook.js, every ATK write per group, 2026-11-24):
 *    [雲耀]鹿児島城 453 +77 (Seven Branch Sword's ATK) = 530 | g1 x1.07 = 567 (its +7%) | g2 +100 (Koga's skill) +70 = 737
 *    | g7 +32% giantification = 972 | g8 x5 (special ability) = 4860, -250 per ally in range = 4610
 *    another unit: g1 x1.07 | g2 +100 (Koga's skill) | g3 +3% (possession) | g7 +18% | g8 x2.2 (Unbounded Edo stratagem)
 *  So: 1 equipment abilities, 2 skills, 3 possession, 7 giantification, 8 stratagems and special abilities.
 *  Not traced: formation skills, class abilities, special attacks, ambush units, on-defeat effects ("unverified"). */
export type Layer = "equipment" | "skill" | "possession" | "stratagem" | "unverified";
export const layerOf = (sl: string): Layer =>
  sl === "equipment" ? "equipment" : sl === "skill" ? "skill" : sl === "possession" ? "possession"
    : sl === "stratagem" || sl === "special" ? "stratagem" : "unverified";
export const STRONGEST_KEY: Record<Layer, "strongestSkill" | "strongestEquipment" | "strongestPossession" | "strongestStratagem" | "strongestOnly"> = {
  skill: "strongestSkill", equipment: "strongestEquipment", possession: "strongestPossession", stratagem: "strongestStratagem",
  unverified: "strongestOnly",
};

/** Utility effects (scripts/buffs.ts UTILITY): the value is how long they last; PERMANENT = no end. */
export const PERMANENT = 1e9;
export const isUtil = (k: string) => k.startsWith("util:");

