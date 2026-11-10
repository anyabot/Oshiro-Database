// Merges effect sentences that say the same thing twice, so a list reads as few lines as it can:
//   same receiver, same change, different stats
//     "Self: Physical damage reduction set to 50%" + "Self: Magic damage reduction set to 50%"
//     → "Self: Physical and magic damage reduction set to 50%"
//   same change, different receivers
//     "Shield castle girls: ATK set to 0" + "Sword castle girls: ATK set to 0"
//     → "Shield and Sword castle girls: ATK set to 0"
// Two identical sentences are kept apart: two rows that stack are two changes, not one.

export interface Line {
  text: string;
  /** Indexes of the rows the line came from. */
  rows: number[];
}

const RECEIVER = /^([^:;·]+?): (.+)$/s;
// the stat name ends where its amount starts
const STAT = /^([A-Za-z][A-Za-z '&()-]*?) ((?:set to |up to )?[+−×]?[\d.]|set to )(.*)$/s;
const IMMUNE = /^(immune to |can't be stopped \(immune to )(.+?)( being set to .*)$/s;

// words that start a receiver or stat but read lowercase in the middle of a list
const COMMON = new Set(["All", "Castle", "Ambush", "Enemies", "Enemy", "Own", "Units", "Unit", "Storehouses", "Yokai", "Flying",
  "Target", "The", "Self", "Physical", "Magic", "Attack", "Damage", "Move", "Time", "Regen", "Range", "Block", "Targets", "Stratagem",
  "Special", "Direct-hit", "Anti-air", "Each", "Blast", "Max", "Lord", "Boats", "Tokens", "Splash", "Giantify", "Auto-giantify", "HP"]);
// except where the capital is part of a name
const KEEP = /^(Flying Kabuto|Special \d|Special enemies|Special attack|Magic castle girls|Enemy Castle Girl|HP\b)/;

const lower = (s: string) => {
  const w = s.split(" ")[0];
  return COMMON.has(w) && !KEEP.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
};

/** "A", "A and B", "A, B and C" (later items lowercased where they are ordinary words). */
export function listJoin(items: string[]): string {
  const xs = items.map((x, i) => (i ? lower(x) : x));
  return xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const words = (s: string) => s.split(" ");

/** Stat names as one phrase: shared leading and trailing words said once. */
function joinStats(stats: string[]): string {
  const ws = stats.map(words);
  let pre = 0;
  while (ws.every((w) => w.length > pre + 1 && w[pre] === ws[0][pre])) pre++;
  let suf = 0;
  while (ws.every((w) => w.length > pre + suf + 1 && w[w.length - 1 - suf] === ws[0][ws[0].length - 1 - suf])) suf++;
  const heads = ws.map((w) => w.slice(pre, w.length - suf).join(" "));
  const front = ws[0].slice(0, pre).join(" "), back = suf ? ws[0].slice(-suf).join(" ") : "";
  return [front, listJoin(heads), back].filter(Boolean).join(" ");
}

/** Receivers as one phrase: "Shield, Sword and Spear castle girls in range", "Great Magic, all castle
 *  girls and the lord (殿)". */
function joinReceivers(whos: string[]): string {
  // a shared leading clause ("Great Magic, ") is said once
  let lead = "";
  const firsts = whos.map((w) => (/^([^,]+), (.+)$/.exec(w) ?? [])[1]);
  if (firsts[0] && firsts.every((f) => f === firsts[0])) {
    lead = `${firsts[0]}, `;
    whos = whos.map((w) => w.slice(lead.length));
  }
  // the same kind of receiver for different traits: "<trait> castle girls<where>"
  const m = whos.map((w) => /^(?!All )(.+?) (castle girls(?: in range| in the formation)?|enemies(?: in range)?)$/.exec(w));
  if (m.every((x) => x && x[2] === m[0]![2])) {
    const traits = m.map((x) => x![1]);
    // "Castle girls in range" has no trait: it already covers the rest, so it can't be merged that way
    if (traits.every((t) => !/^(Castle|Own|All)$/.test(t))) return `${lead}${traits.join(", ").replace(/, ([^,]+)$/, " and $1")} ${m[0]![2]}`;
  }
  // the lord is named two ways by the tables ("Lord (殿) in range", "the lord (殿) in range")
  whos = whos.map((w) => w.replace(/^Lord \(殿\)/, "The lord (殿)"));
  // a shared "in range" is said once: "Castle girls, the lord (殿) and ambush units (伏兵) in range"
  let tail = "";
  const where = / in (range|the formation|the area)$/.exec(whos[0])?.[0];
  if (where && whos.every((w) => w.endsWith(where) && w.length > where.length)) {
    tail = where;
    whos = whos.map((w) => w.slice(0, -where.length));
  }
  const all = whos.map((w) => /^All (.+)$/.exec(w)?.[1]);
  if (all.every(Boolean) && whos.length > 2) return `${lead}All ${listJoin(all as string[])}${tail}`;
  return lead + listJoin(whos) + tail;
}

interface Parsed { who: string; eff: string; stat?: string; amount?: string; rows: number[]; text: string }

function parse(l: Line): Parsed {
  const m = RECEIVER.exec(l.text);
  if (!m) return { who: "", eff: l.text, rows: l.rows, text: l.text };
  const [, who, eff] = m;
  const i = IMMUNE.exec(eff);
  if (i) return { who, eff, stat: i[2], amount: `\u0000${i[1]}\u0000${i[3]}`, rows: l.rows, text: l.text };
  const s = STAT.exec(eff);
  if (s && !/[;·]/.test(s[1])) return { who, eff, stat: s[1], amount: s[2] + s[3], rows: l.rows, text: l.text };
  return { who, eff, rows: l.rows, text: l.text };
}

const rebuild = (p: Parsed) => (p.who ? `${p.who}: ${p.eff}` : p.eff);

/** Merge in place, by key; a merged group takes the place of its first line. */
function mergeBy(ps: Parsed[], key: (p: Parsed) => string | undefined, part: (p: Parsed) => string,
  join: (parts: string[], first: Parsed) => Parsed, ok: (parts: string[]) => boolean = () => true): Parsed[] {
  const groups = new Map<string, Parsed[]>();
  for (const p of ps) {
    const k = key(p);
    if (k == null) continue;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const out: Parsed[] = [];
  const done = new Set<Parsed>();
  for (const p of ps) {
    if (done.has(p)) continue;
    const k = key(p);
    const g = k == null ? [p] : groups.get(k)!;
    // only distinct parts merge: the same sentence twice is two changes
    const parts = g.map(part);
    if (g.length < 2 || new Set(parts).size !== parts.length || !ok(parts)) { out.push(p); done.add(p); continue; }
    g.forEach((x) => done.add(x));
    const j = join(parts, p);
    out.push({ ...j, rows: [...new Set(g.flatMap((x) => x.rows))].sort((a, b) => a - b) });
  }
  return out;
}

// a receiver that contains the others ("Castle girls in range" ⊃ "Halloween castle girls in range"): the
// narrower group gets both rows, which one merged line would hide (combine.ts totals them instead)
const WHOLE: [RegExp, RegExp][] = [
  [/^(all )?castle girls( except self)?( in range| in the formation| in the area)?$/i, /castle girls/i],
  [/^(all )?enemies( in range)?$/i, /enemies|kabuto|yokai/i],
];
const disjoint = (whos: string[]) => {
  const bare = whos.map((w) => w.replace(/^[^,]+, /, ""));
  return !WHOLE.some(([whole, part]) => bare.some((w, i) => whole.test(w) && bare.some((x, j) => j !== i && part.test(x))));
};

export function groupLines(lines: Line[]): Line[] {
  let ps = lines.map(parse);
  // 1. same receiver and change, different stats
  ps = mergeBy(ps, (p) => (p.stat ? `${p.who}\u0001${p.amount}` : undefined), (p) => p.stat!, (stats, p) => {
    const stat = joinStats(stats);
    const imm = p.amount!.startsWith("\u0000") ? p.amount!.split("\u0000") : null;
    const eff = imm ? `${imm[1]}${stat.replace(" and ", " or ")}${imm[2]}` : `${stat} ${p.amount}`;
    return { ...p, stat: undefined, eff, text: "" };
  });
  // 2. same change, different receivers
  ps = mergeBy(ps, (p) => (p.who ? p.eff : undefined), (p) => p.who, (whos, p) => ({ ...p, who: joinReceivers(whos), text: "" }), disjoint);
  return ps.map((p) => ({ text: rebuild(p), rows: p.rows }));
}

/** Each row's sentences, grouped across rows; a row's own sentences that stayed apart are joined with
 *  " · " on one line again, and a row with none keeps its place as "". */
export function groupRows(rows: string[][]): Line[] {
  const lines = groupLines(rows.flatMap((t, i) => (t.length ? t : [""]).map((text) => ({ text, rows: [i] }))));
  const out: Line[] = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    if (prev && l.rows.length === 1 && prev.rows.length === 1 && prev.rows[0] === l.rows[0] && l.text && prev.text) prev.text += ` · ${l.text}`;
    else out.push({ ...l });
  }
  return out;
}

/** groupLines over plain strings. */
export const groupTexts = (texts: string[]): string[] => groupLines(texts.map((text, i) => ({ text, rows: [i] }))).map((l) => l.text);
