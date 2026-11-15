// Filter option labels with the game's own icons (tools/export_ui_icons.py -> public/ui-icon/).
import type { ReactNode } from "react";
import { isMainWeapon, terrainWord } from "./data";

const BASE = import.meta.env.BASE_URL;

/** Terrain filter slug -> the castle type (Card.GrowUpID) whose badge stands for it: 1 平 2 山 3 平山
 *  4 水 8 地獄 16 無 (MenuCommonTexture.atx, the badges of the in-game filter). */
const TERRAIN_TYPE: Record<string, number> = { plain: 1, mountain: 2, hill: 3, water: 4, hell: 8, none: 16 };

function withIcon(src: string | null, text: string): ReactNode {
  if (!src) return text;
  return (
    <span className="opt-icon">
      <img src={src} alt="" width={24} height={24} loading="lazy" />
      {text}
    </span>
  );
}

/** A castle type's badge (single or dual terrain), by Card.GrowUpID. */
export const castleTypeIcon = (type: number) => `${BASE}ui-icon/terrain/${type}.webp`;

/** "刀" / "Sword" with its weapon-category icon (the 24 standard types). */
export const weaponOptionLabel = (type: number, text: string) =>
  withIcon(isMainWeapon(type) ? `${BASE}ui-icon/weapon/${type}.webp` : null, text);

/** A terrain with its badge; the badge already shows the kanji, so the text is the word alone. */
export const terrainOptionLabel = (slug: string, jp: string) => withIcon(castleTypeIcon(TERRAIN_TYPE[slug]), terrainWord(jp));
