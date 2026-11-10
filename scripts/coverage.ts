// Description coverage: every number in every ability / stratagem description is checked
// against what the page shows for it.
//   shown      a decoded sentence states the number
//   data-only  the number is in the item's rows (or linked rows) but no sentence uses it
//   absent     the number is nowhere in the data the page has for the item: a missing link
// Writes tools/out/coverage.md.   npm run coverage
import fs from "node:fs";
import path from "node:path";
import { describeRow, rowBases, type EffectDefs, type RowKind } from "../src/effects";
import type { Ability, RawRow, Stratagem, UnitDetail, UnitIndexEntry } from "../src/types";

const root = path.resolve(process.argv[2] ?? ".");
const data = (p: string) => JSON.parse(fs.readFileSync(path.join(root, "public/data", p), "utf8"));
const defs: EffectDefs = data("effects.json");
const index: UnitIndexEntry[] = data("units.json");

interface Rows { rows: RawRow[]; kind: RowKind; links?: Ability["field_links"] }
interface Item { key: string; card: number; label: string; name: string; description: string; groups: Rows[] }

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const nums = (s: string) => [...s.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));

/** Numbers a description prints, with their unit, minus ones that are not effect values. */
function descNumbers(desc: string): { n: number; unit: string; text: string }[] {
  const out: { n: number; unit: string; text: string }[] = [];
  for (const m of desc.matchAll(/(\d+(?:\.\d+)?)(倍|%|％|秒|回|体|段階|上昇|増加|短縮|低下|軽減)?/g)) {
    const before = desc.slice(Math.max(0, m.index! - 1), m.index!);
    if (before === "★" || before === "☆") continue; // rarity
    out.push({ n: Number(m[1]), unit: m[2] ?? "", text: desc.slice(Math.max(0, m.index! - 8), m.index! + m[0].length + 2) });
  }
  return out;
}

/** Numbers a stored value can print as. */
const printed = (v: number) => [v, 1 + v / 100, v / 100, v / 1000, 1 - v / 100];

function rawValues(r: RawRow, links?: Ability["field_links"], i?: number): number[] {
  const vals = Object.values(r).filter((v): v is number => typeof v === "number");
  const link = links?.[String(i)];
  if (link) for (const v of [...Object.values(link.field), ...Object.values(link.missile)]) if (typeof v === "number") vals.push(v);
  for (const f of ["MissileID", "SpreadMissileID", "ShotMissileID", "EffectValue"]) {
    const id = r[f];
    if (typeof id === "number" && defs.missiles[id]) for (const [, val, ms] of defs.missiles[id]) vals.push(val, ms);
  }
  return vals;
}

const items: Item[] = [];
const add = (card: number, label: string, a: { name?: string; description?: string } | null | undefined, groups: Rows[], id: string) => {
  if (!a?.description) return;
  items.push({ key: `${label}#${id}`, card, label, name: a.name ?? "", description: a.description, groups });
};
const abilityRows = (a: Ability | null | undefined, kind: RowKind): Rows[] =>
  a?.effects ? [{ rows: a.effects, kind, links: a.field_links }] : [];
const stratRows = (s: Stratagem): Rows[] => {
  const g: Rows[] = [];
  if (s.field) g.push({ rows: [{ AbilityType: 21 }], kind: "ability", links: { 0: s.field } });
  if (s.token?.ability) g.push(...abilityRows(s.token.ability, "ability"));
  if (s.token?.general_ability) g.push(...abilityRows(s.token.general_ability, "ability"));
  if (s.token) g.push({ rows: [s.token.config], kind: "other" });
  if (!s.effect) return g;
  g.push({ rows: [s.effect.row], kind: "enchant" });
  if (s.effect.AllyEffectSetID) g.push({ rows: s.effect.AllyEffectSetID, kind: "enchant_set" });
  if (s.effect.OpponentEffectSetID) g.push({ rows: s.effect.OpponentEffectSetID, kind: "enchant_set" });
  return g;
};

