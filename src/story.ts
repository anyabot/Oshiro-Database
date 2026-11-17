// Story data (tools/export_story.py) and the scene-script compiler the reader and the player share.
// A scene is the game's own command script: bg / map / chara / face / name / text ([command, param]).
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });

export type Cmd = [string, string];
/** A battle talk's trigger (story/t/): battle start, a wave, or an enemy (form) appearing */
export interface TalkWhen { on: "start" | "wave" | "form" | "transform"; wave?: number; enemy?: number; name?: string }
export interface Scene { n: number; cmds: Cmd[]; when?: TalkWhen }
export interface SceneFile { scenes: Scene[] }

/** One entry of an event book: a scene (AnyEventText) or a quest's own scenes. */
export interface BookPart {
  label?: string; scene?: number; quest?: number; chapter?: number; maps?: number; first?: string;
}
export interface Book { id: string; kind: string; title: string; parts: BookPart[] }
export interface Skit { id: number; title: string; date: string; n: number; first: string }
export interface StoryIndex { quests: number[]; books: Book[]; skits: Skit[]; bonds: [number, number][]; talks?: number[] }

export const useStoryIndex = () => useJson<StoryIndex>(loader, "story/index");
/** file: q/<QuestID>, e/<SceneID>, s/<SkitID>, b/<CardID>, t/<QuestID> (battle talks) */
export const useSceneFile = (file: string | null) => useJson<SceneFile>(loader, file ? `story/${file}` : null);
export const loadSceneFile = (file: string) => loader.load<SceneFile>(`story/${file}`);

/** Card art (tools/make_art_buckets.py): bucket, images [n, w, h], faces {n: [[x, y, w, h]]}. */
export interface ArtData {
  base: string;
  cards: Record<string, [number, [number, number, number][], Record<string, [number, number, number, number][]>?]>;
  /** renovation art: card -> [base card, tier]; images it doesn't list are the base card's */
  reno?: Record<string, [number, number]>;
}
export const useArt = () => useJson<ArtData>(loader, "art");
export const loadArt = () => loader.load<ArtData>("art");
/** Scene pictures (tools/export_scene_art.py), keyed by lower-case name. */
export interface SceneArt {
  base: string;
  bg: Record<string, [string, number, number]>;
  chara: Record<string, [string, number, number]>;
  face: Record<string, [string, number, number, number, number]>;
}
export const loadSceneArt = () => loader.load<SceneArt>("scene");

/** A card's image n, following a renovation back to its base card when that image is unchanged. */
export function cardImage(art: ArtData, card: number, n: string): { card: number; w: number; h: number } | null {
  for (let id: number | undefined = card, hops = 0; id != null && hops < 3; id = art.reno?.[String(id)]?.[0], hops++) {
    const img = art.cards[String(id)]?.[1].find(([x]) => String(x) === n);
    if (img) return { card: id, w: img[1], h: img[2] };
  }
  return null;
}

export const artUrl = (art: ArtData, card: number, file: string) => {
  const c = art.cards[String(card)];
  return c ? `${art.base.replace("{bucket}", String(c[0]))}${file}.webp` : null;
};

// --- compiled frames -----------------------------------------------------------------------------

export interface Picture { src: string; w: number; h: number }
export interface Face extends Picture { x: number; y: number }
export interface Frame {
  bg: Picture | { color: string } | null;
  chara: (Picture & { dx: number; dy: number }) | null;
  face: Face | null;
  name: string;
  text: string;
}

const params = (p: string) => Object.fromEntries([...p.matchAll(/(\w+)=(\S+)/g)].map((m) => [m[1].toLowerCase(), m[2]]));

