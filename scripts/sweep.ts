// Runs the site's own effect describer over every effect row of every castle girl and
// reports what is still undecoded, ranked by how many distinct abilities it affects.
//   node scripts/sweep.mjs   (built from this file by `npm run sweep`)
// Writes tools/out/sweep.md.
import fs from "node:fs";
import path from "node:path";
import { describeRow, rowBases, type EffectDefs, type RowKind } from "../src/effects";
import type { Ability, FieldLink, RawRow, UnitDetail, UnitIndexEntry } from "../src/types";

const root = path.resolve(process.argv[2] ?? ".");
const data = (p: string) => JSON.parse(fs.readFileSync(path.join(root, "public/data", p), "utf8"));
const defs: EffectDefs = data("effects.json");
const index: UnitIndexEntry[] = data("units.json");

// fields that only pick visuals / sounds / UI, never game effect
const COSMETIC = /Effect$|TextureID|Texture$|SE$|Voice|Indicator|MotionID|DotIndex|^Passive$|GuideLine|Strategy/;
// raw codes the describer leaves in a sentence when it has no name for them
const RAW = /\b(stat|ability type|effect|enchant|target|area|modifier|flag|unit effect) \d+(\/\d+)?|value type \d+|\(not decoded\)|\(no decoded effect\)|expr\d|op\d/g;

interface Hit { abilities: Set<string>; rows: number; examples: string[] }
const gaps = new Map<string, Hit>();
const note = (key: string, abilityKey: string, example: string) => {
  let h = gaps.get(key);
  if (!h) gaps.set(key, (h = { abilities: new Set(), rows: 0, examples: [] }));
  h.rows++;
  if (!h.abilities.has(abilityKey) && h.examples.length < 3) h.examples.push(example);
  h.abilities.add(abilityKey);
};

let rowsTotal = 0, rowsClean = 0;
const seen = new Set<string>();

function sweepRows(rows: RawRow[] | undefined, kind: RowKind, who: string, ctx: { name?: string; description?: string }, links?: Record<string, FieldLink>) {
  if (!rows) return;
  const abilityKey = `${kind}:${who}`;
  if (seen.has(abilityKey)) return;
  seen.add(abilityKey);
  const bases = rowBases(rows);
  rows.forEach((r, i) => {
    rowsTotal++;
    const { text, rest } = describeRow(r, kind, defs, links?.[String(i)], bases[i]);
    const sentence = text.join(" · ");
    const desc = (ctx.description ?? "").replace(/\n/g, " ").slice(0, 90);
    const example = `${who} ${ctx.name ?? ""} — "${sentence}" — ${desc}`;
    let clean = true;
    for (const m of sentence.matchAll(RAW)) { note(`${kind} · ${m[0].replace(/\d+$/, (n) => n)}`, abilityKey, example); clean = false; }
    for (const k of Object.keys(rest)) {
      if (COSMETIC.test(k)) continue;
      note(`${kind} · unused field ${k}`, abilityKey, `${example} [${k}=${rest[k]}]`);
      clean = false;
    }
    if (clean) rowsClean++;
  });
}

function sweepAbility(a: Ability | null | undefined, kind: RowKind, where: string) {
  if (a && !a.missing) sweepRows(a.effects, kind, `#${a.id}(${where})`, a, a.field_links);
}

for (const entry of index) {
  if (entry.npc && !entry.transform_of) continue;
  const u: UnitDetail = data(`unit/${entry.id}.json`);
  const at = `card ${u.id}`;
  for (const f of u.forms) {
    sweepAbility(f.ability, "ability", at);
    sweepAbility(f.organized, "organized", at);
    sweepAbility(f.possessed, "ability", at);
    sweepAbility(f.defeated, "ability", at);
    sweepAbility(f.always, "always", at);
    sweepAbility(f.quest, "quest", at);
    if (f.special_attack?.ability) sweepAbility(f.special_attack.ability, "ability", at);
    for (const s of f.stratagems ?? []) {
      if (!s.effect) continue;
      sweepRows([s.effect.row], "enchant", `gimmick#${s.id}`, s);
      sweepRows(s.effect.AllyEffectSetID, "enchant_set", `gimmick#${s.id}/ally`, s);
      sweepRows(s.effect.OpponentEffectSetID, "enchant_set", `gimmick#${s.id}/opp`, s);
    }
  }
  sweepAbility(u.class_ability, "ability", at);
  sweepAbility(u.sub_class?.class_ability, "ability", at);
  sweepAbility(u.special_ability?.sub_ability, "ability", at);
  for (const p of u.potential) sweepRows([p.raw], "potential", `potential:${p.name}:${p.limit_break}`, p);
}

const ranked = [...gaps.entries()].sort((a, b) => b[1].abilities.size - a[1].abilities.size);
const lines = [
  `# Effect sweep`,
  ``,
  `${rowsClean} of ${rowsTotal} effect rows fully decoded (${((100 * rowsClean) / rowsTotal).toFixed(1)}%).`,
  ``,
  ...ranked.flatMap(([k, h]) => [`- **${k}** — ${h.abilities.size} abilities, ${h.rows} rows`, ...h.examples.map((e) => `    - ${e}`)]),
];
const out = path.join(root, "tools/out/sweep.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join("\n"));
console.log(lines.slice(0, 3).join("\n"));
for (const [k, h] of ranked.slice(0, Number(process.argv[3] ?? 45))) console.log(`${String(h.abilities.size).padStart(5)}  ${k}`);
