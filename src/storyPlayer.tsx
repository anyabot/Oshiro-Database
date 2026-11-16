// The game's story scene, replayed: background, standing character with its expression face, and the
// talk window, one text line at a time. Frames come from story.ts compile() (the game's own scripts).
//
// Text and page translators (as in the Taimanin Viewer): by default every line of the run is in the
// page from the start, stacked and transparent but for the current one, and never re-rendered, so a
// page translator (Chrome, Edge) translates them all up front and stepping only changes which line
// shows; lines inserted one at a time are often left untranslated. "Per line" keeps only the current
// line, keyed so each is a fresh element (for translator extensions that handle new text themselves).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colored, type Frame } from "./story";
import { useT } from "./i18n";

export interface Segment { title: string; frames: Frame[] }

const AUTO_HOLD = 1600; // auto mode: time per line (ms) + 60 ms per character
const PRELOAD_KEY = "oshiro.scene.preload";

function readPreload(): boolean {
  try { return localStorage.getItem(PRELOAD_KEY) !== "0"; } catch { return true; }
}
function writePreload(v: boolean) {
  try { localStorage.setItem(PRELOAD_KEY, v ? "1" : "0"); } catch { /* storage off: keep the default */ }
}

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
  const [i, setI] = useState(first);
  const [auto, setAuto] = useState(false);
  const [all, setAll] = useState(readPreload);
  const stageRef = useRef<HTMLDivElement>(null);
  const cur = flat[i];

  useEffect(() => { preload(flat[i + 1]?.f); preload(flat[i + 2]?.f); }, [i, flat]);
  const next = useCallback(() => {
    if (i + 1 < flat.length) setI(i + 1); else onClose();
  }, [i, flat.length, onClose]);
  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
  useEffect(() => {
    if (!auto || !cur) return;
    const id = window.setTimeout(next, AUTO_HOLD + 60 * cur.f.text.length);
    return () => window.clearTimeout(id);
  }, [auto, cur, next]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [next, prev, onClose]);
  const fullscreen = () => {
    const el = stageRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.();
  };
  const toggleAll = () => { setAll(!all); writePreload(!all); };

  // the text box: built once per mode, so a translator's replacements are never overwritten
  const lines = useMemo(() => flat.map(({ f }, k) => (
    <div key={k} className="sp-say" data-k={k}>
      {f.name && <div className="sp-name">{f.name}</div>}
      <p className="sp-text"><Colored text={f.text} /></p>
    </div>
  )), [flat]);

  if (!cur) return null;
  const { f } = cur;
  const bg = f.bg;
  return (
    <div className="sp-wrap">
      <div className="sp" ref={stageRef} onClick={next} role="button" tabIndex={0} aria-label={t("spNext")}>
        {bg && "src" in bg ? <img className="sp-bg" src={bg.src} alt="" /> : <div className="sp-bg" style={{ background: bg?.color ?? "#000" }} />}
        {f.chara && (
          <div className="sp-chara" style={{
            aspectRatio: `${f.chara.w} / ${f.chara.h}`,
            transform: `translate(calc(-50% + ${(f.chara.dx / 1280) * 100}cqw), ${(f.chara.dy / 720) * 100}cqh)`,
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
        {all ? (
          <div key="all" className="sp-window" lang="ja" data-on={i}>
            {lines}
          </div>
        ) : (
          <div key={`one-${i}`} className="sp-window sp-window--one" lang="ja">
            <div className="sp-say sp-say--on">
              {f.name && <div className="sp-name">{f.name}</div>}
              <p className="sp-text"><Colored text={f.text} /></p>
            </div>
          </div>
        )}
        <style>{all ? `.sp-window[data-on="${i}"] > .sp-say[data-k="${i}"] { opacity: 1; pointer-events: auto; position: static; padding: 0; }` : ""}</style>
        <span className="sp-more" aria-hidden="true">▼</span>
        <div className="sp-title" translate="no">{segments[cur.si].title}</div>
      </div>
      <div className="sp-bar" translate="no">
        <button type="button" className="hub-btn" onClick={prev} disabled={i === 0}>{t("spPrev")}</button>
        <button type="button" className="hub-btn" onClick={next}>{t("spNext")}</button>
        <input type="range" className="sp-range" min={0} max={flat.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} aria-label={t("spPosition")} />
        <span className="muted small sp-count">{i + 1} / {flat.length}</span>
        <button type="button" className={`hub-btn${auto ? " is-on" : ""}`} aria-pressed={auto} onClick={() => setAuto(!auto)}>{t("spAuto")}</button>
        <button type="button" className={`hub-btn${all ? " is-on" : ""}`} aria-pressed={all} onClick={toggleAll} title={t("spTextTitle")}>
          {all ? t("spTextAll") : t("spTextOne")}
        </button>
        <button type="button" className="hub-btn" onClick={fullscreen}>{t("spFull")}</button>
        <button type="button" className="hub-btn" onClick={onClose}>{t("spClose")}</button>
      </div>
      <p className="muted small sp-help" translate="no">{t("spTranslateHint")}</p>
    </div>
  );
}