/** A scene's frames: the picture state at every text line. */
export function compile(cmds: Cmd[], art: ArtData | null, scene: SceneArt | null, mapUrl: (n: number) => string): Frame[] {
  const frames: Frame[] = [];
  let bg: Frame["bg"] = null;
  let chara: Frame["chara"] = null;
  let card: { id: number; shown: number; type: string } | null = null;
  let face: Face | null = null;
  let name = "";
  for (const [cmd, raw] of cmds) {
    const p = params(raw);
    if (cmd === "bg") {
      const n = (p.name ?? "").toLowerCase();
      const hit = scene?.bg[n];
      bg = n === "whitebg" ? { color: "#fff" } : hit ? { src: `${scene!.base}bg/${hit[0]}.webp`, w: hit[1], h: hit[2] } : { color: "#000" };
    } else if (cmd === "map") {
      bg = { src: mapUrl(Number(p.id)), w: 16, h: 9 };
    } else if (cmd === "chara") {
      face = null;
      const dx = Number(p.x) || 0, dy = Number(p.y) || 0;
      if (p.id) {
        const type = p.type ?? "0";
        // a renovation card (1084 = 改壱 of 84) reuses its base card's image where it didn't change
        const img = art ? cardImage(art, Number(p.id), type) : null;
        const src = art && img ? artUrl(art, img.card, `${img.card}_${type}`) : null;
        chara = src && img ? { src, w: img.w, h: img.h, dx, dy } : null;
        card = chara && img ? { id: Number(p.id), shown: img.card, type } : null;
      } else {
        const hit = scene?.chara[(p.name ?? "").toLowerCase()];
        chara = hit ? { src: `${scene!.base}chara/${hit[0]}.webp`, w: hit[1], h: hit[2], dx, dy } : null;
        card = null;
      }
    } else if (cmd === "face") {
      if (p.id) {
        // `face ID=<card> type=k`: the card's k-th face on its current picture; 0 = none
        const k = Number(p.type) || 0;
        const id = card && card.id === Number(p.id) ? card.shown : Number(p.id);
        const type = card && card.id === Number(p.id) ? card.type : "0";
        const pos = art?.cards[String(id)]?.[2]?.[type]?.[k - 1];
        const src = art && pos ? artUrl(art, id, `${id}_${type}f${k}`) : null;
        face = k && src && pos ? { src, x: pos[0], y: pos[1], w: pos[2], h: pos[3] } : null;
      } else {
        const hit = scene?.face[(p.name ?? "").toLowerCase()];
        face = hit ? { src: `${scene!.base}face/${hit[0]}.webp`, x: hit[1], y: hit[2], w: hit[3], h: hit[4] } : null;
      }
    } else if (cmd === "name") {
      name = raw;
    } else if (cmd === "text" && raw.trim()) {
      frames.push({ bg, chara, face, name, text: raw });
    }
  }
  return frames;
}

/** Text-only lines of a scene, for the reader: [speaker, text]; "" marks a background change. */
export function lines(cmds: Cmd[]): ([string, string] | "")[] {
  const out: ([string, string] | "")[] = [];
  let name = "";
  for (const [cmd, raw] of cmds) {
    if (cmd === "name") name = raw;
    else if (cmd === "bg" || cmd === "map") { if (out.length && out[out.length - 1] !== "") out.push(""); }
    else if (cmd === "text" && raw.trim()) out.push([name, raw]);
  }
  while (out[out.length - 1] === "") out.pop();
  return out;
}

/** The game's colour markup (%c[rrggbb]) as segments; ffffff is the default colour. */
export function colored(text: string): { color: string | null; text: string }[] {
  const out: { color: string | null; text: string }[] = [];
  let color: string | null = null;
  let last = 0;
  for (const m of text.matchAll(/%c\[([0-9a-fA-F]{6})\]/g)) {
    if (m.index! > last) out.push({ color, text: text.slice(last, m.index) });
    color = m[1].toLowerCase() === "ffffff" ? null : `#${m[1]}`;
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ color, text: text.slice(last) });
  return out;
}
export const plain = (text: string) => text.replace(/%c\[[0-9a-fA-F]{6}\]/g, "");
