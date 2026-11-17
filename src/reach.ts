// Who a buff row reaches, read from its receiver text ("All Water castle girls", "Melee castle girls in the
// formation", "Witch / JFW Base castle girls in range"). scripts/buffs.ts writes one rule per distinct
// receiver to public/data/reach.json; the team builder (src/pages/Team.tsx) tests castle girls against it.
import { CASTLE_EN, CATEGORY_EN, REGION_EN, TRAIT_EN, WEAPON_EN } from "./labels";

export interface ReachRule {
  /** self: only the giver · ally: castle girls (maybe a group) · enemy: enemies in general · no: someone else
   *  (the lord, tokens, storehouses, one named castle girl, a kind of enemy) */
  s: "self" | "ally" | "enemy" | "no";
  /** not the giver herself */
  x?: 1;
  /** how far: range (her range / an area: depends on placement), all (everyone / the formation) */
  p?: "range" | "all";
  /** group: any listed value matches */
  w?: number[];
  r?: number[];
  tr?: number[];
  c?: number[];
  /** terrain words (平, 平山, 山, 水, 地獄, 無属性) */
  te?: string[];
  ra?: number[];
  pl?: ("melee" | "ranged")[];
}

const inv = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([jp, en]) => [en.toLowerCase(), jp]));

/** Parses receiver texts against the game's id tables (meta.json weapons / regions / traits). */
export function reachParser(meta: { weapons: Record<string, string>; regions: Record<string, string>; traits: Record<string, { label: string | null }> }) {
  const byJp = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([id, jp]) => [jp, Number(id)]));
  const weaponId = byJp(meta.weapons), regionId = byJp(meta.regions);
  const traitId = Object.fromEntries(Object.entries(meta.traits).filter(([, v]) => v.label).map(([id, v]) => [v.label!, Number(id)]));
  const weapons = inv(WEAPON_EN), regions = inv(REGION_EN), traits = inv(TRAIT_EN), terrains = inv(CASTLE_EN);
  const cats = Object.fromEntries(Object.entries(CATEGORY_EN).filter(([id]) => Number(id) > 0 && Number(id) < 100).map(([id, en]) => [en.toLowerCase(), Number(id)]));
  const alias: Record<string, string> = { "dual-sword": "dual swords", "[gup]": "girls und panzer", "no-terrain": "no-terrain" };

  /** One group word -> rule fields, or null when unknown. */
  const term = (raw: string): Partial<ReachRule> | null => {
    let t = raw.trim().toLowerCase().replace(/ castle girls$/, "");
    t = alias[t] ?? t;
    if (t === "melee" || t === "ranged") return { pl: [t] };
    let m = /^★(\d)$/.exec(t);
    if (m) return { ra: [Number(m[1])] };
    if (weapons[t] && weaponId[weapons[t]] != null) return { w: [weaponId[weapons[t]]] };
    if (terrains[t]) return { te: [terrains[t] === "無" ? "無属性" : terrains[t]] };
    if (regions[t] && regionId[regions[t]] != null) return { r: [regionId[regions[t]]] };
    if (traits[t] && traitId[traits[t]] != null) return { tr: [traitId[traits[t]]] };
    if (cats[t] != null) return { c: [cats[t]] };
    return null;
  };

  const ENEMY_ANY = /^(?:all )?enem(?:y|ies)(?: hit| in range| \(area 2\)| it blocks)?$/i;
  return (w: string, enemySide: boolean): ReachRule | null => {
    if (w === "Self" || w === "Each enemy defeated, self") return { s: "self" };
    // Ki over time goes to the side's shared pool
    if (w === "Your side") return { s: "no" };
    if (enemySide) {
      if (ENEMY_ANY.test(w) || w === "Target" || w === "対象" || /^Target \d+, area 2$/.test(w)) return { s: "enemy" };
      return { s: "no" };
    }
    if (/lord|token|ambush|storehouse|named in the text|boats?$|kabuto(?! girl)|yokai|spot$|^Chosen placement/i.test(w) && !/castle girls placed on the spot$/i.test(w)) {
      // mixed groups that include castle girls: 「殿/城娘/伏兵 in the area」
      if (/castle girls/i.test(w) && /in the area$/.test(w)) return { s: "ally", p: "range" };
      return { s: "no" };
    }
    let rest = w.replace(/^Great Magic, /, "");
    let p: ReachRule["p"] = "range";
    let x: 1 | undefined;
    if (/^All /i.test(rest)) { p = "all"; rest = rest.slice(4); }
    const tail = /( in range| in the target's range| in the area| in the formation| \(area 2\)| placed on the spot)$/.exec(rest);
    if (tail) { rest = rest.slice(0, -tail[1].length); if (tail[1] === " in the formation") p = "all"; }
    if (/ except self$/.test(rest)) { x = 1; rest = rest.replace(/ except self$/, ""); }
    const tail2 = /( in range| \(area 2\))$/.exec(rest);
    if (tail2) rest = rest.slice(0, -tail2[1].length);
    const base: ReachRule = { s: "ally", p, ...(x ? { x } : {}) };
    if (/^(castle girls|allies|target|対象|target \d+, area 2)$/i.test(rest)) return base;
    // "Witch / JFW Base castle girls", "Esper and Magician castle girls", "Song & Dance castle girls or Bell castle girls"
    const words = rest.replace(/ castle girls$/i, "").split(/ \/ | and (?!Dance)| or |, /i);
    const out: ReachRule = { ...base };
    for (const wd of words) {
      const r = term(wd);
      if (!r) return null;
      for (const [k, v] of Object.entries(r) as [keyof ReachRule, unknown[]][]) (out as any)[k] = [...(((out as any)[k] as unknown[]) ?? []), ...v];
    }
    return out;
  };
}

/** The fields reachMatches reads. */
export interface ReachUnit {
  weapon: number | null;
  region: number | null;
  traits: number[] | null;
  category: number;
  rarity: number;
  placement?: string | null;
}

/** Whether a group rule includes the castle girl (terrain words from data.terrainParts). */
export function groupMatches(rule: ReachRule, u: ReachUnit, terrainWords: string[]): boolean {
  const any = rule.w || rule.r || rule.tr || rule.c || rule.te || rule.ra || rule.pl;
  if (!any) return true;
  if (rule.w?.includes(u.weapon ?? -1)) return true;
  if (rule.r?.includes(u.region ?? -1)) return true;
  if (rule.tr?.some((t) => u.traits?.includes(t))) return true;
  if (rule.c?.includes(u.category)) return true;
  if (rule.te?.some((t) => terrainWords.includes(t))) return true;
  if (rule.ra?.includes(u.rarity)) return true;
  // a castle girl placeable on both spot kinds counts as either
  if (rule.pl?.some((p) => u.placement === p || u.placement === "both")) return true;
  return false;
}
