import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import { CASTLE_EN, CATEGORY_EN, REGION_EN, TRAIT_EN, WEAPON_EN } from "./labels";
import type { Meta, TraitInfo, UnitDetail, UnitIndexEntry } from "./types";

const BASE = import.meta.env.BASE_URL;

const loader = createJsonLoader({ urls: (name) => [`${BASE}data/${name}.json`] });

export const useUnits = () => useJson<UnitIndexEntry[]>(loader, "units");
export const useMeta = () => useJson<Meta>(loader, "meta");
export const useUnit = (id: number | null) => useJson<UnitDetail>(loader, id == null ? null : `unit/${id}`);

export const iconUrl = (face: number) => `${BASE}unit-icon/${face}.webp`;

export function rarityLabel(meta: Meta | undefined, r: number): string {
  return meta?.rarities[r] ?? `★${r}`;
}

export function weaponLabel(meta: Meta | undefined, w: number | null): string {
  if (!w) return "—";
  const jp = meta?.weapons[w];
  return jp ? WEAPON_EN[jp] ?? jp : `weapon ${w}`;
}

export function regionLabel(meta: Meta | undefined, r: number | null): string {
  if (!r) return "—";
  const jp = meta?.regions[r];
  return jp ? REGION_EN[jp] ?? jp : `region ${r}`;
}

export function categoryLabel(meta: Meta | undefined, c: number): string {
  return CATEGORY_EN[c] ?? meta?.categories[c] ?? `category ${c}`;
}

/** The game's own (Japanese) category name, for tooltips. */
export function categoryJp(meta: Meta | undefined, c: number): string | undefined {
  return meta?.categories[c];
}

/** Trait chip text: the shared name prefix where there is one, else the raw id. */
export function traitLabel(meta: Meta | undefined, t: number): string {
  const info: TraitInfo | undefined = meta?.traits[t];
  return info?.label ? TRAIT_EN[info.label] ?? info.label : `特性 ${t}`;
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

export const terrainWord = (jp: string) => (jp === "無属性" ? "None" : CASTLE_EN[jp] ?? jp);

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
