// Lord outfits (殿の装束, tools/export_lords.py).
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import type { Ability, RawRow } from "./types";

export interface LordOutfit {
  id: number;
  name: string;
  name_en?: string | null;
  /** TonoText.atb: flavour, then the effect in %c[ffd700] gold */
  text: string;
  /** the outfit's class (Class.atb): stats from level 1 (Initial*) to MaxLevel (Max*), range, attack wait… */
  class: RawRow;
  /** its 殿[...] weapon (WeaponTable, no stats of its own) */
  weapon: number | null;
  ability: Ability | null;
  organized: Ability | null;
  class_ability: Ability | null;
  /** has a sprite at lord-dot/<id>.webp */
  dot?: boolean;
  raw: RawRow;
}

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });
export const useLords = () => useJson<LordOutfit[]>(loader, "lords");
export const lordDotUrl = (id: number) => `${import.meta.env.BASE_URL}lord-dot/${id}.webp`;

const num = (r: RawRow, k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0);

/** A class stat at a level: (Max - Initial) x Lv / MaxLevel + Initial (FUN_0058a430, no card corrections for the lord). */
export function lordStat(c: RawRow, stat: "Health" | "Attack" | "Defense" | "Regeneration", lv: number): number {
  const init = num(c, `Initial${stat}`), max = num(c, `Max${stat}`), cap = num(c, "MaxLevel") || 99;
  return Math.floor(((max - init) * Math.min(lv, cap)) / cap + init);
}

export const lordNum = num;

/** Flat max-HP the outfit's own effect adds to the lord (Ability rows: self, unconditional, StatusModifierType 212
 *  "Max HP +N", e.g. 武将幻装 耐久+3000). */
export function effectHp(o: LordOutfit): number {
  return (o.ability?.effects ?? []).reduce((s, r) => (r.AbilityType === 1 && r.AbilityTargetType === 2
    && r.StatusModifierType === 212 && !r.AbilityTypeDetail ? s + num(r, "EffectValue") : s), 0);
}

/** Game text with %c[rrggbb] colour switches -> segments; gold (ffd700) marks the outfit's effect. */
export function colorSegments(s: string): { text: string; gold: boolean }[] {
  const out: { text: string; gold: boolean }[] = [];
  let gold = false;
  for (const part of s.split(/(%c\[[0-9a-fA-F]{6}\])/)) {
    const m = part.match(/^%c\[([0-9a-fA-F]{6})\]$/);
    if (m) { gold = m[1].toLowerCase() === "ffd700"; continue; }
    if (part) out.push({ text: part, gold });
  }
  return out;
}
