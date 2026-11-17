// Immunities of an enemy, as short chips for the stage page, read off its decoded ability sentences
// (describeRow: ImmunityEffect rows = UnitEffect type 7, plus the 状態異常 immunity list).
//   own:    what the enemy itself shrugs off ("Self: immune to ATK decreases (%)" -> "ATK ↓")
//   blocks: what it denies castle girls ("Castle girl side units in range: immune to ATK increases")
//   gives:  immunities it hands other enemies ("Enemy army units in range: immune to ATK decreases")

import { effectJaCached } from "./effectsJa";

export interface Chip { en: string; ja: string; key: string; down: boolean }

/** The Japanese chip: the clause worded by effectsJa without its trailing 無効 ("攻撃低下"), else English. */
function ja(clause: string, en: string): string {
  const j = effectJaCached(clause);
  return j && !/[A-Za-z]{3}/.test(j) ? j.replace(/無効(\([^)]*\))?$/, "") : en;
}

const KIND = / \((?:%|flat|×)\)$/;

function chip(frag: string): Chip | null {
  const f = frag.trim();
  if (/^knockback\b/.test(f)) return { en: "Knockback", ja: "後退", key: "knockback", down: true };
  if (/^stop$/.test(f)) return { en: "Stop", ja: "停止", key: "stop", down: true };
  const m = /^(.+?) (decreases|increases)/.exec(f.replace(KIND, ""));
  if (m) {
    const en = `${m[1]} ${m[2] === "decreases" ? "↓" : "↑"}`;
    return { en, ja: ja(`immune to ${m[1]} ${m[2]}`, en), key: `${m[1]}|${m[2]}`, down: m[2] === "decreases" };
  }
  const s = /^(.+?) being set to a fixed value$/.exec(f);
  if (s) return { en: `${s[1]} set`, ja: ja(`immune to ${s[1]} being set to a fixed value`, `${s[1]} set`), key: `${s[1]}|set`, down: true };
  return null;
}

/** "ATK or DEF being set …" / "ATK and DEF decreases" (merged by src/group.ts) -> one fragment per stat. */
function split(frag: string): string[] {
  const m = /^(.+?) (decreases.*|increases.*|being set to a fixed value)$/.exec(frag);
  if (!m) return [frag];
  return m[1].split(/, | and | or /).map((x) => `${x} ${m[2]}`);
}

/** A receiver on the player's side (castle girls, the lord, weapon groups) rather than other enemies. */
const PLAYER_SIDE = /castle girl|殿側|城娘|\blord\b/i;
const AILMENT = /\b(Paralysis|Confusion|Burn|Poison|Darkness|Freeze|Despair|Silence|Submission)\b/;

/** Chips from an enemy's sentences: its own immunities, the buffs it cancels on castle girls, and the
 *  immunities it gives other enemies. */
export function immunityChips(texts: string[]): { own: Chip[]; blocks: Chip[]; gives: Chip[]; ailments: string[] } {
  const own = new Map<string, Chip>(), blocks = new Map<string, Chip>(), gives = new Map<string, Chip>();
  let ailments: string[] = [];
  for (const line of texts) {
    for (const piece of line.split(" · ")) {
      const colon = piece.indexOf(": ");
      if (colon < 0) continue;
      const who = piece.slice(0, colon), what = piece.slice(colon + 2);
      const self = /^Self$/i.test(who);
      const into = self ? own : PLAYER_SIDE.test(who) ? blocks : gives;
      for (const clause of what.split(/, (?=immune to |can't be stopped)/)) {
        if (/^can't be stopped\b/.test(clause)) { const c = chip("stop"); if (c) into.set(c.key, c); continue; }
        const m = /^immune to (.+)$/.exec(clause);
        if (!m) continue;
        // 状態異常: "immune to Paralysis, Confusion, Burn, …"
        if (self && AILMENT.test(m[1])) {
          ailments = m[1].split(/, | and /).map((x) => x.trim()).filter(Boolean);
          continue;
        }
        for (const frag of split(m[1])) {
          const c = chip(frag);
          if (c) into.set(c.key, c);
        }
      }
    }
  }
  // debuffs it ignores first (what a player plans around), then the buffs it ignores
  const order = (a: Chip, b: Chip) => Number(b.down) - Number(a.down);
  return { own: [...own.values()].sort(order), blocks: [...blocks.values()], gives: [...gives.values()].sort(order), ailments };
}
