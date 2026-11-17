// The game's story scene, replayed on game-hub's scene player parts (SceneFrame, SceneTextBox,
// SceneControls, useSceneStepper, useSceneTheater): this file only draws Oshiro's picture layers —
// the background, the standing character and its expression face — from story.ts compile() frames.
// The hub's text box keeps every line in the page by default, so page translators reach them all.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  SceneControls, SceneFrame, SceneTextBox, sceneTextSetting, useSceneStepper, useSceneTheater, type SceneLine,
} from "@altterisk/game-hub";
import { colored, type Frame } from "./story";
import { useT } from "./i18n";

export interface Segment { title: string; frames: Frame[] }

/** Saved text mode: all lines in the page (true) or only the current one. */
const ALL_LINES = sceneTextSetting("oshiro.scene.preload");

function Colored({ text }: { text: string }) {
  return <>{colored(text).map((s, i) => (s.color ? <span key={i} style={{ color: s.color }}>{s.text}</span> : <span key={i}>{s.text}</span>))}</>;
}

const picturesOf = (f: Frame) => [f.bg && "src" in f.bg ? f.bg.src : null, f.chara?.src, f.face?.src].filter((x): x is string => !!x);

// Pictures fetched and decoded ahead of time. The Image objects are kept (not just requested), so the
// browser can't drop them before they are shown and a line change paints at once.
const warmed = new Map<string, Promise<void>>();
const kept: HTMLImageElement[] = [];
function warm(src: string): Promise<void> {
  let p = warmed.get(src);
  if (!p) {
    const im = new Image();
    im.decoding = "async";
    im.src = src;
    kept.push(im);
    // a failed first fetch (the image CDN on a never-requested file) is forgotten so it can be tried again
    p = im.decode().catch(() => { warmed.delete(src); });
    warmed.set(src, p);
  }
  return p;
}

/** Every picture of the run, the ones just ahead of `at` first, fetched a few at a time. */
function useWarmPictures(frames: Frame[], at: number) {
  useEffect(() => {
    let stop = false;
    const order = [...frames.slice(at), ...frames.slice(0, at)].flatMap(picturesOf);
    const todo = [...new Set(order)].filter((src) => !warmed.has(src));
    const worker = async () => {
      while (!stop && todo.length) await warm(todo.shift()!);
    };
    for (let i = 0; i < 4; i++) void worker();
    return () => { stop = true; };
  }, [frames, at]);
  // drop the kept images when the player closes
  useEffect(() => () => { kept.length = 0; warmed.clear(); }, []);
}

export function StoryPlayer({ segments, start = 0, onClose }: { segments: Segment[]; start?: number; onClose: () => void }) {
  const t = useT();
  // flatten: every frame knows its segment
  const flat = useMemo(() => segments.flatMap((s, si) => s.frames.map((f) => ({ f, si }))), [segments]);
  const first = useMemo(() => segments.slice(0, start).reduce((n, s) => n + s.frames.length, 0), [segments, start]);
  const autoDelay = useCallback((at: number) => 1600 + 60 * (flat[at]?.f.text.length ?? 0), [flat]);
  const stepper = useSceneStepper({ count: flat.length, start: first, onEnd: onClose, onClose, autoDelay });
  const [allLines, setAllLines] = ALL_LINES.use();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [theater, toggleTheater] = useSceneTheater(wrapRef);
  // the dialogue, built once per run so a translator's replacements are never overwritten
  const lines = useMemo<SceneLine[]>(() => flat.map(({ f }) => ({ name: f.name || undefined, text: <Colored text={f.text} /> })), [flat]);
  const cur = flat[stepper.at];
  const frames = useMemo(() => flat.map((x) => x.f), [flat]);
  // restarts only when the reader jumps, not on every line: in order, the next lines are already queued
  const [warmFrom, setWarmFrom] = useState(stepper.at);
  useEffect(() => { if (Math.abs(stepper.at - warmFrom) > 20) setWarmFrom(stepper.at); }, [stepper.at, warmFrom]);
  useWarmPictures(frames, warmFrom);

  if (!cur) return null;
  const { f } = cur;
  const bg = f.bg;
  return (
    <div ref={wrapRef} className={`sp-wrap${theater ? " sp-wrap--theater" : ""}`}>
      <SceneFrame aspect="16 / 9" onAdvance={stepper.next} label={t("spNext")} className="sp">
        {bg && "src" in bg ? <RetryImg className="sp-bg" src={bg.src} /> : <div className="sp-bg" style={{ background: bg?.color ?? "#000" }} />}
        {f.chara && (
          <div className="sp-chara" style={{
            // the picture at its own pixel size in the 1280x720 scene (1 px = 100/1280 cqw), hanging from the top
            // and centred; taller card art runs off the bottom. X/Y are pixel offsets in the same scene.
            aspectRatio: `${f.chara.w} / ${f.chara.h}`,
            height: `${(f.chara.h / 1280) * 100}cqw`,
            transform: `translate(calc(-50% + ${(f.chara.dx / 1280) * 100}cqw), ${(f.chara.dy / 1280) * 100}cqw)`,
          }}>
            <RetryImg src={f.chara.src} />
            {f.face && (
              <RetryImg className="sp-face" src={f.face.src} style={{
                left: `${(f.face.x / f.chara.w) * 100}%`, top: `${(f.face.y / f.chara.h) * 100}%`,
                width: `${(f.face.w / f.chara.w) * 100}%`, height: `${(f.face.h / f.chara.h) * 100}%`,
              }} />
            )}
          </div>
        )}
        <SceneTextBox lines={lines} at={stepper.at} allLines={allLines} lang="ja" className="sp-window" />
        <div className="sp-title" translate="no">{segments[cur.si].title}</div>
      </SceneFrame>
      <SceneControls stepper={stepper} count={flat.length} slider allLines={allLines} onAllLines={setAllLines}
        theater={theater} onTheater={toggleTheater} onClose={onClose} className="sp-bar"
        labels={{
          back: t("spPrev"), next: t("spNext"), auto: t("spAuto"), textAll: t("spTextAll"), textOne: t("spTextOne"),
          textTitle: t("spTextTitle"), theater: t("spFull"), exitTheater: t("spFullExit"), close: t("spClose"), position: t("spPosition"),
        }} />
      <p className="muted small sp-help" translate="no">{t("spTranslateHint")}</p>
    </div>
  );
}

/** A scene picture that retries a failed load (the image CDN can fail a first, uncached request) and hides
 *  itself rather than leaving an empty broken-image box. */
function RetryImg({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [src]);
  const url = attempt ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src;
  return (
    <img key={url} className={className} src={url} alt="" style={{ ...style, visibility: attempt > 2 ? "hidden" : undefined }}
      onError={() => { if (attempt <= 2) setTimeout(() => setAttempt((a) => a + 1), 400 * (attempt + 1)); }} />
  );
}
