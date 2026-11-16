// /story: every story the game ships — quest scenes by series and chapter, event books (天魔大乱's
// chapter cutscenes, Hell epilogues, the voyage, palaces…), seasonal skits and bond stories.
// /story/:kind/:id reads one of them; every scene plays in the scene player.
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState, FallbackImage, LoadState, PageHeader, SearchBox } from "@altterisk/game-hub";
import {
  CATEGORIES, catLabel, categoryOf, findCategory, mapImage, sortieImage, tabLabel, useSortie, useStages,
  type StageCategory, type StageEntry,
} from "../stages";
import { iconUrl, nameOf, useUnits } from "../data";
import { useStoryIndex, plain, type Book, type BookPart, type Skit } from "../story";
import type { UnitIndexEntry } from "../types";
import { StoryReader, QUEST_SCENE, type ReaderPart } from "../storyReader";
import { useHubLabels, useLang, useT, type UiKey } from "../i18n";
import { usePageMeta } from "../usePageMeta";

const KIND: Record<string, UiKey> = {
  legend: "storyKindLegend", world: "storyKindWorld", arena: "storyKindArena", festival: "storyKindFestival",
  grand: "storyKindGrand", tower: "storyKindTower", vote: "storyKindVote", surge: "storyKindSurge", other: "storyKindOther",
};

export default function Story() {
  const { kind, id } = useParams();
  return kind && id ? <StoryRead kind={kind} id={id} /> : <StoryIndexPage />;
}

/** Where an event book's scenes are listed: the series (and sub-menu card) of the stage list. */
function bookPlace(b: Book): { cat: string; sub?: string } {
  const n = Number(b.id.split("-")[1]);
  switch (b.kind) {
    case "legend": return { cat: "tenma" };
    case "world": return { cat: "voyage" };
    case "arena": return n === 1 ? { cat: "hell", sub: "enma" } : n === 2 ? { cat: "hell", sub: "hel" } : n === 5 ? { cat: "hell", sub: "hades" }
      : n === 6 ? { cat: "kenranshou" } : n === 3 ? { cat: "hell" } : { cat: "events" };
    case "festival": return { cat: "kenranshou" };
    case "tower": return { cat: n === 2 ? "seasons" : "palace" };
    case "surge": return { cat: "osaka" };
    default: return { cat: "events" };
  }
}

/** One entry of a series page: a quest's scenes or one event cutscene. */
type QItem = { kind: "q"; s: StageEntry; cat: string; sub?: string; tabNo: number | null; order: number };
type EItem = { kind: "e"; b: Book; p: BookPart; cat: string; sub?: string; tabNo: number | null; order: number };
type Item = QItem | EItem;

const EXTRA = ["skits", "bonds"] as const;

/** The story index laid out like the stage list (the sortie menu): series buttons, a series page
 *  with its sub-menu cards and chapter tabs, then the quests and cutscenes in game order. */
