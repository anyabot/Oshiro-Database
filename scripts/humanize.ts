// Readability check of every effect sentence the site prints: castle girl abilities (all slots),
// stratagems (rows, sets, missiles), enemy abilities and attacks, deliberations and map effects.
// Flags raw codes, clauses with no amount or verb, broken punctuation and suspicious numbers, grouped
// by pattern with examples.   node scripts/humanize.mjs <out.md>   (npm run humanize)
import fs from "node:fs";
import path from "node:path";
import { describeRow, rowBases, type RowKind } from "../src/effects";
import { enemyAbilityRows, withTargets } from "../src/stages";

const root = path.resolve(".");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, "public/data", p), "utf8"));
const defs = read("effects.json");

interface Hit { n: number; ex: string[] }
const found = new Map<string, Map<string, Hit>>();
let total = 0;
const seenText = new Set<string>();

// on/off state names (a clause that is only the state is fine): every bool status label
const STATES = new Set(Object.keys(defs.labels).filter((k) => k.startsWith("statuskind:") && defs.labels[k].jp === "bool")
  .map((k) => defs.labels[`status:${k.slice(11)}`]?.jp).filter(Boolean));

const CHECKS: [string, RegExp | ((s: string) => boolean)][] = [
  ["raw code", /\b(stat|target|effect|modifier|unit effect( type)?|ability type|value type|flag|bit|area|trigger|crowd control|motion|expr)\s#?\d/i],
  ["condition op", /\bop\d/],
  ["undefined / NaN", /undefined|NaN|null|\[object/],
  ["broken punctuation", /, ,|: :|,\s*$|:\s*$|\(\s*\)|\s{2,}|,\)|\(,/],
  ["ASCII minus on a number", /(^|[\s(×])-\d/],
  ["zero amount", /[+−]0(%|s)?(?![\d.])|×0(?![\d.])/],
  ["set to", /\bset to\b/],
  // Japanese outside the parenthesized / quoted / bracketed originals the sentences keep on purpose
  ["untranslated Japanese", (s) => /[぀-ヿ一-鿿]/.test(s.replace(/\([^)]*\)|「[^」]*」|\[[^\]]*\]/g, ""))],
  ["clause with no amount or verb", (s) => {
    // the effect part of each sentence piece: after its receiver ("Castle girls in range: …")
    return s.split(/ · |; /).some((piece) => {
      const eff = piece.includes(": ") ? piece.slice(piece.indexOf(": ") + 2) : piece;
      if (/\d/.test(eff)) return false;
      if (/immune|can't|cannot|inflicts|gain|lose|removed|counter|evades|knocked|transforms|activates|plays|move|walk|attack|uses|fires|deploy|motion|visual|stance|stand|ignores|pierces|attribute|disabled|target|weather|falling|split|nullified|instead|no effect|effects below|lasts|empty|immunity|every|until|when|while|only|shield|barrier|taunt|priority|damage taken|damage dealt/i.test(eff)) return false;
      return !STATES.has(eff.trim());
    });
  }],
];

function check(where: string, text: string) {
  total++;
  if (seenText.has(text)) return;
  seenText.add(text);
  for (const [name, test] of CHECKS) {
    const bad = typeof test === "function" ? test(text) : test.test(text);
    if (!bad) continue;
    const shape = text.replace(/[−+-]?\d+(\.\d+)?/g, "N");
    const m = found.get(name) ?? new Map<string, Hit>();
    const h = m.get(shape) ?? { n: 0, ex: [] };
    h.n++;
    if (h.ex.length < 2) h.ex.push(`${where}: ${text}`);
    m.set(shape, h);
    found.set(name, m);
  }
}

function rows(where: string, rs: any[] | undefined, kind: RowKind, links?: any, ctx: any = {}) {
  if (!rs) return;
  const b = kind === "ability" ? rowBases(rs) : [];
  rs.forEach((r, i) => describeRow(r, kind, defs, links?.[String(i)], b[i], ctx).text.forEach((t) => check(where, t)));
}

const units = read("units.json");
const doneAb = new Set<string>();
const ab = (where: string, a: any, kind: RowKind = "ability") => {
  if (!a || a.missing || doneAb.has(`${kind}${a.id}`)) return;
  doneAb.add(`${kind}${a.id}`);
  rows(`${where} ${a.name ?? ""}`, a.effects, kind, a.field_links);
};
for (const e of units) {
  if (e.npc && !e.transform_of) continue;
  const u = read(`unit/${e.id}.json`);
  const at = u.name;
  for (const f of u.forms) {
    ab(at, f.ability); ab(at, f.organized, "organized"); ab(at, f.possessed); ab(at, f.defeated);
    ab(at, f.always, "always"); ab(at, f.quest, "quest");
    if (f.special_attack?.ability) ab(at, f.special_attack.ability, "special_attack" as RowKind);
    for (const s of f.stratagems ?? []) {
      if (!s.effect || doneAb.has(`g${s.id}`)) continue;
      doneAb.add(`g${s.id}`);
      const ctx = { selfOnly: defs.labels[`etarget:${s.effect.row.TargetType}`]?.jp === "自分のみ", fieldArea: Number(s.field?.field.FieldEffectType) === 3 };
      if (s.field) rows(`${at} ${s.name}`, [{ AbilityType: 21 }], "ability", { 0: s.field });
      rows(`${at} ${s.name}`, [s.effect.row], "enchant", undefined, ctx);
      rows(`${at} ${s.name}`, s.effect.AllyEffectSetID, "enchant_set", undefined, ctx);
      rows(`${at} ${s.name}`, s.effect.OpponentEffectSetID, "enchant_set", undefined, ctx);
      if (s.token?.ability) ab(`${at} token`, s.token.ability);
    }
  }
  ab(at, u.class_ability); ab(at, u.sub_class?.class_ability); ab(at, u.special_ability?.sub_ability);
  ab(at, u.general_ability); ab(at, u.before_attack);
  for (const p of u.potential ?? []) rows(`${at} potential`, [p.raw], "potential");
}
const E = read("enemies.json");
for (const e of Object.values<any>(E.enemies)) {
  if (e.ability && !doneAb.has(`e${e.ability.id}`)) {
    doneAb.add(`e${e.ability.id}`);
    rows(`enemy ${e.name}`, enemyAbilityRows(e.ability.rows), "ability", undefined, { enemyOwner: true });
  }
  for (const m of [...e.missiles, ...e.deadMissiles]) rows(`enemy ${e.name} attack`, [{ AbilityType: 6, AbilityTypeDetail: 2, EffectValue: m.id }], "ability");
}
for (const f of fs.readdirSync(path.join(root, "public/data/stage"))) {
  const s = read(`stage/${f}`);
  rows(`stage ${s.name} map effect`, withTargets(s.mapEffect ?? []), "organized");
  for (const o of s.singi?.options ?? []) if (o.rows && !doneAb.has(`s${o.id}`)) { doneAb.add(`s${o.id}`); rows(`deliberation ${o.name}`, withTargets(o.rows), "organized"); }
}

const lines = [`# Humanize check`, ``, `${total} sentences, ${seenText.size} distinct.`, ``];
for (const [name, m] of found) {
  const list = [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  lines.push(`## ${name} — ${list.length} patterns, ${list.reduce((n, [, h]) => n + h.n, 0)} sentences`, "");
  for (const [, h] of list) lines.push(`- ${h.n}× ${h.ex[0]}${h.ex[1] ? `\n  - ${h.ex[1]}` : ""}`);
  lines.push("");
}
fs.writeFileSync(process.argv[2] ?? "humanize.md", lines.join("\n"));
// a reproducible sample of distinct sentences for reading by eye
const all = [...seenText];
let seed = Number(process.env.SEED ?? 7);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const sample = Array.from({ length: Math.min(160, all.length) }, () => all[Math.floor(rnd() * all.length)]);
fs.writeFileSync((process.argv[2] ?? "humanize.md").replace(/\.md$/, ".sample.txt"), [...new Set(sample)].join("\n"));
console.log(lines[2]);
for (const [name, m] of found) console.log(String([...m.values()].reduce((n, h) => n + h.n, 0)).padStart(6), name, `(${m.size} patterns)`);
