import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import { CASTLE_EN, CATEGORY_EN, REGION_EN, TRAIT_EN, WEAPON_EN, unitName } from "./labels";
import { getLang } from "./i18n";
import type { Meta, PossessionData, PossessionRule, TraitInfo, UnitDetail, UnitIndexEntry } from "./types";

const BASE = import.meta.env.BASE_URL;

const ja = () => getLang() === "ja";

/** A castle girl's display name: the English name where there is one, the game's own in Japanese mode. */
export function nameOf(u: { name: string; name_en?: string | null } | undefined | null): string {
  return u ? (ja() ? u.name : unitName(u)) : "";
}

/** The other-language name, for subtitles and tooltips ("" when it would repeat the shown one). */
export function altName(u: { name: string; name_en?: string | null } | undefined | null): string {
  if (!u?.name_en) return "";
  return ja() ? u.name_en : u.name;
}

/** Renovation tier names: 0 Base, 1 Kai, 2 Kai Ni (改壱, 改弐 in Japanese). */
export const tierName = (t: number) => (ja() ? ["未改築", "改壱", "改弐"] : ["Base", "Kai", "Kai Ni"])[t] ?? `tier ${t}`;

const loader = createJsonLoader({ urls: (name) => [`${BASE}data/${name}.json`] });

export const useUnits = () => useJson<UnitIndexEntry[]>(loader, "units");
export const useMeta = () => useJson<Meta>(loader, "meta");
export const useUnit = (id: number | null) => useJson<UnitDetail>(loader, id == null ? null : `unit/${id}`);
/** Placement filter values a castle girl has: her spot kind (melee / ranged / both) and "water". */
export function placementTags(u: { placement?: string | null; water?: boolean | null; boat?: boolean | null }): string[] {
  return [...(u.placement ? [u.placement] : []), ...(u.water ? ["water"] : []), ...(u.boat ? ["boat"] : [])];
}
export const PLACEMENTS = ["melee", "ranged", "both", "water", "boat"] as const;

export const usePossessions = () => useJson<PossessionData>(loader, "possessions");

/** Whether a group possession ability's target (weapon, region, trait or terrain) includes this castle girl. */
export function possessionMatches(rule: PossessionRule, u: Pick<UnitDetail, "region" | "traits" | "terrain"> & { weapon: number | null }): boolean {
  if (rule.weapon) return u.weapon != null && rule.weapon.includes(u.weapon);
  if (rule.region) return u.region != null && rule.region.includes(u.region);
  if (rule.trait) return u.traits.some((x) => rule.trait!.includes(x));
  if (rule.terrain) return u.terrain != null && rule.terrain.includes(u.terrain);
  return false;
}

export const iconUrl = (face: number) => `${BASE}unit-icon/${face}.webp`;

export function rarityLabel(meta: Meta | undefined, r: number): string {
  return meta?.rarities[r] ?? `★${r}`;
}

export function weaponLabel(meta: Meta | undefined, w: number | null): string {
  if (!w) return "—";
  const jp = meta?.weapons[w];
  return jp ? (ja() ? jp : WEAPON_EN[jp] ?? jp) : `weapon ${w}`;
}

export function regionLabel(meta: Meta | undefined, r: number | null): string {
  if (!r) return "—";
  const jp = meta?.regions[r];
  return jp ? (ja() ? jp : REGION_EN[jp] ?? jp) : `region ${r}`;
}

export function categoryLabel(meta: Meta | undefined, c: number): string {
  if (ja() && meta?.categories[c]) return meta.categories[c];
  return CATEGORY_EN[c] ?? meta?.categories[c] ?? `category ${c}`;
}

/** The game's own (Japanese) category name, for tooltips. */
export function categoryJp(meta: Meta | undefined, c: number): string | undefined {
  return meta?.categories[c];
}

/** Trait chip text: the shared name prefix where there is one, else the raw id. */
export function traitLabel(meta: Meta | undefined, t: number): string {
  const info: TraitInfo | undefined = meta?.traits[t];
  return info?.label ? (ja() ? info.label : TRAIT_EN[info.label] ?? info.label) : `特性 ${t}`;
}

export function traitTitle(meta: Meta | undefined, t: number): string {
  const info = meta?.traits[t];
  if (!info) return `Tokusei ${t}`;
  const how = info.label ? `Name: ${info.label} (MenuText ${4300 + t}).` : "No name in the game data.";
  return `Tokusei ${t} · ${info.count} castle girls, e.g. ${info.examples.join(", ")}. ${how}`;
}

/** The 24 standard weapon types; the rest are collab / token / lord-only types. */
export const isMainWeapon = (w: number) => w >= 1 && w <= 24;

/** Filter order and URL slugs of the terrain words (InstallationCastleTypeLimit "Xを含む城" sets). */
export const TERRAINS: { jp: string; slug: string }[] = [
  { jp: "平", slug: "plain" }, { jp: "平山", slug: "hill" }, { jp: "山", slug: "mountain" },
  { jp: "水", slug: "water" }, { jp: "地獄", slug: "hell" }, { jp: "無属性", slug: "none" },
];

/** The terrains a castle type includes, e.g. 5 -> [平, 水]. */
export function terrainParts(meta: Meta | undefined, t: number | null): typeof TERRAINS {
  if (!t || !meta?.terrain) return [];
  return TERRAINS.filter((x) => meta.terrain!.parts[x.jp]?.includes(t));
}

export const terrainWord = (jp: string) => (ja() ? jp : jp === "無属性" ? "None" : CASTLE_EN[jp] ?? jp);

/** Filter label of a terrain word: "Plain 平" in English, "平" in Japanese. */
export const terrainOption = (jp: string) => (ja() ? jp : `${terrainWord(jp)} ${jp}`);

export function terrainLabel(meta: Meta | undefined, t: number | null): string {
  if (!t) return "—";
  const parts = terrainParts(meta, t);
  return parts.length ? parts.map((x) => terrainWord(x.jp)).join(" / ") : `terrain ${t}`;
}

export function terrainTitle(meta: Meta | undefined, t: number | null): string | undefined {
  if (!t) return undefined;
  const jp = meta?.terrain?.types[t] ?? terrainParts(meta, t).map((x) => x.jp).join("/");
  return `${jp} · Card.GrowUpID ${t}`;
}

/** public/data/home.json (tools/export_home.py): the game's home banners and each event's featured girls. */
export interface HomeBanner {
  type: number;
  ext: number;
  /** which EstateMenu*Texture sheet: summon · event · shop · fixed · etc · arena */
  kind: string;
  /** public/banner/<image>.webp */
  image: string;
  /** the game's own text, e.g. "11/17 メンテナンスまで" */
  until: string;
  fixed: boolean;
}
export interface HomeData { generated: string; banners: HomeBanner[]; focus: Record<string, number[]> }
/** public/data/added.json: unit -> date its card file was uploaded; weapon -> [date, how] (see export_home.py). */
export interface AddedData { units: Record<string, string>; weapons: Record<string, [string, "source" | "after" | "seen" | "between"]> }

export const useHome = () => useJson<HomeData>(loader, "home");
export const useAdded = () => useJson<AddedData>(loader, "added");
export const bannerUrl = (image: string) => `${BASE}banner/${image}.webp`;