function StoryIndexPage() {
  const t = useT();
  const lang = useLang();
  const hub = useHubLabels();
  const [params, setParams] = useSearchParams();
  const { data: index, loading, error } = useStoryIndex();
  const { data: stages } = useStages();
  const { data: sortie } = useSortie();
  const { data: units } = useUnits();
  usePageMeta({ title: t("storyTitle"), description: t("storyMetaDesc") });
  const set = (kv: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(kv)) if (v) n.set(k, v); else n.delete(k);
    setParams(n, { replace: true });
  };
  const q = params.get("q") ?? "";

  const items = useMemo(() => {
    if (!index || !stages) return [] as Item[];
    const byId = new Map(stages.map((s) => [s.id, s]));
    const out: Item[] = [];
    const inBook = new Set<number>();
    for (const b of index.books) {
      const place = bookPlace(b);
      b.parts.forEach((p, i) => {
        if (p.quest != null) {
          const s = byId.get(p.quest);
          if (!s) return;
          inBook.add(p.quest);
          out.push({ kind: "q", s, cat: place.cat, tabNo: p.chapter ?? s.tabNo, order: i });
        } else {
          out.push({ kind: "e", b, p, cat: place.cat, sub: place.sub, tabNo: p.chapter ?? null, order: i });
        }
      });
    }
    for (const qid of index.quests) {
      const s = byId.get(qid);
      if (!s || inBook.has(qid)) continue;
      const place = categoryOf({ ...s, live: s.live ?? true });
      out.push({ kind: "q", s, cat: place.cat.k, sub: place.sub?.k, tabNo: tabLabel(s.tab, 1, lang) != null ? s.tabNo : null, order: s.id });
    }
    return out;
  }, [index, stages, lang]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      m.set(it.cat, (m.get(it.cat) || 0) + 1);
      if (it.sub) m.set(`${it.cat}/${it.sub}`, (m.get(`${it.cat}/${it.sub}`) || 0) + 1);
    }
    return m;
  }, [items]);

  if (!index || !stages) return <div className="page"><LoadState loading={loading || !stages} error={error} labels={hub.load} /></div>;
  const group = params.get("group") ?? "";
  const picked = findCategory(group);
  const cat = picked.cat;
  const sub = picked.sub ?? cat?.subs?.find((x) => x.k === params.get("sub"));
  const extra = EXTRA.find((x) => x === group);
  const go = (g: string, s = "") => set({ group: g || null, sub: s || null, tab: null, q: null });
  const itemLabel = (it: Item) => (it.kind === "q" ? it.s.name : partLabel(t, it.b, it.p));
  const term = q.trim().toLowerCase();

  let list = term
    ? items.filter((it) => itemLabel(it).toLowerCase().includes(term))
    : cat ? items.filter((it) => it.cat === cat.k && (!sub || it.sub === sub.k)) : [];
  // chapter tabs where the game has them (main story chapters, Tenma / voyage chapters)
  const ns = term ? [] : [...new Set(list.map((it) => it.tabNo).filter((n): n is number => n != null))].sort((a, b) => a - b);
  const series = list;
  const tabOf = (n: number) => {
    const s = series.find((it): it is QItem => it.kind === "q" && it.tabNo === n);
    return (s && tabLabel(s.s.tab, n, lang)) || t("storyChapter", { n });
  };
  const tabNo = ns.length > 1 ? (ns.includes(Number(params.get("tab"))) ? Number(params.get("tab")) : ns[0]) : null;
  // scenes outside any chapter (prologue, explainer, epilogues) stay above the tabs
  const loose = tabNo != null ? list.filter((it) => it.tabNo == null) : [];
  if (tabNo != null) list = list.filter((it) => it.tabNo === tabNo);
  const gameOrder = cat?.k === "tenma" || cat?.k === "voyage";
  list = [...list].sort((a, b) => (a.kind === "q" && b.kind === "q" && !gameOrder
    ? a.s.tabNo - b.s.tabNo || a.s.index - b.s.index || a.s.id - b.s.id
    : a.kind === b.kind || gameOrder ? a.order - b.order : a.kind === "e" ? 1 : -1));
  // the card beside the list, as in the game: only when every quest shown shares it
  const quests = list.filter((it): it is QItem => it.kind === "q");
  const cards = sortie ? new Set(quests.map((it) => sortie.quest[String(it.s.id)])) : new Set();
  const banner = !term && cards.size === 1 ? ([...cards][0] as number | undefined) : undefined;
  const page = sub ?? cat;
  const bg = sub?.bg ?? cat?.bg;
  return (
    <div className="page story-index">
      <PageHeader title={t("storyTitle")} subtitle={t("storySubtitle")} />
      <div className="stage-search"><SearchBox value={q} onChange={(v) => set({ q: v || null })} placeholder={t("storySearch")} clearLabel={hub.clearSearch} /></div>

      {!term && !cat && !extra && (
        <div className="sortie-grid">
          {CATEGORIES.map((c) => <SeriesButton key={c.k} c={c} n={counts.get(c.k) || 0} onClick={() => go(c.k)} />)}
          <SeriesButton text={t("storySkits")} n={index.skits.length} onClick={() => go("skits")} />
          <SeriesButton text={t("storyBonds")} n={index.bonds.length} onClick={() => go("bonds")} />
        </div>
      )}

      {!term && (cat || extra) && (
        <>
          <div className="sortie-head" style={bg ? { backgroundImage: `url(${sortieImage(bg)})` } : undefined}>
            <button type="button" className="hub-btn sortie-head__back" onClick={() => (sub && cat ? go(cat.k) : go(""))}>
              ‹ {sub && cat ? catLabel(cat, lang) : t("allSeries")}
            </button>
            {page?.img != null && <img className="sortie-head__img" src={sortieImage(page.img)} alt="" />}
            <span className="sortie-head__title">{page ? catLabel(page, lang) : extra === "skits" ? t("storySkits") : t("storyBonds")}</span>
            <span className="sortie-head__count">{t("storyEntries", {
              n: extra === "skits" ? index.skits.length : extra === "bonds" ? index.bonds.length : counts.get(sub && cat ? `${cat.k}/${sub.k}` : cat?.k ?? "") || 0,
            })}</span>
          </div>
          {cat?.subs && (
            <div className="sortie-cards">
              {cat.subs.map((x) => {
                const n = counts.get(`${cat.k}/${x.k}`) || 0;
                return (
                  <button key={x.k} type="button" className={`sortie-card${x === sub ? " sortie-card--active" : ""}`}
                    disabled={!n} onClick={() => go(cat.k, x === sub ? "" : x.k)} title={catLabel(x, lang)}>
                    <img src={sortieImage(x.img!)} alt={catLabel(x, lang)} loading="lazy" />
                    <span className="sortie-card__n">{n}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {!term && extra === "skits" && <SkitList skits={index.skits} />}
      {!term && extra === "bonds" && <BondList bonds={index.bonds} units={units ?? []} />}

      {(term || !extra) && (
        <>
          {loose.length > 0 && <div className="story-items story-items--loose">{loose.map((it, i) => <StoryItem key={`l${i}`} it={it} label={itemLabel(it)} />)}</div>}
          {tabNo != null && (
            <div className="sortie-tabs" role="tablist">
              {ns.map((n) => (
                <button key={n} type="button" role="tab" aria-selected={n === tabNo}
                  className={`sortie-tab${n === tabNo ? " sortie-tab--active" : ""}`} onClick={() => set({ tab: String(n) })}>
                  {tabOf(n)}
                </button>
              ))}
            </div>
          )}
          <div className={banner != null ? "sortie-page" : undefined}>
            {banner != null && <img className="sortie-page__banner" src={sortieImage(banner)} alt="" />}
            <div className="sortie-page__list">
              <div className="story-items">{list.map((it, i) => <StoryItem key={i} it={it} label={itemLabel(it)} />)}</div>
              {(term || cat) && !list.length && !loose.length && <p className="muted">{t("storyNone")}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** A series button like the stage list's (the game's sortie art), or a text tile. */
function SeriesButton({ c, text, n, onClick }: { c?: StageCategory; text?: string; n: number; onClick: () => void }) {
  const lang = useLang();
  const t = useT();
  return (
    <button type="button" className="sortie-btn" onClick={onClick} disabled={!n}
      style={c && c.img == null && c.bg != null ? { backgroundImage: `url(${sortieImage(c.bg)})` } : undefined}>
      <span className="sortie-btn__art">
        {c?.img != null ? <img src={sortieImage(c.img)} alt="" loading="lazy" /> : <span className="sortie-btn__text">{c ? c.jp : text}</span>}
      </span>
      <span className="sortie-btn__label">{c ? (lang === "ja" ? c.jp : c.en) : text}</span>
      <span className="sortie-btn__n muted small">{t("storyEntries", { n })}</span>
    </button>
  );
}

/** A quest (map thumbnail, like the stage list's cards) or one event cutscene. */
function StoryItem({ it, label }: { it: Item; label: string }) {
  const t = useT();
  if (it.kind === "q") {
    return (
      <Link to={`/story/q/${it.s.id}`} className="stage-card">
        <FallbackImage srcs={[mapImage(it.s.map)]} alt="" loading="lazy" className="stage-card__img" missingClassName="stage-card__img stage-card__img--none" />
        <span className="stage-card__name">{label}</span>
      </Link>
    );
  }
  return (
    <Link to={`/story/e/${it.p.scene}?book=${it.b.id}`} className="stage-card story-scene-card">
      <span className="story-scene-card__mark" aria-hidden="true">▶</span>
      <span className="stage-card__name">{label}</span>
      <span className="muted small">{it.b.title || t("storyKindOther")}</span>
    </Link>
  );
}

function SkitList({ skits }: { skits: Skit[] }) {
  return (
    <table className="hub-table story-skits">
      <tbody>
        {[...skits].reverse().map((s) => (
          <tr key={s.id}>
            <td className="muted small">{s.date}</td>
            <td><Link to={`/story/s/${s.id}`}>{s.title || `#${s.id}`}</Link></td>
            <td className="muted small">{plain(s.first)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BondList({ bonds, units }: { bonds: [number, number][]; units: UnitIndexEntry[] }) {
  const t = useT();
  const hub = useHubLabels();
  const [q, setQ] = useState("");
  const byId = new Map(units.map((u) => [u.id, u]));
  const term = q.trim().toLowerCase();
  return (
    <>
      <SearchBox value={q} onChange={setQ} placeholder={t("searchUnits")} clearLabel={hub.clearSearch} />
      <div className="story-bonds">
        {bonds.filter(([cid]) => !term || `${cid} ${byId.get(cid)?.name ?? ""} ${byId.get(cid)?.name_en ?? ""}`.toLowerCase().includes(term)).map(([cid, n]) => {
          const u = byId.get(cid);
          return (
            <Link key={cid} to={`/story/b/${cid}`} className="skin" title={u?.name}>
              {u?.face ? <img src={iconUrl(u.face)} alt="" width={56} height={56} loading="lazy" /> : <span className="icon-missing small-icon" />}
              <span className="skin__name">{u ? nameOf(u) : `#${cid}`}</span>
              <span className="muted small">{t("storyBondsN", { n })}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function partLabel(t: ReturnType<typeof useT>, b: Book, p: BookPart): string {
  switch (p.label) {
    case "prologue": return t("storyPrologue");
    case "tutorial": return t("storyTutorial");
    case "chapterStart": return t("storyChapterStart");
    case "afterMaps": return t("storyAfterMaps", { n: p.maps ?? 0 });
    case "epilogueNormal": return t("storyEpilogueNormal");
    case "epilogueHard": return t("storyEpilogueHard");
    case "epilogueVeryHard": return t("storyEpilogueVeryHard");
    case "other": return plain(p.first ?? "") || `#${p.scene}`;
  }
  const m = /^epilogue:(\d+):(\d+)$/.exec(p.label ?? "");
  if (m) return b.kind === "tower" && Number(m[2]) ? t("storyAfterFloor", { n: m[2] }) : t("storyEpilogueN", { n: m[1] });
  return p.label ?? "";
}

function StoryRead({ kind, id }: { kind: string; id: string }) {
  const t = useT();
  const hub = useHubLabels();
  const { data: index, loading, error } = useStoryIndex();
  const { data: stages } = useStages();
  const { data: units } = useUnits();
  const stageById = useMemo(() => new Map((stages ?? []).map((s) => [s.id, s])), [stages]);
  const questLabel = (n: number) => t(QUEST_SCENE[n] ?? "storyScene3");

  const view = useMemo(() => {
    if (!index) return null;
    if (kind === "q") {
      const s = stageById.get(Number(id));
      const at = index.quests.indexOf(Number(id));
      if (at < 0) return null;
      return {
        title: s?.name ?? `#${id}`, back: s ? <Link to={`/stages/${s.id}`}>{t("storyOpenStage")}</Link> : null,
        parts: [{ key: id, title: "", file: `q/${id}`, sceneLabel: questLabel }] as ReaderPart[],
        prev: at > 0 ? index.quests[at - 1] : null, next: at + 1 < index.quests.length ? index.quests[at + 1] : null,
      };
    }
    if (kind === "book") {
      const b = index.books.find((x) => x.id === id);
      if (!b) return null;
      let lastCh = 0;
      const parts: ReaderPart[] = b.parts.map((p, i) => {
        const chapter = p.chapter && p.chapter !== lastCh ? t("storyChapter", { n: p.chapter }) : undefined;
        if (p.chapter) lastCh = p.chapter;
        return p.quest != null
          ? { key: `q${p.quest}-${i}`, chapter, title: stageById.get(p.quest)?.name ?? `#${p.quest}`, file: `q/${p.quest}`, sceneLabel: questLabel }
          : { key: `e${p.scene}-${i}`, chapter, title: partLabel(t, b, p), file: `e/${p.scene}` };
      });
      return { title: b.title || t(KIND[b.kind] ?? "storyKindOther"), back: null, parts, prev: null, next: null };
    }
    if (kind === "e") {
      // one event cutscene; ?book= names the book it was opened from (its title and label)
      const bookId = new URLSearchParams(window.location.search).get("book");
      const b = index.books.find((x) => x.id === bookId) ?? index.books.find((x) => x.parts.some((p) => p.scene === Number(id)));
      const p = b?.parts.find((x) => x.scene === Number(id));
      if (!b || !p) return null;
      return {
        title: `${b.title || t(KIND[b.kind] ?? "storyKindOther")} · ${partLabel(t, b, p)}`,
        back: <Link to={`/story/book/${b.id}`}>{t("storyWholeBook")}</Link>,
        parts: [{ key: id, title: "", file: `e/${id}` }] as ReaderPart[], prev: null, next: null,
      };
    }
    if (kind === "s") {
      const s = index.skits.find((x) => x.id === Number(id));
      if (!s) return null;
      return { title: s.title || `#${id}`, back: <span className="muted small">{s.date}</span>, parts: [{ key: id, title: "", file: `s/${id}` }] as ReaderPart[], prev: null, next: null };
    }
    if (kind === "b") {
      const u = units?.find((x) => x.id === Number(id));
      if (!index.bonds.some(([cid]) => cid === Number(id))) return null;
      return {
        title: t("storyBondTitle", { name: u ? nameOf(u) : `#${id}` }), back: <Link to={`/units/${id}`}>{t("storyOpenUnit")}</Link>,
        parts: [{ key: id, title: "", file: `b/${id}`, sceneLabel: (n: number) => t("storyBond", { n }) }] as ReaderPart[], prev: null, next: null,
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, kind, id, stageById, units, t]);
  usePageMeta(view ? { title: view.title, description: t("storyMetaDesc") } : null);

  if (!index || (kind === "q" && !stages)) return <div className="page"><LoadState loading={loading || !stages} error={error} labels={hub.load} /></div>;
  if (!view) return <div className="page"><EmptyState title={t("storyNotFound")} action={<Link to="/story">{t("storyTitle")}</Link>} /></div>;
  return (
    <div className="page story-read">
      <p className="muted small"><Link to="/story">{t("storyTitle")}</Link></p>
      <PageHeader title={view.title} subtitle={view.back ?? undefined} />
      {(view.prev || view.next) && (
        <div className="story-nav">
          {view.prev ? <Link to={`/story/q/${view.prev}`}>← {stageById.get(view.prev)?.name}</Link> : <span />}
          {view.next ? <Link to={`/story/q/${view.next}`}>{stageById.get(view.next)?.name} →</Link> : <span />}
        </div>
      )}
      <StoryReader parts={view.parts} />
    </div>
  );
}
