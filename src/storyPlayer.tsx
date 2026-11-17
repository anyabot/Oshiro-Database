// The game's story scene, replayed on game-hub's scene player parts (SceneFrame, SceneTextBox,
// SceneControls, useSceneStepper, useSceneTheater): this file only draws Oshiro's picture layers —
// the background, the standing character and its expression face — from story.ts compile() frames.
// The hub's text box keeps every line in the page by default, so page translators reach them all.
import { useCallback, useEffect, useMemo, useRef } from "react";
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

function preload(f: Frame | undefined) {
  if (!f) return;
  for (const src of [f.bg && "src" in f.bg ? f.bg.src : null, f.chara?.src, f.face?.src]) {
    if (src) { const im = new Image(); im.src = src; }
  }
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
  useEffect(() => { preload(flat[stepper.at + 1]?.f); preload(flat[stepper.at + 2]?.f); }, [stepper.at, flat]);

  if (!cur) return null;
  const { f } = cur;
  const bg = f.bg;
  return (
    <div ref={wrapRef} className={`sp-wrap${theater ? " sp-wrap--theater" : ""}`}>
      <SceneFrame aspect="16 / 9" onAdvance={stepper.next} label={t("spNext")} className="sp">
        {bg && "src" in bg ? <img className="sp-bg" src={bg.src} alt="" /> : <div className="sp-bg" style={{ background: bg?.color ?? "#000" }} />}
        {f.chara && (
          <div className="sp-chara" style={{
            aspectRatio: `${f.chara.w} / ${f.chara.h}`,
            // chara X/Y offsets are in the 1280x720 scene: 1 px = 100/1280 cqw
            transform: `translate(calc(-50% + ${(f.chara.dx / 1280) * 100}cqw), ${(f.chara.dy / 1280) * 100}cqw)`,
          }}>
            <img src={f.chara.src} alt="" />
            {f.face && (
              <img className="sp-face" src={f.face.src} alt="" style={{
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
