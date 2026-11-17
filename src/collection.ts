// The viewer's own castle girl collection: which cards they own and how far each is renovated.
// Kept in this browser (localStorage); the backup code / file moves it between devices.
import { createSetting } from "@altterisk/game-hub/persist";
import type { UnitIndexEntry } from "./types";

/** card id -> renovation tier owned (0 base, 1 改壱, 2 改弐) */
export type Collection = Record<string, number>;

const sanitize = (raw: unknown): Collection => {
  const out: Collection = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (/^\d+$/.test(k) && typeof v === "number" && v >= 0 && v <= 2) out[k] = Math.floor(v);
    }
  }
  return out;
};

export const collectionSetting = createSetting<Collection>({ key: "oshiro.collection", initial: {}, version: 1, sanitize });
export const useCollection = () => collectionSetting.use();

/** Playable cards: what a collection can hold (no NPC, duplicate or transformed-state entries). */
export const collectible = (u: UnitIndexEntry) => !u.npc && !u.dup_of && !u.transform_of && u.card_type !== 15;

// Backup code: "1:" + sorted ids in base 36, each followed by its tier digit when renovated ("7a.1"),
// comma-separated. ~4 characters a card.
export function encodeCollection(c: Collection): string {
  const ids = Object.keys(c).map(Number).sort((a, b) => a - b);
  return "1:" + ids.map((id) => id.toString(36) + (c[id] ? `.${c[id]}` : "")).join(",");
}

export function decodeCollection(code: string): Collection | null {
  const m = /^1:([0-9a-z.,]*)$/i.exec(code.trim());
  if (!m) return null;
  const out: Collection = {};
  for (const part of m[1].split(",").filter(Boolean)) {
    const [id, tier] = part.split(".");
    const n = parseInt(id, 36);
    if (!Number.isFinite(n)) return null;
    out[n] = Math.min(2, Number(tier) || 0);
  }
  return out;
}
