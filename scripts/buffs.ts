// Buff ranking data: every stat change every playable castle girl gives, as the site's own effect
// describer words it (describeRow facts), tagged with the slot and renovation tier it comes from.
//   node scripts/buffs.mjs   (built from this file by `npm run buffs`)
// Writes public/data/buffs.json, read by src/pages/Buffs.tsx.
import fs from "node:fs";
import path from "node:path";
import { describeRow, motionHits, rowBases, stratagemContext, type RowContext, type BuffFact, type EffectDefs, type RowKind } from "../src/effects";
import { combinedFacts, type Fact } from "../src/combine";
import { JP_EN } from "../src/labels";
import { reachParser, type ReachRule } from "../src/reach";
import { maxGrade, type Growth, type Reno } from "../src/statSim";
import { weaponAbilityRows, type WeaponData } from "../src/weapons";
import type { Ability, PossessionRule, PossessionSource, RawRow, Stratagem, UnitDetail, UnitIndexEntry } from "../src/types";

const root = path.resolve(process.argv[2] ?? ".");
const data = (p: string) => JSON.parse(fs.readFileSync(path.join(root, "public/data", p), "utf8"));
const defs: EffectDefs = data("effects.json");
const index: UnitIndexEntry[] = data("units.json");
const growth: Growth = data("growth.json");
/** each castle girl's highest giantification grade per renovation tier (Rarity.GrowUpLimit by effective ★:
 *  3 / 4 / 5; Card.GrowUpLimitType 1000 = 9 for 九龍城砦, 1001 = 1 for lords); written to buffs.json as gm
 *  where it isn't 5 at every tier */
const grades = new Map<number, number[]>();
const gradeAt = (u: number, t: number) => { const g = grades.get(u) ?? [5]; return g[t < 0 ? g.length - 1 : Math.min(t, g.length - 1)]; };

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
  /** per giantification (EachGrowUp): mx is v × her highest grade at this tier */
  pg?: 1;
  /** equipment rows: the castle girls a weapon's bonus ability is for */
  sp?: number[];
}

const rows: BuffRow[] = [];
const keyNames = new Map<string, string>();

// Effects with no stat to rank, read from the worded sentences clause by clause ("Self: missile #4357:
// inflicts Burn (5s); ATK −20%, for 5s" = two clauses). Each rule gives a key and a value: how long it
// lasts in seconds (PERMANENT = no end; NO_AMOUNT = an instant effect such as a knockback), or its own
// amount for the numeric ones (counter %, evasion %, barrier, extra damage ×ATK…).
// Every sentence that reaches no ranked row has to match SKIP (with the reason) or it is listed as
// uncategorized in tools/out/buff_coverage.md.
const PERMANENT = 1e9;
const NO_AMOUNT = 0;
const AILMENT_JP: Record<string, string> = {
  Paralysis: "麻痺", Confusion: "混乱", Burn: "火傷", "Deadly Poison": "猛毒", Darkness: "暗闇", Freeze: "氷結",
  Despair: "絶望", Silence: "沈黙", Submission: "服従", Hope: "希望", "constant HP loss": "耐久減少",
};
// ailments that land on allies (the token's own Despair raises its ATK; Hope protects)
const ALLY_AILMENT = new Set(["Hope", "Despair"]);
const PROP: Record<string, [string, string]> = {
  "magic (ignores DEF)": ["util:prop:magic", "Attacks become magic (術攻撃化)"],
  "direct-hit bonus": ["util:prop:direct", "Direct-hit bonus (直撃ボーナス)"],
  "anti-yokai": ["util:prop:yokai", "Anti-yokai attacks (妖怪特攻)"],
  "anti-demon": ["util:prop:demon", "Anti-demon attacks (魔物特攻)"],
  ranged: ["util:prop:ranged", "Ranged attacks (遠距離攻撃)"],
  "vs flying": ["util:prop:flying", "Hits flying enemies (飛行攻撃)"],
};
const FIXED_NAMES: Record<string, string> = {
  "util:untargetable": "Can't be targeted (隠密)",
  "util:skill": "Skill activation (特技発動)",
  "util:spot": "Placement spot change (配置マス変更)",
  "util:weather": "Weather immunity (天候無効)",
  "util:knockback": "Knockback (後退)",
  "util:stop": "Can't move (移動不可)",
  "util:nofall": "Not counted as fallen (大破数に含まれない)",
  "util:guts": "Knockout guard (1度だけ大破しない)",
  "util:undying": "Undying (耐久が0にならない)",
  "util:cover": "Takes damage for allies (身代わり)",
  "util:split": "Damage split among castle girls (ダメージ分散)",
  "util:move": "Can move (移動可能)",
  "util:boat": "Can be placed on boat tiles (舟マス配置可能)",
  "util:place": "Extra placement tiles (配置可能マス追加)",
  "heal:atk": "Heal by ATK (攻撃倍率回復)",
  "util:reversal": "Reversal (反転化)",
  "util:noheal": "Can't be healed (回復不可)",
  "util:healdmg": "Healing deals damage (回復反転)",
  "util:fixedhp": "Fixed damage taken (被ダメージ固定)",
  "util:hitsplit": "Damage split into hits (ダメージ分割)",
  "counter:reflect": "Damage reflection (反射)",
  "counter:own": "Counter attack (反撃)",
  evade: "Evasion (回避)",
  barrier: "Barrier (バリア)",
  nullify: "Nullify hits up to (ダメージ無効化)",
  "dmgfx:atk": "Extra damage (追加ダメージ)",
  "dmgfx:maxhp": "Max HP damage (最大耐久割合ダメージ)",
  "dmgfx:curhp": "Current HP damage (現在耐久割合ダメージ)",
  "dmgfx:flat": "Fixed damage (固定ダメージ)",
};

/** Clauses of a sentence: its head ("Self: ") off, then split on "; " outside brackets. */
function clauses(line: string): string[] {
  const body = line.replace(/^(?:[A-Z★぀-鿿][^:]*?: )?(?:Special attack )?(?:missile #\d+: |Field effect: )?/, "");
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "(" || c === "「") depth++;
    else if (c === ")" || c === "」") depth--;
    else if (!depth && body.startsWith("; ", i)) { out.push(body.slice(start, i)); start = i + 2; }
  }
  out.push(body.slice(start));
  return out;
}
const secsOf = (s: string): number | undefined => {
  if (/\bthe rest of the battle\b/.test(s)) return PERMANENT;
  const m = /\bfor (\d+(?:\.\d+)?)(m?s)\b/.exec(s) ?? /\((\d+(?:\.\d+)?)(s)\)/.exec(s);
  return m ? Number(m[1]) / (m[2] === "ms" ? 1000 : 1) : undefined;
};
/** The sentence's tail conditions worth keeping beside a utility row. */
const tailNote = (c: string) => [...c.matchAll(/\b(only at max giantification \(最大化\)|activates on giantification \(巨大化時発動\)|per giantification|re-applied every [\d.]+s|every [\d.]+s|when on [^,]+ tiles|[\d.]+% chance|except by flying enemies)\b/g)].map((m) => m[1]).join(", ");

interface Hit { key: string; v: number; note?: string; enemy?: boolean; enemyOnly?: boolean; name?: string }
type Rule = (c: string, line: string) => Hit[] | null;

