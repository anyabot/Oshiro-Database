// Buff ranking data: every stat change every playable castle girl gives, as the site's own effect
// describer words it (describeRow facts), tagged with the slot and renovation tier it comes from.
//   node scripts/buffs.mjs   (built from this file by `npm run buffs`)
// Writes public/data/buffs.json, read by src/pages/Buffs.tsx.
import fs from "node:fs";
import path from "node:path";
import { describeRow, rowBases, stratagemContext, type RowContext, type BuffFact, type EffectDefs, type RowKind } from "../src/effects";
import { combinedFacts, type Fact } from "../src/combine";
import { JP_EN } from "../src/labels";
import type { Ability, RawRow, UnitDetail, UnitIndexEntry } from "../src/types";

const root = path.resolve(process.argv[2] ?? ".");
const data = (p: string) => JSON.parse(fs.readFileSync(path.join(root, "public/data", p), "utf8"));
const defs: EffectDefs = data("effects.json");
const index: UnitIndexEntry[] = data("units.json");

/** One row of buffs.json (short keys: ~10k rows). */
export interface BuffRow {
  u: number;
  /** renovation tier the slot comes from; -1 = not tied to a tier (class, special ability) */
  t: number;
  sl: string;
  /** effect key: fact key | dir | unit */
  k: string;
  v: number;
  mx?: number;
  /** grows with no cap */
  nc?: 1;
  sd: "a" | "e";
  w: string;
  n?: string;
  /** stacking: 1 stacks, 0 doesn't (only the strongest applies), or the rule's own words */
  st?: 0 | 1 | string;
  /** ability / stratagem name */
  nm?: string;
}

const rows: BuffRow[] = [];
const keyNames = new Map<string, string>();

function statName(key: string): string {
  if (key === "dmg:dealt") return "Damage dealt";
  if (key === "dmg:taken") return "Damage taken";
  if (key === "dmg:bonus") return "Damage multiplier (attack bonus)";
  if (key === "ki:natural") return "Natural Ki gain";
  if (key === "ki:periodic") return "Ki over time (per second)";
  // inspire (鼓舞): "status:202~giver:202" = ATK + % of the giver's ATK
  const insp = /^status:(\d+)~(giver|own):(\d+)$/.exec(key);
  if (insp) {
    const n = (s: string) => { const jp = defs.labels[`status:${s}`]?.jp; return jp ? JP_EN[jp] ?? jp : `stat ${s}`; };
    return `${n(insp[1])} (+% of ${insp[2] === "giver" ? "the giver's" : "own"} ${n(insp[3])})`;
  }
  const jp = defs.labels[key]?.jp;
  if (!jp) return key;
  return JP_EN[jp] ?? jp;
}

function emit(u: number, t: number, sl: string, rowsIn: RawRow[] | undefined, kind: RowKind, name: string | undefined,
  side?: "ally" | "enemy", links?: Ability["field_links"], ctx: RowContext = {}) {
  if (!rowsIn) return;
  const bases = rowBases(rowsIn);
  const all: Fact[] = [];
  rowsIn.forEach((r, i) => {
    const s = describeRow(r, kind, defs, links?.[String(i)], bases[i], ctx);
    for (const f of s.facts as BuffFact[]) all.push({ ...f, text: s.text[f.line] ?? "" });
  });
  // a narrower group that also gets the group row (「[夏]は加算値1.5倍」): ranked with its total too
  for (const f of [...all, ...combinedFacts(all)]) {
    {
      if (!f.v) continue; // a zero change (empty rows) ranks nothing
      const sd = (side ?? f.side) === "enemy" ? "e" : "a";
      const k = `${f.key}|${f.dir}|${f.unit}`;
      keyNames.set(f.key, statName(f.key));
      rows.push({
        u, t, sl, k, v: f.v, sd, w: f.who,
        // LimitValue 9999 / 10000 / 999999: the texts give no cap (e.g. さらに5%ずつ上昇): ranked by the step
        ...(f.max && f.max >= 9999 ? { nc: 1 as const } : f.max ? { mx: f.max } : {}), ...(f.note ? { n: f.note } : {}),
        ...(f.stack ? { st: f.stack === "stacks" ? 1 : f.stack === "doesn't stack" ? 0 : f.stack } : {}),
        ...(name ? { nm: name } : {}),
      });
    }
  }
}

const ability = (u: number, t: number, sl: string, a: Ability | null | undefined, kind: RowKind = "ability") => {
  if (a && !a.missing) emit(u, t, sl, a.effects, kind, a.name, undefined, a.field_links);
};

let units = 0;
for (const entry of index) {
  // playable cards only: no NPC / duplicate entries, and transformed states belong to their stratagem
  if (entry.npc || entry.dup_of || entry.transform_of) continue;
  const u: UnitDetail = data(`unit/${entry.id}.json`);
  const before = rows.length;
  for (const f of u.forms) {
    ability(u.id, f.tier, "skill", f.ability);
    ability(u.id, f.tier, "formation", f.organized, "organized");
    ability(u.id, f.tier, "possession", f.possessed);
    ability(u.id, f.tier, "defeat", f.defeated);
    // f.always is the card's own stat profile (ATK/DEF/HP +8%, cost…), not a buff it gives: left out
    if (f.special_attack?.ability) ability(u.id, f.tier, "special_attack", f.special_attack.ability);
    for (const s of f.stratagems ?? []) {
      if (!s.effect) continue;
      // EnchantEffect.TargetType 2 = 自分のみ (its texts: 自分のみが対象)
      const ctx = stratagemContext(defs, s);
      emit(u.id, f.tier, "stratagem", [s.effect.row], "enchant", s.name, undefined, undefined, ctx);
      emit(u.id, f.tier, "stratagem", s.effect.AllyEffectSetID, "enchant_set", s.name, "ally", undefined, ctx);
      emit(u.id, f.tier, "stratagem", s.effect.OpponentEffectSetID, "enchant_set", s.name, "enemy", undefined, ctx);
    }
    // ambush units (伏兵) a stratagem places: their own abilities buff and debuff too
    for (const s of f.stratagems ?? []) {
      if (s.token) {
        // TokenConfig.DeployLimit: how many can be out at once (matches every 「(N体まで)」 text, 154 of 154;
        // tokens without it never state a cap)
        const lim = Number(s.token.config?.DeployLimit) || 0;
        const tag = `${s.token.name} (伏兵) · ${lim ? `max ${lim} placed at once` : "no placement limit"} · from ${s.name}`;
        for (const a of [s.token.ability, s.token.general_ability]) if (a && !a.missing) ability(u.id, f.tier, "token", { ...a, name: `${tag} · ${a.name}` });
      }
    }
  }
  ability(u.id, -1, "class", u.class_ability);
  ability(u.id, -1, "class", u.sub_class?.class_ability);
  ability(u.id, -1, "special", u.special_ability?.sub_ability);
  if (rows.length > before) units++;
}

// the same change listed twice (e.g. a skill repeated in a later form) counts once
const seenRow = new Set<string>();
const unique = rows.filter((r) => { const j = JSON.stringify(r); return !seenRow.has(j) && !!seenRow.add(j); });
rows.length = 0;
rows.push(...unique);
const keys = Object.fromEntries([...keyNames.entries()].sort());
const out = path.join(root, "public/data/buffs.json");
fs.writeFileSync(out, JSON.stringify({ keys, rows }));
console.log(`${rows.length} buff rows from ${units} castle girls, ${keyNames.size} stats -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
