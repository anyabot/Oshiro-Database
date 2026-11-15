// Filter option labels with the game's own icons (tools/export_ui_icons.py -> public/ui-icon/).
import type { ReactNode } from "react";
import { isMainWeapon, terrainOption, terrainWord } from "./data";

const BASE = import.meta.env.BASE_URL;

/** Terrain slugs that have a badge (無属性 has none in the game). */
const TERRAIN_BADGE = new Set(["plain", "mountain", "hill", "water", "hell"]);

function withIcon(src: string | null, text: string): ReactNode {
  if (!src) return text;
  return (
    <span className="opt-icon">
      <img src={src} alt="" width={24} height={24} loading="lazy" />
      {text}
    </span>
  );
}

/** "刀" / "Sword" with its weapon-category icon (the 24 standard types). */
export const weaponOptionLabel = (type: number, text: string) =>
  withIcon(isMainWeapon(type) ? `${BASE}ui-icon/weapon/${type}.webp` : null, text);

/** A terrain with its face badge; the badge already shows the kanji, so the text is the word alone. */
export const terrainOptionLabel = (slug: string, jp: string) =>
  TERRAIN_BADGE.has(slug) ? withIcon(`${BASE}ui-icon/terrain/${slug}.webp`, terrainWord(jp)) : terrainOption(jp);