const seen = new Set<string>();
for (const entry of index) {
  if (entry.npc && !entry.transform_of) continue;
  const u: UnitDetail = data(`unit/${entry.id}.json`);
  const transformRows = abilityRows(u.transform_into?.general_ability, "ability");
  for (const f of u.forms) {
    const slots: [string, Ability | undefined, RowKind][] = [
      ["specialty", f.ability, "ability"], ["formation", f.organized, "organized"], ["possession", f.possessed, "ability"],
      ["on-defeat", f.defeated, "ability"],
    ];
    for (const [label, a, kind] of slots) {
      if (!a || seen.has(`${label}${a.id}`)) continue;
      seen.add(`${label}${a.id}`);
      add(u.id, label, a, abilityRows(a, kind), String(a.id));
    }
    const list = f.stratagems ?? [];
    for (const s of list) {
      if (seen.has(`strat${s.id}`) || s.description?.includes("複数計略")) continue;
      seen.add(`strat${s.id}`);
      // a set parent's numbers live in its members
      const members = !s.set_member ? list.filter((m) => m.set_member) : [];
      add(u.id, "stratagem", s, [...stratRows(s), ...members.flatMap(stratRows), ...(s.transform ? transformRows : [])], String(s.id));
    }
  }
  for (const [label, a] of [["class", u.class_ability], ["general", u.general_ability]] as const) {
    if (a && !seen.has(`${label}${a.id}`)) { seen.add(`${label}${a.id}`); add(u.id, label, a, abilityRows(a, "ability"), String(a.id)); }
  }
  const sp = u.special_ability;
  if (sp && !seen.has(`special${sp.id}`)) {
    seen.add(`special${sp.id}`);
    // a Transform special turns the unit into its transformed card: that card's abilities apply
    const tr = sp.raw?.Transform ? [...abilityRows(u.transform_into?.ability, "ability"), ...transformRows] : [];
    add(u.id, "special", sp, [...abilityRows(sp.sub_ability, "ability"), ...tr], String(sp.id));
  }
}

// every sentence on each card's page, to tell "shown elsewhere on the page" from "absent"
const pageSaid = new Map<number, number[]>();
const pageData = new Map<number, number[]>();
for (const it of items) {
  const said = pageSaid.get(it.card) ?? [], dat = pageData.get(it.card) ?? [];
  for (const g of it.groups) g.rows.forEach((r, i) => {
    said.push(...describeRow(r, g.kind, defs, g.links?.[String(i)], rowBases(g.rows)[i]).text.flatMap(nums));
    dat.push(...rawValues(r, g.links, i));
  });
  pageSaid.set(it.card, said);
  pageData.set(it.card, dat);
}

let total = 0, shown = 0, elsewhere = 0, dataOnly = 0, absent = 0, fullItems = 0;
const report: { item: Item; missing: string[]; sentences: string[]; absent: number }[] = [];
const byLabel = new Map<string, { items: number; full: number }>();
for (const it of items) {
  const sentences: string[] = [];
  const data: number[] = [];
  for (const g of it.groups) g.rows.forEach((r, i) => {
    sentences.push(...describeRow(r, g.kind, defs, g.links?.[String(i)], rowBases(g.rows)[i]).text);
    data.push(...rawValues(r, g.links, i));
  });
  const said = sentences.flatMap(nums);
  const missing: string[] = [];
  let itemAbsent = 0;
  for (const d of descNumbers(it.description)) {
    total++;
    if (said.some((s) => near(s, d.n))) { shown++; continue; }
    if (data.some((v) => printed(v).some((p) => near(p, d.n)))) { dataOnly++; missing.push(`[data-only] ${d.text}`); continue; }
    if ((pageSaid.get(it.card) ?? []).some((s) => near(s, d.n))) { elsewhere++; continue; }
    if ((pageData.get(it.card) ?? []).some((v) => printed(v).some((p) => near(p, d.n)))) { dataOnly++; missing.push(`[data-only, other item] ${d.text}`); continue; }
    absent++; itemAbsent++; missing.push(`[ABSENT] ${d.text}`);
  }
  const b = byLabel.get(it.label) ?? { items: 0, full: 0 };
  b.items++;
  if (!missing.length) { fullItems++; b.full++; }
  byLabel.set(it.label, b);
  if (missing.length) report.push({ item: it, missing, sentences, absent: itemAbsent });
}

report.sort((a, b) => b.absent - a.absent || b.missing.length - a.missing.length);
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
const head = [
  `# Description coverage`,
  ``,
  `Numbers in descriptions: ${total}. Shown ${pct(shown, total)}, shown elsewhere on the page ${pct(elsewhere, total)}, data-only ${pct(dataOnly, total)}, absent ${pct(absent, total)}.`,
  `Items with every number shown: ${fullItems} of ${items.length} (${pct(fullItems, items.length)}).`,
  ``,
  ...[...byLabel].map(([l, b]) => `- ${l}: ${b.full}/${b.items} fully covered`),
  ``,
];
const body = report.flatMap(({ item, missing, sentences }) => [
  `## card ${item.card} · ${item.label} ${item.key} ${item.name}`,
  "```", item.description, "```",
  ...missing.map((m) => `- ${m}`),
  ...sentences.map((s) => `  > ${s}`),
  ``,
]);
const out = path.join(root, "tools/out/coverage.md");
fs.writeFileSync(out, [...head, ...body].join("\n"));
console.log(head.join("\n"));
