// Totals that only show when an ability's rows are read together.
import type { BuffFact } from "./effects";

export interface Fact extends BuffFact { text: string }

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** "ATK" out of "All castle girls: ATK +12, stacks, …". */
const statOf = (f: Fact) => /:\s(.+?) [+−×]/.exec(f.text)?.[1] ?? f.key;

// a receiver and its narrower groups: "All castle girls" ⊃ "All Plain castle girls",
// "Castle girls in range" ⊃ "Plain castle girls in range", same for "in the formation"
const BASES: [RegExp, (who: string) => boolean][] = [
  [/^All castle girls$/, (w) => /^All .+ castle girls$/.test(w)],
  [/^Castle girls in range$/, (w) => /^.+ castle girls in range$/.test(w)],
  [/^Castle girls in the formation$/, (w) => /^.+ castle girls in the formation$/.test(w)],
];

export function combinedLines(facts: Fact[]): string[] {
  const out: string[] = [];
  const amount = (f: Fact) => f.max ?? f.v;
  const same = (a: Fact, b: Fact) => a.key === b.key && a.dir === b.dir && a.unit === b.unit;

  // 1. stacking bonuses on a group and on a narrower group add up for the narrower group
  for (const [baseRe, isSub] of BASES) {
    const bases = facts.filter((f) => f.side === "ally" && baseRe.test(f.who) && f.stack === "stacks");
    for (const b of bases) {
      const subs = facts.filter((f) => f !== b && isSub(f.who) && same(f, b) && f.stack === "stacks");
      if (!subs.length) continue;
      const sign = b.dir === "+" ? "+" : "−";
      const unit = b.unit === "s" ? "s" : b.unit;
      const capped = b.max != null || subs.some((s) => s.max != null) ? "up to " : "";
      for (const s of subs) out.push(`${s.who}: ${statOf(b)} ${capped}${sign}${fmt(amount(b) + amount(s))}${unit} in total (both rows stack)`);
      if (subs.length > 1) {
        const all = amount(b) + subs.reduce((n, s) => n + amount(s), 0);
        out.push(`In all of those groups at once (e.g. a dual-terrain castle): ${statOf(b)} ${capped}${sign}${fmt(all)}${unit}`);
      }
    }
  }

  // 2. a ladder of attack-bonus multipliers on one condition: all rows whose threshold is met apply, and
  //    they multiply: in all 5 abilities with such a ladder the product matches the text's maximum
  //    (壮大華麗の武芸 ×2.06 = 最大2倍, 幽霊の都 ×1.44 = 1.4倍, 幽冥の都府 ×1.54 = 1.5倍, ハンティング・ハロウィン
  //    ×1.86 = 1.8倍, …ナイト ×2.06 = 2倍), while the sums (×1.75, ×1.37, ×1.44, ×1.64) fall short
  const ladders = new Map<string, { f: Fact; thr: number }[]>();
  for (const f of facts) {
    if (f.key !== "dmg:bonus" || !f.note) continue;
    const m = /^(against enemies with|while own) (.+?) (≤|≥) ([\d.]+)(%?)$/.exec(f.note);
    if (!m) continue;
    const k = `${f.who}|${m[1]}|${m[2]}|${m[3]}|${m[5]}`;
    ladders.set(k, [...(ladders.get(k) || []), { f, thr: Number(m[4]) }]);
  }
  for (const [k, rows] of ladders) {
    if (rows.length < 2) continue;
    const [who, pre, stat, op, pct] = k.split("|");
    const thr = op === "≤" ? Math.min(...rows.map((r) => r.thr)) : Math.max(...rows.map((r) => r.thr));
    const prod = rows.reduce((n, r) => n * r.f.v, 1);
    out.push(`${who}: ×${fmt(prod)} damage in total ${pre} ${stat} ${op} ${thr}${pct} (all ${rows.length} multipliers apply and multiply)`);
  }
  return out;
}