const RULES: Rule[] = [
  (c) => /(?<!while it )\bCan't be targeted(?! by allies)/.test(c)
    ? [{ key: "util:untargetable", v: secsOf(c) ?? PERMANENT, note: /except by flying enemies/.test(c) ? "except by flying enemies" : undefined }] : null,
  (c) => /\bits skill \(特技\) activates/.test(c) ? [{ key: "util:skill", v: PERMANENT }] : null,
  (c) => /^(?:Turns|Strengthens) the chosen placement spot/.test(c) ? [{ key: "util:spot", v: PERMANENT }] : null,
  // inflicted ailments: "inflicts Burn (5s)", "inflicts Paralysis for 3s", "inflicts Despair (the rest of the battle)"
  (c) => {
    const out: Hit[] = [];
    for (const m of c.matchAll(/\binflicts ([A-Za-z][A-Za-z ]*?)(?: \(([^)]*[぀-鿿][^)]*)\))?(?= \(|,|;| for|$)/g)) {
      const en = m[1].trim();
      const jp = AILMENT_JP[en] ?? m[2] ?? en;
      out.push({ key: `util:inflict:${en}`, name: `Inflicts ${en} (${jp}付与)`, v: secsOf(c.slice(m.index!)) ?? PERMANENT,
        ...(ALLY_AILMENT.has(en) ? {} : { enemy: true }), note: /\(no damage\)/.test(c) ? "no damage" : undefined });
    }
    return out.length ? out : null;
  },
  // ailment immunity: "immune to Paralysis, Confusion, Burn, …" (one row per ailment)
  (c) => {
    const m = /^immune to (.+?)(?=, (?:for|only|re-applied|activates|per|every|when)\b|$)/.exec(c);
    if (!m || /being set|decreases|increases|knockback/.test(m[1])) return null;
    const list = m[1].split(/, /);
    return list.map((en) => ({ key: `util:immune:${en}`, name: `Immune to ${en} (${AILMENT_JP[en] ?? en}無効)`, v: secsOf(c) ?? PERMANENT,
      note: list.length > 1 ? `with ${list.length - 1} more ailments` : undefined }));
  },
  (c) => /^immune to knockback/.test(c) ? [{ key: "util:immune:knockback", name: "Immune to knockback (後退無効)", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => /^Weather immunity: (.+?)(?=, (?:only|for)|$)/.test(c) ? [{ key: "util:weather", v: secsOf(c) ?? PERMANENT, note: /^Weather immunity: (.+?)(?=, (?:only|for)|$)/.exec(c)![1] }] : null,
  (c) => /\bknocked back \(move speed/.test(c) ? [{ key: "util:knockback", v: NO_AMOUNT, enemy: true }] : null,
  (c) => /\bcan't move \(move speed 0\)/.test(c) ? [{ key: "util:stop", v: secsOf(c) ?? PERMANENT, enemy: true }] : null,
  (c) => /Falling doesn't count toward the fallen-unit count/.test(c) ? [{ key: "util:nofall", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => {
    const m = /once, can't be knocked out: HP can't drop to 0 for ([\d.]+)s/.exec(c) ?? /that "can't be knocked out" time \+([\d.]+)s/.exec(c);
    return m ? [{ key: "util:guts", v: Number(m[1]), note: m[0].startsWith("that") ? "adds to the once-only timer" : undefined }] : null;
  },
  (c) => /\bCan't be destroyed \(HP stays at 1\)/.test(c) ? [{ key: "util:undying", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => /damage aimed at them is taken by this unit instead/.test(c) ? [{ key: "util:cover", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => /damage taken is split among all deployed castle girls/.test(c) ? [{ key: "util:split", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => {
    const m = /\bcan move on (all tiles|.+? tiles(?: \([^)]*\))?), move speed ([^,]+)/.exec(c);
    return m ? [{ key: "util:move", v: secsOf(c) ?? PERMANENT, note: `${m[1]}, move speed ${m[2]}` }] : null;
  },
  (c) => /can be deployed on boat tiles/.test(c) ? [{ key: "util:boat", v: PERMANENT }] : null,
  (c) => { const m = /can also be placed on (.+?) tiles/.exec(c); return m ? [{ key: "util:place", v: PERMANENT, note: `${m[1]} tiles` }] : null; },
  // heal fields: "heal ×5 ATK" (「範囲内の城娘と殿を攻撃の5倍の値で回復」), continuous heals "heal ×0.08 ATK, re-applied every 1s"
  (c) => { const m = /\bheal ×([\d.]+) ATK/.exec(c); return m ? [{ key: "heal:atk|+|×", v: Number(m[1]) }] : null; },
  // immunity removed on enemies (「射程内の敵に対して「氷結」が無効化されない」): the ailment lands on immune enemies too.
  // On allies it is an immunity ending (skip list)
  (c) => {
    const m = /^no longer immune to (.+?)(?=, (?:for|only|re-applied|refreshes)\b|$)/.exec(c);
    return m ? m[1].split(/, /).map((en) => ({ key: `util:pierce:${en}`, name: `Pierces ${en} immunity (${AILMENT_JP[en] ?? en}無効化されない)`, v: secsOf(c) ?? PERMANENT, enemyOnly: true })) : null;
  },
  (c) => /^Reversal \(反転化\)/.test(c) ? [{ key: "util:reversal", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => /^Can't be healed/.test(c) ? [{ key: "util:noheal", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => /^Healing it deals damage instead/.test(c) ? [{ key: "util:healdmg", v: secsOf(c) ?? PERMANENT }] : null,
  (c) => { const m = /each hit takes only (\d+) HP/.exec(c); return m ? [{ key: "util:fixedhp", v: secsOf(c) ?? PERMANENT, note: `${m[1]} HP per hit` }] : null; },
  (c) => { const m = /damage split into hits of (\d+)/.exec(c); return m ? [{ key: "util:hitsplit", v: secsOf(c) ?? PERMANENT, note: `hits of ${m[1]}` }] : null; },
  // attack properties: "attacks gain: magic (ignores DEF), ranged, anti-yokai"; DEF ignore ranks with the
  // DEF ignore % buffs (status 203) at 100%: it ignores all of the DEF
  (c) => {
    const m = /^(?:attacks gain:?|attack properties set to:|with its special attack, attacks gain) (.+?)(?=, (?:for|only|grows|at giantification|refreshes)\b|$)/.exec(c);
    if (!m) return null;
    return m[1].split(/, (?![^()]*\))/).map((f) => {
      if (f === "DEF ignore") return { key: "status:203|+|%", v: 100, note: "attack ignores DEF entirely (attack property)" };
      const p = PROP[f];
      return p ? { key: p[0], name: p[1], v: secsOf(c) ?? PERMANENT } : { key: `util:prop:${f}`, name: `Attack property: ${f}`, v: secsOf(c) ?? PERMANENT };
    });
  },
  (c) => { const m = /^Attack attribute: ([a-z]+)/.exec(c); return m ? [{ key: `util:attr:${m[1]}`, name: `Attack attribute: ${m[1]}`, v: secsOf(c) ?? PERMANENT }] : null; },
  // amounts
  (c) => {
    const m = /counter damage (\d+)% of the attacker's ATK/.exec(c) ?? /counter for (\d+)% of own ATK/.exec(c);
    if (!m) return null;
    const from = /when attacked \(from ([^)]+)\)/.exec(c)?.[1];
    return [{ key: m[0].startsWith("counter damage") ? "counter:reflect|+|%" : "counter:own|+|%", v: Number(m[1]),
      note: [m[0].startsWith("counter damage") ? "% of the attacker's ATK" : "% of own ATK", from ? `against ${from} attacks` : ""].filter(Boolean).join(", ") }];
  },
  (c) => { const m = /^evades attacks(?:, (\d+)% chance)?/.exec(c); return m ? [{ key: "evade|+|%", v: m[1] ? Number(m[1]) : 100, note: secsOf(c) && secsOf(c)! < PERMANENT ? `for ${secsOf(c)}s` : undefined }] : null; },
  (c) => { const m = /barrier \(バリア\) blocks up to (\d+) damage/.exec(c); return m ? [{ key: "barrier|+|", v: Number(m[1]) }] : null; },
  (c) => { const m = /hits of (\d+) damage or less are nullified/.exec(c); return m ? [{ key: "nullify|+|", v: Number(m[1]) }] : null; },
  // damage an effect deals: "damage 1.5× ATK (magic…)", "independent damage 0.5× ATK (…, every 2s)",
  // "damage ×2 ATK" (field), "damage 0.1× the target's max HP" (true damage)
  (c) => {
    const out: Hit[] = [];
    const kinds = (i: number) => /^\s*\(([^)]*)\)/.exec(c.slice(i))?.[1];
    for (const m of c.matchAll(/\b(?:independent )?damage (?:([\d.]+)× ATK|×([\d.]+) ATK)/g)) {
      out.push({ key: "dmgfx:atk|+|×", v: Number(m[1] ?? m[2]), enemy: true, note: kinds(m.index! + m[0].length) });
    }
    for (const m of c.matchAll(/\b(?:independent )?damage ([\d.]+)× the target's (max|current) HP/g)) {
      out.push({ key: `dmgfx:${m[2] === "max" ? "maxhp" : "curhp"}|+|%`, v: Math.round(Number(m[1]) * 10000) / 100, enemy: true, note: kinds(m.index! + m[0].length) });
    }
    for (const m of c.matchAll(/\bdamage (\d+) \(true damage/g)) out.push({ key: "dmgfx:flat|+|", v: Number(m[1]), enemy: true });
    return out.filter((h) => h.v > 0).length ? out.filter((h) => h.v > 0) : null;
  },
];

