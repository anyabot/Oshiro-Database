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
  [/^Castle girls except self in range$/, (w) => /^.+ castle girls in range$/.test(w) && !/except self/.test(w)],
  [/^Castle girls in the formation$/, (w) => /^.+ castle girls in the formation$/.test(w)],
  // the owner's own ambush units are ambush units too: 60% + 30% = 90% = 「自身の伏兵は加算値1.5倍」
  [/^Ambush units \(伏兵\) in range$/, (w) => /^Own tokens( in range)?$/.test(w)],
];

/** " of the giver's ATK" for an inspire (鼓舞) fact, "" otherwise. */
const ofGiver = (f: Fact) => (f.key.includes("~") ? / of (?:the giver's )?[^,]+/.exec(f.text)?.[0] ?? "" : "");

/** Overlapping-receiver totals as facts: the narrower group's row plus the group row it also gets. */
export function combinedFacts(facts: Fact[]): (Fact & { base: string })[] {
  const out: (Fact & { base: string })[] = [];
  const amount = (f: Fact) => f.max ?? f.v;
  const same = (a: Fact, b: Fact) => a.key === b.key && a.dir === b.dir && a.unit === b.unit;
  const adds = (f: Fact) => f.stack === "stacks" || f.key.includes("~");
  for (const [baseRe, isSub] of BASES) {
    for (const b of facts.filter((f) => f.side === "ally" && baseRe.test(f.who) && adds(f))) {
      for (const s of facts.filter((f) => f !== b && isSub(f.who) && same(f, b) && adds(f))) {
        const total = amount(b) + amount(s);
        out.push({ ...s, v: total, max: undefined, base: b.who, note: `total with the "${b.who}" row (${fmt(amount(b))} + ${fmt(amount(s))})` });
      }
    }
  }
  return out;
}

export function combinedLines(facts: Fact[]): string[] {
  const out: string[] = [];
  const amount = (f: Fact) => f.max ?? f.v;
  const same = (a: Fact, b: Fact) => a.key === b.key && a.dir === b.dir && a.unit === b.unit;

  // 1. stacking bonuses on a group and on a narrower group add up for the narrower group. The exe's
  //    in-battle merge (FUN_00549240 sorts entries, FUN_00547bc0 applies them) sums flat (ValueType 1)
  //    changes of one status except those in effects.tsx FLAT_MAX_STATUS, and sums ValueType 3/4/5; only
  //    rows the decoder marks "stacks" are combined here
  for (const [baseRe, isSub] of BASES) {
    // inspire rows (% of the giver's stat) add up too: 寿ぐ真夏の大波 60% + 30% = 90% = 「[夏]は加算値1.5倍」
    const adds = (f: Fact) => f.stack === "stacks" || f.key.includes("~");
    const bases = facts.filter((f) => f.side === "ally" && baseRe.test(f.who) && adds(f));
    for (const b of bases) {
      const subs = facts.filter((f) => f !== b && isSub(f.who) && same(f, b) && adds(f));
      if (!subs.length) continue;
      const sign = b.dir === "+" ? "+" : "−";
      const unit = b.unit === "s" ? "s" : b.unit;
      const capped = b.max != null || subs.some((s) => s.max != null) ? "up to " : "";
      for (const s of subs) out.push(`${s.who}: ${statOf(b)} ${capped}${sign}${fmt(amount(b) + amount(s))}${unit}${ofGiver(b)} in total (both rows stack)`);
      if (subs.length > 1) {
        const all = amount(b) + subs.reduce((n, s) => n + amount(s), 0);
        out.push(`In all of those groups at once (e.g. a dual-terrain castle): ${statOf(b)} ${capped}${sign}${fmt(all)}${unit}`);
      }
    }
  }

  // 2. a ladder of attack-bonus multipliers on one condition: every row whose condition holds applies, and
  //    they multiply. The exe: FUN_00546f40(attacker, target) walks the attacker's attack-bonus entries and,
  //    for each whose condition passes (FUN_00af9bf0), sets total = bonus * total / 100 (integer percent,
  //    truncated each step); the damage formula FUN_004cd680 then does damage * total / 100.
  //    壮大華麗の武芸: 109 → 117 → 126 → 136 → 146 → 157 → 169 → 184 → 200 = its text's 最大2倍
  const ladders = new Map<string, { f: Fact; thr: number }[]>();
  // every-hit bonuses (a condition that always holds, e.g. own HP ≤ 100%) pass too, so they multiply into
  // every total of the same receiver: 白色の城 107 (every hit) × 6 HP steps = 160 = 最大1.6倍
  const always = new Map<string, number[]>();
  for (const f of facts) if (f.key === "dmg:bonus" && f.note === "every hit") always.set(f.who, [...(always.get(f.who) || []), f.v]);
  for (const f of facts) {
    if (f.key !== "dmg:bonus" || !f.note) continue;
    const m = /^(against enemies with|while own) (.+?) (≤|≥) ([\d.]+)(%?)$/.exec(f.note);
    if (!m) continue;
    const k = `${f.who}|${m[1]}|${m[2]}|${m[3]}|${m[5]}`;
    ladders.set(k, [...(ladders.get(k) || []), { f, thr: Number(m[4]) }]);
  }
  // the game's own arithmetic: integer percent, truncated after each multiplication, in row order
  const mult = (vs: number[]) => vs.reduce((t, v) => (t ? Math.trunc((Math.round(v * 100) * t) / 100) : Math.round(v * 100)), 0);
  const perWho = new Map<string, number[]>();
  for (const [k, rows] of ladders) {
    const owner = k.split("|")[0];
    perWho.set(owner, [...(perWho.get(owner) || []), ...rows.map((r) => r.f.v)]);
    if (rows.length < 2) continue;
    const [who, pre, stat, op, pct] = k.split("|");
    const thr = op === "≤" ? Math.min(...rows.map((r) => r.thr)) : Math.max(...rows.map((r) => r.thr));
    const extra = always.get(who) ?? [];
    const total = mult([...extra, ...rows.map((r) => r.f.v)]);
    out.push(`${who}: ×${fmt(total / 100)} damage in total ${pre} ${stat} ${op} ${thr}${pct} (all ${rows.length + extra.length} multipliers apply and multiply)`);
  }
  // several ladders (「敵の耐久/移動速度が低い程」: one on HP, one on move speed) all multiply into one total
  for (const [who, vs] of perWho) {
    const ladderCount = [...ladders.keys()].filter((k) => k.startsWith(`${who}|`) && ladders.get(k)!.length > 1).length;
    const extra = always.get(who) ?? [];
    if (ladderCount > 1) out.push(`${who}: ×${fmt(mult([...extra, ...vs]) / 100)} damage with every condition met (all ${vs.length + extra.length} multipliers)`);
  }
  return out;
}
