// A run of story parts (quest scenes, event scenes, skits, bond stories) as readable text, each scene
// playable in the scene player. Used by the story page and the stage page's Story tab.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LoadState, StoryLines, routerLinks, type StoryLineView } from "@altterisk/game-hub";
import { iconUrl, useUnits } from "./data";
import type { UnitIndexEntry } from "./types";
import { colored, compile, lines, loadArt, loadSceneArt, loadSceneFile, type SceneFile } from "./story";
import { StoryPlayer, type Segment } from "./storyPlayer";
import { useHubLabels, useT, type UiKey } from "./i18n";

export interface ReaderPart {
  key: string;
  /** heading above the part (e.g. the quest's name) */
  title: string;
  /** a chapter heading shown once before this part */
  chapter?: string;
  file: string;
  /** a label per scene number; omitted = no label */
  sceneLabel?: (n: number) => string;
}

const mapUrl = (n: number) => `${import.meta.env.BASE_URL}stage-map/${n}.webp`;

/** Quest scene labels: 1 before the battle, 2 after, 3 continued. */
export const QUEST_SCENE: Record<number, UiKey> = { 1: "storyScene1", 2: "storyScene2", 3: "storyScene3" };

function Colored({ text }: { text: string }) {
  return <>{colored(text).map((s, i) => (s.color ? <span key={i} style={{ color: s.color }}>{s.text}</span> : <span key={i}>{s.text}</span>))}</>;
}

const renderLink = routerLinks(Link, "to");

/** A scene's lines for game-hub's StoryLines: speaker rows (with the castle girl's face and page when
 *  the speaker's name is exactly one playable girl's), narration, "" (a new background) as a break. */
function views(cmds: Parameters<typeof lines>[0], girl: (name: string) => UnitIndexEntry | undefined): StoryLineView[] {
  return lines(cmds).map((l): StoryLineView => {
    if (l === "") return { kind: "place", text: "⁂" };
    if (!l[0]) return { kind: "narration", text: <Colored text={l[1]} /> };
    const u = girl(l[0]);
    return {
      kind: "say", name: l[0], text: <Colored text={l[1]} />,
      ...(u ? { nameHref: `/units/${u.id}`, avatar: u.face ? <img src={iconUrl(u.face)} alt="" width={40} height={40} loading="lazy" /> : undefined } : {}),
    };
  });
}

export function StoryReader({ parts }: { parts: ReaderPart[] }) {
  const t = useT();
  const hub = useHubLabels();
  const [files, setFiles] = useState<Record<string, SceneFile | null>>({});
  const [error, setError] = useState<unknown>(null);
  const [player, setPlayer] = useState<{ segments: Segment[]; start: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const want = parts.map((p) => p.file).join("|");
  const { data: units } = useUnits();
  const girl = useMemo(() => {
    const m = new Map<string, UnitIndexEntry[]>();
    for (const u of units ?? []) if (!u.npc && !u.dup_of) m.set(u.name, [...(m.get(u.name) ?? []), u]);
    return (name: string) => (m.get(name)?.length === 1 ? m.get(name)![0] : undefined);
  }, [units]);

  useEffect(() => {
    let live = true;
    setFiles({});
    Promise.all(parts.map((p) => loadSceneFile(p.file).then((f) => [p.file, f] as const, () => [p.file, null] as const)))
      .then((all) => { if (live) setFiles(Object.fromEntries(all)); }, (e) => live && setError(e));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);

  // every scene of every part, in order, as player segments
  const scenes = parts.flatMap((p) => (files[p.file]?.scenes ?? []).map((s) => ({ p, s })));
  const play = async (from: number) => {
    setBusy(true);
    try {
      const [art, scene] = await Promise.all([loadArt().catch(() => null), loadSceneArt().catch(() => null)]);
      const segments = scenes.map(({ p, s }) => ({
        title: [p.title, p.sceneLabel?.(s.n)].filter(Boolean).join(" · "),
        frames: compile(s.cmds, art, scene, mapUrl),
      }));
      setPlayer({ segments, start: from });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <LoadState error={error} labels={hub.load} />;
  if (parts.some((p) => !(p.file in files))) return <LoadState loading labels={hub.load} />;
  let idx = -1;
  return (
    <div className="story">
      {scenes.length > 0 && (
        <div className="story__tools">
          <button type="button" className="hub-btn" disabled={busy} onClick={() => play(0)}>▶ {t("spPlayAll")}</button>
          <span className="muted small">{t("spHint")}</span>
        </div>
      )}
      {parts.map((p) => {
        const f = files[p.file];
        return (
          <section key={p.key} className="story__part">
            {p.chapter && <h2 className="story__chapter">{p.chapter}</h2>}
            {p.title && <h3 className="story__title">{p.title}</h3>}
            {!f && <p className="muted small">{t("storyMissing")}</p>}
            {f?.scenes.map((s) => {
              idx += 1;
              const at = idx;
              const label = p.sceneLabel?.(s.n);
              return (
                <div key={s.n} className="story__scene">
                  <div className="story__scene-head">
                    {label && <span className="story__label">{label}</span>}
                    <button type="button" className="hub-btn hub-btn--small" disabled={busy} onClick={() => play(at)}>▶ {t("spPlay")}</button>
                  </div>
                  <StoryLines lines={views(s.cmds, girl)} lang="ja" renderLink={renderLink} className="story__lines" />
                </div>
              );
            })}
          </section>
        );
      })}
      {player && (
        <div className="sp-overlay" role="dialog" aria-modal="true">
          <StoryPlayer segments={player.segments} start={player.start} onClose={() => setPlayer(null)} />
        </div>
      )}
    </div>
  );
}