// Sentences that rank nothing, on purpose: the reason is written to the coverage report.
const SKIP: [RegExp, string][] = [
  [/^(?:[^:]*: )?transforms\b|turns into its alternate form/, "transformation: the transformed card's own effects are ranked under her slots"],
  [/missile #\d+ \(no extra effects\)/, "the attack itself (no extra effect)"],
  [/plays voice \(ボイス再生\)/, "voice playback"],
  [/\(ability type \d+(?:\/\d+)?\)$/, "trigger not decoded (the ability type has no known trigger, so when it applies is unknown)"],
  [/attack method \(攻撃方法\)/, "attack pattern switch (single target / area), not a stat change"],
  [/activates ability #\d+/, "a class ability activating another ability: that ability's rows are ranked (unit JSON `activates`)"],
  [/stand motion|attack motion → variant|walking motion|walk-start motion|walk-end motion|visual effect #/, "animation only"],
  [/battle motion set →/, "attack animation set (hit count lives in the animation; not decoded)"],
  [/^Lasts [\d.]+s; effects listed below/, "header for the rows below it"],
  [/^Area effect, radius/, "header for the rows below it"],
  [/^Can be used on/, "who the stratagem can be used on (not an effect)"],
  [/^Whoever is placed there gets the effects below/, "header for the placement effects below it"],
  [/No formation effect of its own/, "placeholder (the quest-only rows are the effect)"],
  [/no effect \((?:an empty row|class-ability detail)/, "empty data row"],
  [/ability type 0\/0 0/, "empty data row"],
  [/\bstat \d+ set to \d+ \(always set by movement abilities/, "movement bookkeeping status (no traced effect)"],
  [/\bstat \d+ \(the game client never reads it\)/, "status the game client never reads"],
  [/can be targeted again|can be blocked again|can be healed again|no longer immune to|attacks lose|can \w+ again/, "an effect ending (removal), not a gain"],
  [/Can't be targeted by allies in Despair/, "side effect of Despair (allies can't heal / buff it)"],
  [/Doesn't attack/, "downside: the unit stops attacking"],
  [/unit change disabled \(ユニット変更無効\)/, "stratagem restriction"],
  [/Can't be used during a special attack/, "stratagem restriction"],
  [/on-hit effects last [\d.]+s \(着弾効果時間\)/, "timing of the on-hit effects listed beside it"],
  [/uses special attack #\d+/, "fires a special attack (its hit effects are not resolved from the stratagem)"],
  [/^(?:[^:]*: )?(?:ATK|DEF) [+−]0\b/, "a zero change (empty row)"],
  [/\bdamage 0× /, "a zero change (empty row)"],
  [/^Field effect: \(no decoded effect\)(, in an area of radius \d+.*)?$/, "a field row whose missile carries no effect (a visual-only missile)"],
];

function classify(line: string): Hit[] | null {
  const hits: Hit[] = [];
  for (const c of clauses(line)) for (const rule of RULES) { const h = rule(c, line); if (h) hits.push(...h.map((x) => ({ ...x, note: [...new Set([x.note, tailNote(c)].join(", ").split(", ").filter(Boolean))].join(", ") || undefined }))); }
  return hits.length ? hits : null;
}

/** Rows for the effects a sentence states without a stat change; returns whether it matched any. */
function utilityRows(u: number, t: number, sl: string, lines: string[], name: string | undefined, extraNote?: string,
  lineWho: ({ who: string; side: "ally" | "enemy" } | undefined)[] = [], sideOver?: "ally" | "enemy"): Set<number> {
  const matched = new Set<number>();
  lines.forEach((line, i) => {
    const hits = classify(line);
    if (!hits) return;
    const head = /^([A-Z★぀-鿿][^:]*?): /.exec(line)?.[1];
    const headWho = head && !/^(Missile #|Field effect|Special attack)/.test(head) ? head : undefined;
    const known = lineWho[i];
    for (const h of hits) {
      const [key, dir = "+", unit = ""] = h.key.split("|");
      keyNames.set(key, h.name ?? FIXED_NAMES[key] ?? statName(key));
      // who: the describer's receiver for the sentence, else its head; enemy-only effects (ailments,
      // knockback, damage) land on enemies even when the sentence names the giver ("Self: missile …")
      let who = key === "util:spot" ? "Chosen placement spot" : known?.who ?? headWho ?? "Target";
      let enemy = (sideOver ?? known?.side) === "enemy" || /^(All )?enem/i.test(who);
      if (h.enemyOnly && !enemy) continue;
      matched.add(i);
      if (h.enemy && !enemy) { who = /^On hit|missile #/.test(line) || known?.who === "Enemy hit" ? "Enemy hit" : "Enemies"; enemy = true; }
      const note = [h.note, extraNote].filter(Boolean).join("; ");
      rows.push({ u, t, sl, k: `${key}|${dir}|${unit}`, v: h.v, sd: enemy ? "e" : "a", w: who, ...(note ? { n: note } : {}), ...(name ? { nm: name } : {}) });
    }
  });
  return matched;
}

// coverage: every sentence is ranked (a stat change, a rule above, a hit count) or skipped for a reason
const shape = (l: string) => l.replace(/^[^:]*?: /, "").replace(/#\d+/g, "#N").replace(/\d+(?:\.\d+)?/g, "N").replace(/「[^」]*」/g, "「…」");
const UNCOVERED = new Map<string, { n: number; sl: Set<string>; ex: string[] }>();
const SKIPPED = new Map<string, { n: number; shapes: Map<string, string> }>();
let ranked = 0;
function track(u: number, sl: string, lines: string[], covered: Set<number>, name?: string, why = new Map<number, string>()) {
  lines.forEach((l, i) => {
    if (covered.has(i) || /attack motion #\d+: .+? per attack|missile #\d+: (?:[^;]*; )?hits \d+ times/.test(l)) { ranked++; return; }
    const skip = why.has(i) ? [/./, why.get(i)!] as const : SKIP.find(([re]) => re.test(l));
    if (skip) {
      const e = SKIPPED.get(skip[1]) ?? { n: 0, shapes: new Map() };
      e.n++; if (e.shapes.size < 6 && !e.shapes.has(shape(l))) e.shapes.set(shape(l), `${u} ${name ?? ""}: ${l}`);
      SKIPPED.set(skip[1], e);
      return;
    }
    const k = shape(l);
    const e = UNCOVERED.get(k) ?? { n: 0, sl: new Set(), ex: [] };
    e.n++; e.sl.add(sl); if (e.ex.length < 3) e.ex.push(`${u} ${name ?? ""}: ${l}`);
    UNCOVERED.set(k, e);
  });
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
  // the motion's own shot / spread missiles (motion_shots [ratio, area, missile, spread missile]): their
  // ailment and debuffs land on the enemy hit
  const ids = new Set<number>();
  for (const s of defs.motion_shots?.[Number(motion)] ?? []) for (const x of [s[2], s[3]]) if (x && x !== Number(missile)) ids.add(Number(x));
  for (const id of ids) emit(u, t, sl, [{ AbilityType: 6, AbilityTypeDetail: 2, AbilityAreaType: 1, AbilityTargetType: 2, EffectValue: id }], "ability", name);
}

function statName(key: string): string {
  if (key === "hits") return "Hits per attack";
  if (key === "dmg:dealt") return "Damage dealt";
  if (key === "dmg:taken") return "Damage taken";
  if (key === "dmg:bonus") return "Damage multiplier (attack bonus)";
  // limited to some attacks: "dmg:taken~magic" = Damage taken (from magic)
  const only = /^dmg:(dealt|taken)~(.+)$/.exec(key);
  if (only) return `Damage ${only[1]} (from ${only[2]})`;
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
    // a special attack's own settings while it fires (attack gap 700, attack speed 100%, targets 3): they
    // describe the attack, not a buff
    const own = (f: BuffFact) => f.dir === "=" && f.who === "Self" && /^status:20[678]$/.test(f.key) && (sl === "special_attack" || /^Special attack\b/.test(f.note ?? ""));
    const facts = (s.facts as BuffFact[]).filter((f) => !own(f));
    for (const f of facts) all.push({ ...f, text: s.text[f.line] ?? "" });
    const covered = utilityRows(u, t, sl, s.text, name, undefined, s.lineWho, side);
    for (const f of facts) if (f.v) covered.add(f.line);
    const why = new Map((s.facts as BuffFact[]).filter(own).map((f) => [f.line, "a special attack's own settings while it fires (attack gap, attack speed, targets)"]));
    track(u, sl, s.text, covered, name, why);
    multiHitRows(u, t, sl, s.text, name);
  });
  // a narrower group that also gets the group row (「[夏]は加算値1.5倍」): ranked with its total too
  for (const f of [...all, ...combinedFacts(all)]) {
    {
      if (!f.v) continue; // a zero change (empty rows) ranks nothing
      const sd = (side ?? f.side) === "enemy" ? "e" : "a";
      const k = `${f.key}|${f.dir}|${f.unit}`;
      keyNames.set(f.key, statName(f.key));
      // EachGrowUp (「巨大化毎に」): the amount per giantification stage, so at full size it is the row's value
      // times her highest grade (5 for most, 9 for 九龍城砦); ranked at that maximum
      const perGiant = !f.max && f.unit !== "×" && /per giantification/.test(`${f.note ?? ""} ${f.text}`);
      rows.push({
        u, t, sl, k, v: f.v, sd, w: f.who,
        // LimitValue 9999 / 10000 / 999999: the texts give no cap (e.g. さらに5%ずつ上昇): ranked by the step
        ...(f.max && f.max >= 9999 ? { nc: 1 as const } : f.max ? { mx: f.max } : perGiant ? { mx: f.v * gradeAt(u, t), pg: 1 as const } : {}), ...(f.note ? { n: f.note } : {}),
        ...(f.stack ? { st: f.stack === "stacks" ? 1 : f.stack === "doesn't stack" ? 0 : f.stack } : {}),
        ...(name ? { nm: name } : {}),
      });
    }
  }
}

const ability = (u: number, t: number, sl: string, a: Ability | null | undefined, kind: RowKind = "ability") => {
  if (!a || a.missing) return;
  emit(u, t, sl, a.effects, kind, a.name, undefined, a.field_links);
  // a field's continuation rows (more missiles in the same field): the same row again with each one
  for (const [i, fl] of Object.entries(a.field_links ?? {})) {
    for (const m of fl.more ?? []) emit(u, t, sl, [a.effects![Number(i)]], kind, a.name, undefined, { 0: { ...m, field_id: fl.field_id } });
  }
  // abilities its class-ability rows activate (陣貝クラス特技 -> 気還元率上昇【全城娘】・弐): what she actually gives
  for (const sub of Object.values(a.activates ?? {})) emit(u, t, sl, sub.effects, "ability", `${a.name} → ${sub.name}`, undefined, sub.field_links);
};

// Possession abilities (所持) aimed at a group of castle girls: who they buff, as a match rule read from
// the exe-decoded target label (src "exe" ex: "weapon type == 5", "Card.AreaType == 7",
// "Card.Tokusei1/2/3 == 2", "castle type in [8, 9, …]", "… = InstallationCastleTypeLimit ID 17 '無属性を含む' {16, 13}").
// Lord / enemy / all-castle-girl rows (gold, EXP, enemy debuffs) are left out: they name no group.
const possessions: PossessionSource[] = [];
const possessionRules: Record<string, PossessionRule> = {};
const unruled = new Set<number>();
function possessionRule(code: number): PossessionRule | null {
  if (code in possessionRules) return possessionRules[code];
  const l = defs.labels[`target:${code}`];
  const ex = l?.src === "exe" ? l.ex?.[0] ?? "" : "";
  let m: RegExpExecArray | null;
  let rule: PossessionRule | null = null;
  if ((m = /^weapon type == (\d+)/.exec(ex))) rule = { weapon: [Number(m[1])] };
  else if ((m = /^Card\.AreaType == (\d+)/.exec(ex))) rule = { region: [Number(m[1])] };
  else if ((m = /^Card\.Tokusei1\/2\/3 == (\d+)/.exec(ex))) rule = { trait: [Number(m[1])] };
  else if ((m = /^castle type in \[([\d, ]+)\]/.exec(ex)) || (m = /castle type .*\{([\d, ]+)\}\s*$/.exec(ex))) {
    rule = { terrain: m[1].split(",").map(Number) };
  }
  if (rule) possessionRules[code] = { ...rule, jp: l!.jp };
  return rule;
}

// Text audit: the game's own description of every ability / stratagem / special attack / token says what it
// does. Each effect a description names must have a ranked row from that same ability (same castle girl,
// same name), else it is listed in tools/out/buff_coverage.md. This catches data the builder never reads,
// which the sentence coverage above cannot see.
const AUDIT_AIL: [string, string][] = [["麻痺", "Paralysis"], ["混乱", "Confusion"], ["火傷", "Burn"], ["猛毒", "Deadly Poison"],
  ["暗闇", "Darkness"], ["氷結", "Freeze"], ["絶望", "Despair"], ["沈黙", "Silence"], ["服従", "Submission"], ["希望", "Hope"]];
// a stat word in a subject list ("攻撃と防御が…上昇") -> the key prefixes that rank it
const STAT_WORDS: [RegExp, string[]][] = [
  [/計略(の)?ダメージ$/, ["status:10106", "status:113"]], [/術ダメージ$/, ["dmg:taken~magic", "dmg:dealt~magic", "dmg:", "dmgfx:"]],
  [/特殊攻撃(の|で与える)ダメージ$/, ["status:212", "dmg:"]],
  [/攻撃速度$/, ["status:206"]], [/(攻撃後の)?隙$/, ["status:207"]], [/攻撃対象(数)?$/, ["status:208"]],
  [/(移動速度|移動)$/, ["status:401", "util:stop", "util:inflict:Paralysis"]], [/(被ダメージ|被ダメ|受けるダメージ)$/, ["dmg:taken", "status:302", "status:305"]], [/(与ダメージ|与ダメ|与えるダメージ|ダメージ)$/, ["dmg:dealt", "dmg:bonus", "status:212", "status:210", "counter:reflect", "dmgfx:", "hits"]],
  [/最大耐久$|耐久$/, ["status:101", "status:102", "util:inflict:constant HP loss", "dmgfx:curhp", "dmgfx:maxhp"]], [/回復$/, ["status:103", "heal:", "status:202"]],
  [/優先攻撃対象$/, ["status:314"]], [/射程$/, ["status:205"]], [/足止め(数)?$/, ["status:303"]],
  [/防御$/, ["status:301", "status:302"]], [/^(自身の|城娘の|敵の|味方の)?攻撃$/, ["status:202", "dmg:bonus"]],
  [/計略(の)?(再使用時間|使用までの時間)$/, ["status:10104", "status:10101", "status:10102", "status:10107"]], [/消費気$/, ["status:10207", "status:10208", "status:10452", "status:10501"]],
  [/再配置(までの)?(時間)?$/, ["status:106"]], [/撃破(時)?(獲得)?気$/, ["status:10206"]],
];
const AUDIT: [RegExp, string, string[]][] = [
  ...AUDIT_AIL.map(([jp, en]) => [new RegExp(`「${jp}」(?:状態)?(?:に(?:する|し|させ|なる|なり)|を付与)`), `inflicts ${jp}`, [`util:inflict:${en}`]] as [RegExp, string, string[]]),
  ...AUDIT_AIL.map(([jp, en]) => [new RegExp(`「${jp}」が無効化されない`), `${jp} immunity pierced`, [`util:pierce:${en}`]] as [RegExp, string, string[]]),
  [/状態異常(に)?ならない|状態異常(を)?無効|」(?:状態)?(?:を)?無効(?!化されない)|」にならない/, "ailment immunity", ["util:immune:"]],
  [/反射/, "reflect", ["counter:reflect"]],
  [/反撃/, "counter", ["counter:own", "counter:reflect"]],
  [/後退/, "knockback", ["util:knockback"]],
  // 「動きを封じる」 is the game's 麻痺 (Paralysis): its rows inflict CrowdControlType 1
  [/動きを封じ|移動速度(?:を|が)?[^、。､｡]{0,8}0に/, "can't move", ["util:stop", "status:401", "util:inflict:Paralysis"]],
  [/狙われない/, "can't be targeted", ["util:untargetable"]],
  // 「大破しない「希望」状態にする」: the Hope ailment
  [/大破しない|耐久が0にならない/, "can't be knocked out", ["util:guts", "util:undying", "util:inflict:Hope"]],
  [/回避/, "evasion", ["evade"]],
  [/バリア/, "barrier", ["barrier"]],
  [/以下のダメージを無効/, "nullify", ["nullify"]],
  [/天候の影響を受けず|天候(の影響)?(を)?無効/, "weather immunity", ["util:weather"]],
  [/大破数に含まれない|撤退数に含まれない|大破数にカウントされない/, "not counted as fallen", ["util:nofall"]],
  // only where the text grants magic attacks (「術攻撃に変化」, 「攻撃が術属性」), not 「術ダメージを軽減」 or a unit's own magic attack
  [/術攻撃(?:に|と)(?:な|変化)|攻撃が術|術属性/, "magic", ["util:prop:magic", "dmgfx:"]],
  [/防御(を)?無視/, "DEF ignore", ["status:203"]],
  [/倍の(?:術)?(?:防御無視)?ダメージを与え|ダメージを与える/, "damage", ["dmgfx:", "dmg:", "hits", "status:202", "util:prop:"]],
  // heals: a heal field (heal ×ATK), regen, a healer's attack multiplier (「1.5倍の攻撃で回復」 = ATK ×1.5),
  // lifesteal (「与ダメージの30%回復」, status 211), a gauge refill (「特殊攻撃ゲージが即時回復」, status 502)
  [/回復(する|させる|を行)|で回復/, "heal", ["heal:", "status:103", "status:102", "status:101", "status:202", "status:211", "status:502", "status:104"]],
];
interface AuditSrc { u: number; name: string; desc: string }
// Checked by hand: the text names it, and why no row ranks it. [castle girl, ability name, effect, reason]
const INHERENT_DEF_IGNORE = "her weapon type ignores DEF (WeaponType.IgnoreArmor, like every 杖 / 法術): her own attack, not a buff";
const AUDIT_EXPLAINED: [number, string, string, string][] = [
  [7747, "カリバーンの暴風", "DEF ignore", INHERENT_DEF_IGNORE],
  [9013, "もう何も恐くない", "DEF ignore", INHERENT_DEF_IGNORE],
  [9221, "大仙人", "DEF ignore", INHERENT_DEF_IGNORE],
  [9242, "竜王の顎", "DEF ignore", INHERENT_DEF_IGNORE],
  [9243, "ベクトル操作", "DEF ignore", `${INHERENT_DEF_IGNORE} (her transformed weapon 禁書目録変身)`],
  [9032, "シュタルクハドロン", "DEF ignore", `${INHERENT_DEF_IGNORE} (her transformed weapon モルドレッド[アーニャ変身])`],
  [9032, "おしまい、かくれんぼは", "DEF ignore", `${INHERENT_DEF_IGNORE} (her transformed weapon モルドレッド[アーニャ変身])`],
  [9056, "超高校級のギャンブラー", "DEF ignore", "its 「防御無視」 random shot is missile 92008, a magic (術) hit ×1 ATK, and magic ignores DEF: ranked as Extra damage ×1 (magic)"],
  [3122, "夢双の休日", "DEF ignore", "not in the game data: ability 7536's only row plays a voice; the text describes effects no row has"],
  [964, "ステュクスの神誓", "撃破獲得気 change", "not in the game data: the formation rows (OrganizedAbility 964) hold only HP / ATK / DEF +10%"],
  [9221, "王国を守護せし者", "reflect", "not in the game data: the ambush unit's ability 99226 rows are only ATK +100 and DEF +100"],
  [9191, "超高校級の軍人", "can't be targeted", "not in the game data: ability 99191 rows are an attack bonus and ATK ×2 (target 2002), no untargetable row"],
  [9112, "鷲獅子の舞", "移動速度 change", "not in the game data: the only row is 「DEF −30% of the giver's ATK」"],
  [9112, "50%の確率で攻撃対象増加", "確率で与えるダメージ change", "the ×1.5 is the direct-hit bonus at a 40% chance: ranked as Direct-hit bonus (40% chance)"],
  [710, "カラアトゥ・アル・ホスン", "秒間対象が優先攻撃対象 change", "ranked: taunt (status 314) and damage taken −75%; the audit misreads the sentence"],
  [710, "聖地への鍵", "秒間対象が優先攻撃対象 change", "ranked: taunt (status 314) and damage taken −75%; the audit misreads the sentence"],
  [9023, "鉄壁のクルセイダー", "攻撃 change", "ranked: 「攻撃を受けた後3秒間防御30%上昇」 = DEF +30% each time attacked (the game text has a typo)"],
  [781, "新春破魔矢", "攻撃 change", "ranked: anti-yokai ×2 (status 214); the audit misreads 「攻撃が妖怪に対して2倍」"],
  [9076, "固有魔法：弾道安定", "耐久 change", "ranked: a damage multiplier against enemies at full HP (attack bonus); not an HP change"],
  [3133, "ロンギヌスの一閃", "射程 change", "special-attack stock scaling (攻撃と射程がストック数で上昇): a property of the special attack, not a buff"],
  [3133, "ロンギヌスの永傷一閃", "射程 change", "special-attack stock scaling (攻撃と射程がストック数で上昇): a property of the special attack, not a buff"],
  [398, "湖岸浸食", "damage", "an attack-shape change (splash instead of piercing; spread missile with no extra effect)"],
  [833, "金龍長城", "回目以降は消費気 change", "a Ki-cost property of the stratagem set: its 2nd member costs 7 Ki instead of 12 (GimmickSet members 8096 / 8097)"],
  [833, "金龍飛天", "回目以降は消費気 change", "a Ki-cost property of the stratagem set: its 2nd member costs 7 Ki instead of 12 (GimmickSet members 8101 / 8102)"],
  [3064, "連鎖型要塞の防壁", "回目以降は消費気 change", "a Ki-cost property of the stratagem set: its 2nd member costs 4 Ki instead of 7 (GimmickSet members 8332 / 8333)"],
  [9053, "超高校級の文学少女", "攻撃速度 change", "the decrease over time is Reversal (反転化) of her growing buffs: ranked as Reversal"],
  [9053, "クシャミ", "攻撃速度 change", "the decrease over time is Reversal (反転化) of her growing buffs: ranked as Reversal"],
  [998, "復活の校章旗", "隙 change", "her special attack uses motion 99270, which is not in WeaponMotion.aar (the only attack-motion archive the client lists)"],
  [998, "奇跡の校章旗", "隙 change", "her special attack uses motion 99281, which is not in WeaponMotion.aar (the only attack-motion archive the client lists)"],
];
const explainedOf = (u: number, name: string, what: string) => AUDIT_EXPLAINED.find(([eu, en, ew]) => eu === u && en === name && ew === what)?.[3];
const auditSrc: AuditSrc[] = [];
function collectAudit(u: number, o: unknown, key = "") {
  if (!o || typeof o !== "object" || ["potential", "always", "quest", "transform_of", "raw", "class"].includes(key)) return;
  if (Array.isArray(o)) { for (const x of o) collectAudit(u, x, key); return; }
  const r = o as Record<string, unknown>;
  if (typeof r.name === "string" && typeof r.description === "string" && r.description && ("effects" in r || "effect" in r || "field" in r || "placement" in r))
    auditSrc.push({ u, name: r.name, desc: r.description.replace(/\s+/g, "") });
  for (const [k, v] of Object.entries(r)) collectAudit(u, v, k);
}
function auditReport(): string[] {
  const byU = new Map<number, BuffRow[]>();
  for (const r of rows) byU.set(r.u, [...(byU.get(r.u) || []), r]);
  const nameOf = new Map(index.map((e) => [e.id, e.name]));
  const miss = new Map<string, string[]>();
  const explained: string[] = [];
  const seen = new Set<string>();
  for (const s of auditSrc) {
    const mine = (byU.get(s.u) || []).filter((r) => r.nm && (r.nm === s.name || r.nm.endsWith(` · ${s.name}`) || r.nm.startsWith(`${s.name} → `) || r.nm.endsWith(` → ${s.name}`)));
    // found under any of her abilities: the effect may live in another table than the text (a formation text
    // whose rows are her general ability's, a stratagem that transforms her into a twin with its own names)
    const all = byU.get(s.u) || [];
    const has = (pre: string[]) => all.some((r) => pre.some((p) => r.k.startsWith(p)));
    const want: [string, string[], string][] = [];
    for (const [re, what, keys] of AUDIT) { const m = re.exec(s.desc); if (m) want.push([what, keys, m[0]]); }
    // stat changes: "攻撃と防御が20%上昇", "射程内の敵の移動速度が5秒間70％低下"
    // 「耐久が高い程与えるダメージが上昇」: a condition on a damage multiplier, not an HP change
    if (/(?<!レアリティ)(?:が|の)(?:高い|低い)(?:程|ほど)/.test(s.desc)) want.push(["damage by a stat's level", ["dmg:bonus", "dmg:dealt"], /[^、。､｡]{0,12}(?:高い|低い)(?:程|ほど)[^、。､｡]{0,12}/.exec(s.desc)![0]]);
    // 「敵の防御を5%無視」 is DEF ignore (its own check above), not a DEF change
    const desc = s.desc.replace(/[^、。､｡]{0,12}(?:が|の)(?:高い|低い)(?:程|ほど)[^、。､｡]*/g, "").replace(/防御を?[\d.]*%?無視/g, "");
    for (const m of desc.matchAll(/([^、。､｡()（）「」\d%％]{1,30}?)(?:が|を)(?:[^、。､｡]{0,14}?)(?:上昇|低下|増加|減少|短縮|軽減|倍に|倍(?=[、。､｡]|$))/g)) {
      for (const part of m[1].split(/[と、､･・や]/)) {
        const w = part.replace(/^.*の/, "");
        const hit = STAT_WORDS.find(([re]) => re.test(part.replace(/^.*?の(?=計略|特殊攻撃|術)/, ""))) ?? STAT_WORDS.find(([re]) => re.test(w));
        if (hit) want.push([`${w} change`, hit[1], m[0]]);
      }
    }
    for (const [what, keys, snip] of want) {
      const id = `${s.u}|${s.name}|${what}`;
      if (seen.has(id) || has(keys)) continue;
      seen.add(id);
      const why = explainedOf(s.u, s.name, what);
      if (why) { explained.push(`${s.u} ${nameOf.get(s.u)} · ${s.name} · ${what}: ${why}`); continue; }
      const got = [...new Set(mine.map((r) => r.k.replace(/\|.*/, "")))].join(" ");
      miss.set(what, [...(miss.get(what) || []), `${s.u} ${nameOf.get(s.u)} · ${s.name}: …${snip}… (${s.desc.slice(0, 90)}) [ranked: ${got || "nothing"}]`]);
    }
  }
  const md = ["## Text says it, nothing ranked", "", "Each line: the game's description names an effect, but no ranked row comes from that ability.", ""];
  for (const [what, list] of [...miss].sort((a, b) => b[1].length - a[1].length)) md.push(`- **${list.length}** ${what}`, ...list.map((x) => `  - ${x}`));
  if (!miss.size) md.push("(none)");
  md.push("", "### Checked by hand (text names it, no row ranks it, and why)", "", ...explained.map((x) => `- ${x}`));
  return md;
}

/** An ambush unit's own card (its class: attack missile, class ability), when exported. */
const tokenCards = new Map<number, UnitDetail | null>();
function tokenCard(id: number | undefined): UnitDetail | null {
  if (!id) return null;
  if (!tokenCards.has(id)) {
    const p = path.join(root, "public/data/unit", `${id}.json`);
    tokenCards.set(id, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
  }
  return tokenCards.get(id)!;
}

/** A special attack: its ability rows, its own shot (and the motion's shots), its hit count. */
function specialAttackRows(u: number, t: number, sa: UnitDetail["forms"][number]["special_attack"]) {
  if (sa?.ability) ability(u, t, "special_attack", sa.ability);
    // special attack hits: its AttackMotionID's shots x (1 + its missile's DamageRepeatNum)
    // the special attack's own shot (SpecialAttack.MissileID / SpreadMissileID): its ailment and debuffs on the enemy hit
    // (ヴァヴェル城 「5秒間「火傷」状態にする」)
    if (sa?.raw) {
      const at = rows.length;
      emit(u, t, "special_attack", [sa.raw], "special_attack", sa.ability?.name);
      // a healing special attack (戦棍 「射程内の殿と城娘全てに回復を行い10秒間防御を70上昇」): its shot hits the
      // allies it heals, so the shot's changes are theirs. No table marks heal shots (Missile.HealEffect is unset on
      // them), so the game's own special-attack text decides
      if (/回復を行/.test(sa.ability?.description ?? "")) {
        // only its gains: debuffs, ailments and damage still land on enemies
        for (const r of rows.slice(at)) {
          const [key, dir] = r.k.split("|");
          const harm = dir === "-" || /^(dmgfx:|util:(inflict|knockback|stop|pierce|noheal|healdmg))/.test(key);
          if (r.w === "Enemy hit" && !harm) { r.w = "Castle girls healed"; r.sd = "a"; }
        }
      }
    }
    if (sa?.raw) motionRow(u, t, "special_attack", sa.raw.AttackMotionID, sa.raw.MissileID, sa.ability?.name);
  // stronger grades at higher stock (continuation rows): their own shot and ability, ranked as the same special attack
  for (const g of sa?.grades ?? []) {
    const nm = `${sa?.ability?.name ?? "special attack"} (stock grade ${g.grade})`;
    specialAttackRows(u, t, { id: sa!.id, raw: g.raw, ability: g.ability ? { ...g.ability, name: nm } : sa?.ability ? { ...sa.ability, effects: [], name: nm } : undefined });
  }
}

/** Stratagems: placement spots, fields, the EnchantEffect and its sets, and the ambush units they place. */
function stratagemRows(u: number, t: number, list: Stratagem[] | undefined) {
    for (const s of list ?? []) {
      // GimmickType 4: the spot it changes buffs whoever is placed there
      if (s.placement) {
        const gives = s.placement.effects.map((r) => describeRow(r, "placement", defs).text.join(" · ").replace(/^[^:]*: /, "")).join(", ");
        const lines = describeRow(s.placement.location, "location", defs).text;
        const spots = lines.find((l) => l.startsWith("Can be used on: "))?.slice("Can be used on: ".length);
        utilityRows(u, t, "stratagem", lines, s.name, [gives && `placed unit: ${gives}`, spots && `on ${spots}`].filter(Boolean).join("; ") || undefined);
      }
      if (s.placement?.effects.length) emit(u, t, "stratagem", s.placement.effects, "placement", s.name, "ally");
      // GimmickType 3: a field at the chosen spot (damage + ailment + debuffs: 業火の刑 「範囲内の敵に攻撃の6倍の
      // ダメージを与え､7秒間「火傷」にする」; heals; support). FieldEffectType 3 is the area of the stratagem's own
      // EnchantEffect (described from s.effect below), so it is not read twice
      if (s.field) {
        // the id row and its continuation rows: each fires its own missile (天一生水: 2104 移動速度0 + 2105 攻撃/防御−50%);
        // a type-3 id row is the enchant's area (described from s.effect), its continuation rows are missile fields
        // (やっさ祭り 2074 = 「範囲内の敵の移動速度が50%低下」)
        const ownRow = Number(s.field.field.FieldEffectType) !== 3 ? [s.field] : [];
        // a type-3 continuation row is another enchant over the same area: ranked like the stratagem's own
        for (const m of s.field.more ?? []) {
          if (m.effect) stratagemRows(u, t, [{ ...s, token: undefined, placement: undefined, effect: m.effect, field: { field_id: s.field.field_id, field: m.field, missile: {} } }]);
        }
        for (const fl of [...ownRow, ...(s.field.more ?? []).filter((m) => !m.effect).map((m) => ({ ...m, field_id: s.field!.field_id }))]) {
          emit(u, t, "stratagem", [{ AbilityType: 21 }], "ability", s.name, undefined, { 0: fl });
        }
      }
      if (!s.effect) continue;
      // EnchantEffect.TargetType 2 = 自分のみ (its texts: 自分のみが対象)
      const ctx = stratagemContext(defs, s);
      // EnchantEffect.AttackMotionID: the stratagem switches the attack motion (海割れ: 2連続攻撃になり)
      motionRow(u, t, "stratagem", s.effect.row.AttackMotionID, 0, s.name, Number(s.effect.row.TargetType) === 2 ? "Self" : "Target");
      emit(u, t, "stratagem", [s.effect.row], "enchant", s.name, undefined, undefined, ctx);
      // the special attack the stratagem fires (EnchantEffect.SpecialAttackID)
      if (s.effect.special_attack) {
        const at = rows.length;
        specialAttackRows(u, t, { ...s.effect.special_attack, ability: s.effect.special_attack.ability && { ...s.effect.special_attack.ability, name: s.name } });
        for (const r of rows.slice(at)) r.sl = "stratagem";
      }
      emit(u, t, "stratagem", s.effect.AllyEffectSetID, "enchant_set", s.name, "ally", undefined, ctx);
      emit(u, t, "stratagem", s.effect.OpponentEffectSetID, "enchant_set", s.name, "enemy", undefined, ctx);
    }
    // ambush units (伏兵) a stratagem places: their own abilities buff and debuff too
    for (const s of list ?? []) {
      if (s.token) {
        // TokenConfig.DeployLimit: how many can be out at once (matches every 「(N体まで)」 text, 154 of 154;
        // tokens without it never state a cap)
        const lim = Number(s.token.config?.DeployLimit) || 0;
        const tag = `${s.token.name} (伏兵) · ${lim ? `max ${lim} placed at once` : "no placement limit"} · from ${s.name}`;
        for (const a of [s.token.ability, s.token.general_ability]) if (a && !a.missing) ability(u, t, "token", { ...a, name: `${tag} · ${a.name}` });
        // the ambush unit's own attack: its card's class fires Class.MissileID, whose changes land on the enemy hit
        // (オバケ missile 27 = 「攻撃した敵の移動速度が1.8秒間70%低下」), plus that card's class ability
        const card = tokenCard(s.token.card_id);
        const shot = Number(card?.class?.MissileID) || 0;
        const aName = s.token.ability?.name ?? s.token.name;
        if (shot) emit(u, t, "token", [{ AbilityType: 6, AbilityTypeDetail: 2, AbilityAreaType: 1, AbilityTargetType: 2, EffectValue: shot }], "ability", `${tag} · ${aName}`);
        if (card?.class_ability && !card.class_ability.missing) ability(u, t, "token", { ...card.class_ability, name: `${tag} · ${card.class_ability.name}` });
        // the ambush unit card's own special attack and weapon (アクセラレータ 9249: special attack missile 99430)
        if (card) {
          const at = rows.length;
          for (const f of card.forms) specialAttackRows(u, t, f.special_attack && { ...f.special_attack, ability: f.special_attack.ability && { ...f.special_attack.ability, name: `${tag} · ${f.special_attack.ability.name}` } });
          for (const m of card.weapon_motions ?? []) motionRow(u, t, "token", m, 0, `${tag} · ${aName}`);
          for (const m of card.weapon_shots ?? []) emit(u, t, "token", [{ AbilityType: 6, AbilityTypeDetail: 2, AbilityAreaType: 1, AbilityTargetType: 2, EffectValue: m }], "ability", `${tag} · ${aName}`);
          for (const r of rows.slice(at)) if (r.sl === "special_attack") r.sl = "token";
        }
      }
    }
  }

let units = 0;
for (const entry of index) {
  // playable cards only: no NPC / duplicate entries, and transformed states belong to their stratagem
  if (entry.npc || entry.dup_of || entry.transform_of) continue;
  const u: UnitDetail = data(`unit/${entry.id}.json`);
  collectAudit(u.id, u);
  const tiers = Array.from({ length: Math.min(2, Number(u.max_renovation) || 0) + 1 }, (_, r) => maxGrade(growth, u.raw, r as Reno) || 5);
  grades.set(u.id, tiers);
  const before = rows.length;
  for (const f of u.forms) {
    ability(u.id, f.tier, "skill", f.ability);
    ability(u.id, f.tier, "formation", f.organized, "organized");
    ability(u.id, f.tier, "possession", f.possessed);
    ability(u.id, f.tier, "defeat", f.defeated);
    // f.always is the card's own stat profile (ATK/DEF/HP +8%, cost…), not a buff it gives: left out
    specialAttackRows(u.id, f.tier, f.special_attack);
    stratagemRows(u.id, f.tier, f.stratagems);
  }
  // the weapon's own attack: WeaponType description 「敵1体に2連続攻撃を行い」 (双剣)
  const wHits = /(\d+)連続攻撃/.exec(u.weapon?.description ?? "");
  if (wHits && Number(wHits[1]) > 1) {
    rows.push({ u: u.id, t: -1, sl: "weapon", k: "hits|+|hits", v: Number(wHits[1]), sd: "a", w: "Self", n: u.weapon.description, nm: u.weapon.name ?? undefined });
  }
  ability(u.id, -1, "class", u.class_ability);
  ability(u.id, -1, "class", u.sub_class?.class_ability);
  ability(u.id, -1, "special", u.special_ability?.sub_ability);
  // the card's own innate abilities (Card.GeneralAbilityID1 「舟マス配置、移動可能」, BeforeAttackAbilityID, the
  // moving attack 「周囲の敵に攻撃の4倍のダメージを与え、移動速度を5秒間70％低下」 + its shot): ranked with the class ability
  ability(u.id, -1, "class", u.general_ability);
  // her weapon's attack motion: its shots' own missiles
  for (const m of u.weapon_motions ?? []) motionRow(u.id, -1, "weapon", m, 0, u.dedicated_weapon?.name ?? u.weapon?.name ?? undefined);
  // her weapon's own shots (Weapon.MissileID / MissileSetID: セレスティア's random shot set): on the enemy hit
  for (const m of u.weapon_shots ?? []) emit(u.id, -1, "weapon", [{ AbilityType: 6, AbilityTypeDetail: 2, AbilityAreaType: 1, AbilityTargetType: 2, EffectValue: m }], "ability", u.dedicated_weapon?.name ?? u.weapon?.name ?? undefined);
  ability(u.id, -1, "class", u.before_attack);
  if (u.moving_attack?.ability) ability(u.id, -1, "class", u.moving_attack.ability);
  if (u.moving_attack?.raw) emit(u.id, -1, "class", [u.moving_attack.raw], "special_attack", u.moving_attack.ability?.name);
  // its transformed twin (the special ability / stratagem turns it into a CardType-15 card): that card's
  // specialty per renovation tier, stratagem effects and special ability count in the matching slot, so a
  // stronger twin value only raises her best for that stat (no separate entry)
  // a healing weapon (WeaponType.Heal: 歌舞, 祓串, 医薬品[罪木蜜柑]) fires at both sides: its gains (医薬品 「回復+100」)
  // land on the allies it heals; its debuffs, ailments and damage (祓串's slow) stay on the enemy hit
  const healShots = (at: number, heal: boolean | null | undefined) => {
    if (!heal) return;
    for (const r of rows.slice(at)) {
      const [key, dir] = r.k.split("|");
      const harm = dir === "-" || /^(dmgfx:|util:(inflict|knockback|stop|pierce|noheal|healdmg))/.test(key);
      if (r.sl === "weapon" && r.w === "Enemy hit" && !harm) { r.w = "Castle girls healed"; r.sd = "a"; }
    }
  };
  healShots(before, u.weapon_heal);
  const tw = u.transform_into;
  const twAt = rows.length;
  if (tw) {
    if (tw.ability_tiers?.length) {
      ability(u.id, 0, "skill", tw.ability);
      for (const x of tw.ability_tiers) ability(u.id, x.tier, "skill", x.ability);
    } else ability(u.id, -1, "skill", tw.ability);
    ability(u.id, -1, "stratagem", tw.general_ability);
    ability(u.id, -1, "special", tw.special_ability?.sub_ability);
    // the twin's own class (and sub class) ability: what she has while transformed
    ability(u.id, -1, "class", tw.main_class?.class_ability);
    ability(u.id, -1, "class", tw.sub_class?.class_ability);
    // what the twin fires and uses while transformed (リチャード１世's twin: special attack missile 3650 = 「大きく後退」)
    specialAttackRows(u.id, -1, tw.special_attack);
    // the twin's weapon attack motion: its shots' own missiles (真岡城's twin: 「攻撃した敵の移動速度を1秒間0にする」)
    for (const m of tw.weapon_motions ?? []) motionRow(u.id, -1, "weapon", m, 0, `${tw.name} (transformed)`);
    // the twin's weapon shots: her attacks while transformed (シバルバー's 「10秒間「氷結」」, 九龍城砦's 「後退させる」)
    for (const m of tw.weapon_shots ?? []) emit(u.id, -1, "weapon", [{ AbilityType: 6, AbilityTypeDetail: 2, AbilityAreaType: 1, AbilityTargetType: 2, EffectValue: m }], "ability", `${tw.name} (transformed)`);
    stratagemRows(u.id, -1, tw.stratagems);
    ability(u.id, -1, "class", tw.before_attack);
    if (tw.moving_attack?.ability) ability(u.id, -1, "class", tw.moving_attack.ability);
    if (tw.moving_attack?.raw) emit(u.id, -1, "class", [tw.moving_attack.raw], "special_attack", tw.moving_attack.ability?.name);
  }
  // a class-ability 6/5 row with a card id turns her into that card ([お月見]松本城 at max giantification -> card
  // 6935, whose skill adds 「最大化時､自身の射程が80上昇､飛行敵以外に狙われず全マス移動可能」): that card's abilities
  // are hers while it lasts. (6/5 with value 1 is her own twin, read above.)
  const altCards = new Set<number>();
  const findAlt = (o: unknown): void => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(findAlt); return; }
    const r = o as Record<string, unknown>;
    if (r.AbilityType === 6 && r.AbilityTypeDetail === 5 && Number(r.EffectValue) > 1) altCards.add(Number(r.EffectValue));
    for (const v of Object.values(r)) findAlt(v);
  };
  findAlt(u.forms);
  findAlt(u.special_ability);
  for (const cid of altCards) {
    const alt = tokenCard(cid);
    if (!alt || cid === u.id) continue;
    const tag = (n: string | undefined) => `${n ?? alt.name} (as card #${cid})`;
    for (const f of alt.forms) {
      ability(u.id, -1, "skill", f.ability && { ...f.ability, name: tag(f.ability.name) });
      specialAttackRows(u.id, -1, f.special_attack);
    }
    ability(u.id, -1, "class", alt.class_ability && { ...alt.class_ability, name: tag(alt.class_ability.name) });
    ability(u.id, -1, "class", alt.general_ability && { ...alt.general_ability, name: tag(alt.general_ability.name) });
  }
  if (tw) healShots(twAt, tw.weapon_heal);
  if (rows.length > before) units++;
  for (const f of u.forms) {
    const p = f.possessed;
    if (!p || p.missing || !p.effects?.length) continue;
    const codes = new Set<number>();
    for (const r of p.effects) {
      const code = Number(r.AbilityTargetType) || 0;
      if (!code || [1, 4, 11].includes(code)) continue; // lord, enemies, every castle girl
      if (possessionRule(code)) codes.add(code); else unruled.add(code);
    }
    if (codes.size) possessions.push({ u: u.id, t: f.tier, id: p.id, name: p.name, desc: p.description, targets: [...codes], effects: p.effects });
  }
}

// Equipment (weapons.json, Weapon.Type 0: what any castle girl of the weapon type can equip): its ability rows,
// read like a castle girl's ability. Kept apart (buffs.json "eq", u = weapon id): the team builder and the castle
// girl counts read only the castle girls' rows. A castle-girl bonus (Weapon special: only on the castles it names)
// is ranked too, with those castles in sp.
const eqRows: BuffRow[] = [];
for (const w of (data("weapons.json") as WeaponData).weapons) {
  if (w.kind !== 0) continue;
  for (const [list, sp] of [[w.ability, undefined], [w.special?.ability ?? [], w.special?.castles]] as const) {
    if (!list.length) continue;
    // UnitEffect type 2 (「攻撃した敵の防御が3秒間8%低下」): worded "Self: on the unit it hits: …", so its
    // changes land on the enemy hit, not on the wielder
    const conv = weaponAbilityRows(list, defs);
    const onHit = (r: RawRow) => defs.unit_effect[String(r.UnitEffectID)]?.[0] === 2;
    for (const [part, hit] of [[conv.filter((r) => !onHit(r)), false], [conv.filter(onHit), true]] as const) {
      if (!part.length) continue;
      const at = rows.length;
      emit(w.id, -1, "equipment", part, "ability", w.name);
      for (const r of rows.splice(at)) {
        delete r.nm;
        if (hit && r.w === "Self") { r.w = "Enemy hit"; r.sd = "e"; }
        eqRows.push(sp?.length ? { ...r, sp: [...sp] } : r);
      }
    }
  }
}
const seenEq = new Set<string>();
const eq = eqRows.filter((r) => { const j = JSON.stringify(r); return !seenEq.has(j) && !!seenEq.add(j); });

// the same change listed twice (e.g. a skill repeated in a later form) counts once
const seenRow = new Set<string>();
const unique = rows.filter((r) => { const j = JSON.stringify(r); return !seenRow.has(j) && !!seenRow.add(j); });
rows.length = 0;
rows.push(...unique);
const keys = Object.fromEntries([...keyNames.entries()].sort());
const out = path.join(root, "public/data/buffs.json");
const gm = Object.fromEntries([...grades].filter(([, g]) => g.some((x) => x !== 5)));
fs.writeFileSync(out, JSON.stringify({ keys, rows, gm, eq }));
// who each receiver text reaches, for the team builder (src/reach.ts): "a|<text>" / "e|<text>" -> rule
const parseReach = reachParser(data("meta.json"));
const reach: Record<string, ReachRule> = {};
const unparsed = new Set<string>();
for (const r of rows) {
  const k = `${r.sd}|${r.w}`;
  if (k in reach || unparsed.has(k)) continue;
  const rule = parseReach(r.w, r.sd === "e");
  if (rule) reach[k] = rule; else unparsed.add(k);
}
fs.writeFileSync(path.join(root, "public/data/reach.json"), JSON.stringify(reach));
console.log(`${Object.keys(reach).length} receivers -> public/data/reach.json${unparsed.size ? `; unparsed (left out of the team builder): ${[...unparsed].join(" · ")}` : ""}`);
const pout = path.join(root, "public/data/possessions.json");
fs.writeFileSync(pout, JSON.stringify({ rules: possessionRules, sources: possessions }));
console.log(`${possessions.length} group possession abilities -> ${path.relative(root, pout)}${unruled.size ? `; no match rule for target ${[...unruled].join(", ")}` : ""}`);
// coverage report: tools/out/buff_coverage.md
{
  const md: string[] = ["# Buff ranking coverage", "", `Sentences ranked: ${ranked}. Skipped: ${[...SKIPPED.values()].reduce((n, e) => n + e.n, 0)}. Uncategorized: ${[...UNCOVERED.values()].reduce((n, e) => n + e.n, 0)} (${UNCOVERED.size} shapes).`, "", "## Uncategorized", ""];
  for (const [k, e] of [...UNCOVERED].sort((a, b) => b[1].n - a[1].n)) md.push(`- **${e.n}** [${[...e.sl].join(", ")}] \`${k}\``, ...e.ex.map((x) => `  - ${x}`));
  if (!UNCOVERED.size) md.push("(none)");
  md.push("", ...auditReport());
  md.push("", "## Skipped (on purpose)", "");
  for (const [why, e] of [...SKIPPED].sort((a, b) => b[1].n - a[1].n)) md.push(`- **${e.n}** ${why}`, ...[...e.shapes.values()].map((x) => `  - ${x}`));
  fs.writeFileSync(path.join(root, "tools/out/buff_coverage.md"), md.join("\n") + "\n");
  console.log(`coverage: ${ranked} sentences ranked, ${UNCOVERED.size} uncategorized shapes -> tools/out/buff_coverage.md`);
}
console.log(`${eq.length} equipment rows from ${new Set(eq.map((r) => r.u)).size} weapons`);
console.log(`${rows.length} buff rows from ${units} castle girls, ${keyNames.size} stats -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
