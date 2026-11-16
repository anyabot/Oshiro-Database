// Buff ranking data: every stat change every playable castle girl gives, as the site's own effect
// describer words it (describeRow facts), tagged with the slot and renovation tier it comes from.
//   node scripts/buffs.mjs   (built from this file by `npm run buffs`)
// Writes public/data/buffs.json, read by src/pages/Buffs.tsx.
import fs from "node:fs";
import path from "node:path";
import { describeRow, motionHits, rowBases, stratagemContext, type RowContext, type BuffFact, type EffectDefs, type RowKind } from "../src/effects";
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

// Utility effects: no amount to rank, so the value is how long they last (PERMANENT = no end).
// Read from the worded sentences: "Self: Can't be targeted, for 30s", "Target: its skill (特技) activates (特技発動)".
const PERMANENT = 1e9;
const UTILITY: Record<string, { name: string; test: RegExp; note?: (line: string) => string | undefined }> = {
  "util:untargetable": {
    name: "Can't be targeted",
    test: /(?<!while it )\bCan't be targeted(?! by allies)/,
    note: (l) => (/except by flying enemies/.test(l) ? "except by flying enemies" : undefined),
  },
  "util:skill": { name: "Skill activation (特技発動)", test: /\bits skill \(特技\) activates/ },
  "util:spot": { name: "Placement spot change", test: /^(?:Turns|Strengthens) the chosen placement spot/ },
};
for (const [k, u] of Object.entries(UTILITY)) keyNames.set(k, u.name);

function utilityRows(u: number, t: number, sl: string, lines: string[], name: string | undefined, extraNote?: string) {
  for (const line of lines) {
    for (const [key, util] of Object.entries(UTILITY)) {
      if (!util.test.test(line)) continue;
      // the receiver is the sentence's head ("Self", "Castle girls in range"); spot changes name the spot
      const head = /^([A-Z★][^:]*?): /.exec(line)?.[1];
      const who = key === "util:spot" ? "Chosen placement spot" : head && !/^(Missile #|Field effect)/.test(head) ? head : "Target";
      const secs = /\bfor (\d+(?:\.\d+)?)s\b/.exec(line);
      const v = secs ? Number(secs[1]) : PERMANENT;
      const note = [util.note?.(line), extraNote].filter(Boolean).join("; ");
      rows.push({ u, t, sl, k: `${key}|+|`, v, sd: /^(All )?enem/i.test(who) ? "e" : "a", w: who, ...(note ? { n: note } : {}), ...(name ? { nm: name } : {}) });
    }
  }
}

// Multi-hit: hits per attack, read from the worded sentences — a class-ability attack motion
// ("Self: attack motion #6098: 4 hits, then 1 hit at ×2 + splash 150 around the target per attack") or a
// repeating missile ("missile #4357: hits 3 times, 0.2s apart"). Ranked as "hits|+|hits" (value = hits).
keyNames.set("hits", "Hits per attack");
function multiHitRows(u: number, t: number, sl: string, lines: string[], name: string | undefined) {
  for (const line of lines) {
    const head = /^([A-Z★][^:]*?): /.exec(line)?.[1];
    const who = head && !/^(Missile #|Field effect)/.test(head) ? head : "Self";
    const motion = /attack motion #(\d+): (.+?) per attack/.exec(line);
    if (motion) {
      const v = [...motion[2].matchAll(/(\d+) hits?/g)].reduce((n, m) => n + Number(m[1]), 0);
      if (v > 1) rows.push({ u, t, sl, k: "hits|+|hits", v, sd: "a", w: who, n: motion[0], ...(name ? { nm: name } : {}) });
    }
    for (const m of line.matchAll(/missile #(\d+): (?:[^;]*; )?hits (\d+) times(?:, ([\d.]+)s apart)?/g)) {
      const v = Number(m[2]);
      if (v > 1) rows.push({ u, t, sl, k: "hits|+|hits", v, sd: "a", w: who, n: `missile #${m[1]}${m[3] ? `, ${m[3]}s apart` : ""}`, ...(name ? { nm: name } : {}) });
    }
  }
}

/** A motion-based hit count (special attack, stratagem attack motion) as a "hits" row. */
function motionRow(u: number, t: number, sl: string, motion: unknown, missile: unknown, name: string | undefined, who = "Self") {
  const m = Number(motion) > 0 ? motionHits(defs, Number(motion), Number(missile) || 0) : null;
  if (m && m.hits > 1) rows.push({ u, t, sl, k: "hits|+|hits", v: m.hits, sd: "a", w: who, n: m.text, ...(name ? { nm: name } : {}) });
}

function statName(key: string): string {
  if (key === "hits") return "Hits per attack";
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
    utilityRows(u, t, sl, s.text, name);
    multiHitRows(u, t, sl, s.text, name);
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
    // special attack hits: its AttackMotionID's shots x (1 + its missile's DamageRepeatNum)
    if (f.special_attack?.raw) motionRow(u.id, f.tier, "special_attack", f.special_attack.raw.AttackMotionID, f.special_attack.raw.MissileID, f.special_attack.ability?.name);
    for (const s of f.stratagems ?? []) {
      // GimmickType 4: the spot it changes buffs whoever is placed there
      if (s.placement) {
        const gives = s.placement.effects.map((r) => describeRow(r, "placement", defs).text.join(" · ").replace(/^[^:]*: /, "")).join(", ");
        const lines = describeRow(s.placement.location, "location", defs).text;
        const spots = lines.find((l) => l.startsWith("Can be used on: "))?.slice("Can be used on: ".length);
        utilityRows(u.id, f.tier, "stratagem", lines, s.name, [gives && `placed unit: ${gives}`, spots && `on ${spots}`].filter(Boolean).join("; ") || undefined);
      }
      if (s.placement?.effects.length) emit(u.id, f.tier, "stratagem", s.placement.effects, "placement", s.name, "ally");
      if (!s.effect) continue;
      // EnchantEffect.TargetType 2 = 自分のみ (its texts: 自分のみが対象)
      const ctx = stratagemContext(defs, s);
      // EnchantEffect.AttackMotionID: the stratagem switches the attack motion (海割れ: 2連続攻撃になり)
      motionRow(u.id, f.tier, "stratagem", s.effect.row.AttackMotionID, 0, s.name, Number(s.effect.row.TargetType) === 2 ? "Self" : "Target");
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
  // the weapon's own attack: WeaponType description 「敵1体に2連続攻撃を行い」 (双剣)
  const wHits = /(\d+)連続攻撃/.exec(u.weapon?.description ?? "");
  if (wHits && Number(wHits[1]) > 1) {
    rows.push({ u: u.id, t: -1, sl: "weapon", k: "hits|+|hits", v: Number(wHits[1]), sd: "a", w: "Self", n: u.weapon.description, nm: u.weapon.name ?? undefined });
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
