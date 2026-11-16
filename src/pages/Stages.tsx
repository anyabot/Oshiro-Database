import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FallbackImage, FilterChip, FilterRow, LoadState, PageHeader, SearchBox } from "@altterisk/game-hub";
import { listState, searchParamsAdapter, textMatch } from "@altterisk/game-hub/filters";
import {
  CATEGORIES, catLabel, categoryOf, findCategory, mapImage, sortieImage, tabLabel, useEvents, useSortie, useStages,
  type GameEvent, type StageCategory, type StageEntry,
} from "../stages";
import { useHubLabels, useLang, useT } from "../i18n";

const HELL = new Set(["enma", "hel", "osiris"]);

/** Events shown open at first; the rest are one click away. */
const OPEN_FIRST = 6;

/** The stage list laid out like the game's sortie (出陣) menu: the series buttons first, then the
 *  sub-menu cards (hells, palace corridors), then the stages grouped by area / war god / event. */
export default function Stages() {
  const { data: stages, loading, error } = useStages();
  const { data: events } = useEvents();
  const { data: sortie } = useSortie();
  const [params, setParams] = useSearchParams();
  const adapter = searchParamsAdapter(params, setParams);
  const url = listState(adapter);
  const q = url.text("q");
  const pastToo = url.text("past") !== "0";
  const t = useT();
  const lang = useLang();
  const hub = useHubLabels();

  // ?group=<series> (&sub=<card>); old links name a hell directly (?group=enma)
  const picked = findCategory(url.text("group"));
  const cat = picked.cat;
  const sub = picked.sub ?? cat?.subs?.find((x) => x.k === url.text("sub"));

  const placed = useMemo(() => (stages || []).filter((s) => pastToo || s.live).map((s) => ({ s, ...categoryOf(s) })), [stages, pastToo]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of placed) {
      m.set(p.cat.k, (m.get(p.cat.k) || 0) + 1);
      if (p.sub) m.set(`${p.cat.k}/${p.sub.k}`, (m.get(`${p.cat.k}/${p.sub.k}`) || 0) + 1);
    }
    return m;
  }, [placed]);

  const evById = useMemo(() => new Map((events || []).map((e) => [e.id, e])), [events]);
  const pageList = useMemo(() => (!q && !cat ? [] : placed.filter((p) => (q
    ? textMatch(q, [p.s.name, p.s.id, p.s.bushin, p.s.event != null ? evById.get(p.s.event)?.title : ""])
    : p.cat === cat && (!sub || p.sub === sub))).map((p) => p.s)), [placed, evById, cat, sub, q]);
  // the game's quest-page tabs (floors, chapters, 編…): series whose TabNumber the game shows as tabs
  const tabs = useMemo(() => {
    if (q || !pageList.length) return null;
    const tab = pageList[0].tab;
    if (tabLabel(tab, 1, lang) == null || pageList.some((s) => s.tab !== tab)) return null;
    const ns = [...new Set(pageList.map((s) => s.tabNo))].sort((a, b) => a - b);
    return ns.length > 1 ? { tab, ns } : null;
  }, [pageList, q, lang]);
  const tabNo = tabs ? (tabs.ns.includes(Number(url.text("tab"))) ? Number(url.text("tab")) : tabs.ns[0]) : null;
  const shown = useMemo(() => (tabNo == null ? pageList : pageList.filter((s) => s.tabNo === tabNo)), [pageList, tabNo]);
  // the card beside the list, as in the game: only when every stage shown shares it (one hell, one
  // chapter, one corridor); pages mixing several (Bushin, events) show it per section instead
  const banner = useMemo(() => {
    if (q || !sortie || !shown.length) return undefined;
    const ks = new Set(shown.map((s) => sortie.quest[String(s.id)]));
    return ks.size === 1 ? [...ks][0] : undefined;
  }, [q, sortie, shown]);

  const sections = useMemo(() => {
    const list = shown;
    // Bushin: one section per war god; Enma/Hel/Osiris: one per area, like the game's pages
    // (賽の河原 一層…七層, 焦熱地獄 一層…); everything else: per event
    const area = (s: StageEntry) => s.name.replace(/\s*\S+層$/, "");
    const key = (s: StageEntry) => (s.group === "bushin" && s.bushin ? `b:${s.bushin}`
      : HELL.has(s.group) ? `a:${area(s)}` : s.event != null ? `e:${s.event}` : "none");
    const m = new Map<string, StageEntry[]>();
    for (const s of list) m.set(key(s), [...(m.get(key(s)) || []), s]);
    return [...m.entries()].map(([k, ss]) => {
      const ev = ss[0].event != null ? evById.get(ss[0].event) : undefined;
      ss.sort((a, b) => a.tabNo - b.tabNo || a.index - b.index || a.id - b.id);
      const home = categoryOf(ss[0]);
      return {
        k, ev, stages: ss,
        title: k.startsWith("b:") ? `武神 ${ss[0].bushin}` : k.startsWith("a:") ? k.slice(2)
          : ev?.title ?? catLabel(home.sub ?? home.cat, lang),
        live: ss.some((s) => s.live),
      };
    }).sort((a, b) => Number(b.live) - Number(a.live)
      // hell areas keep the game's order (by their first stage); events newest first
      || (a.k.startsWith("a:") && b.k.startsWith("a:") ? a.stages[0].id - b.stages[0].id : 0)
      || (b.ev?.start ?? "").localeCompare(a.ev?.start ?? "") || a.title.localeCompare(b.title));
  }, [shown, evById, lang]);

  if (!stages) return <LoadState loading={loading} error={error} labels={hub.load} />;
  const go = (group: string, s = "") => adapter.set({ group: group || null, sub: s || null, tab: null });
  const page = sub ?? cat;
  const bg = sub?.bg ?? cat?.bg;
  return (
    <div className="page">
      <PageHeader title={t("stagesTitle")} subtitle={t("stagesSubtitle")} />
      <div className="stage-search"><SearchBox value={q} onChange={(v) => url.setText("q", v)} placeholder={t("searchStages")} clearLabel={hub.clearSearch} /></div>
      <FilterRow label={t("show")}>
        <FilterChip active={pastToo} onClick={() => url.setText("past", "")}>{t("currentAndPast")}</FilterChip>
        <FilterChip active={!pastToo} onClick={() => url.setText("past", "0")}>{t("currentOnly")}</FilterChip>
      </FilterRow>

      {!q && !cat && (
        <div className="sortie-grid">
          {CATEGORIES.map((c) => (
            <SortieButton key={c.k} c={c} n={counts.get(c.k) || 0} onClick={() => go(c.k)} />
          ))}
        </div>
      )}

      {!q && cat && page && (
        <>
          <div className="sortie-head" style={bg ? { backgroundImage: `url(${sortieImage(bg)})` } : undefined}>
            <button type="button" className="hub-btn sortie-head__back" onClick={() => (sub ? go(cat.k) : go(""))}>
              ‹ {sub ? catLabel(cat, lang) : t("allSeries")}
            </button>
            {page.img != null && <img className="sortie-head__img" src={sortieImage(page.img)} alt="" />}
            <span className="sortie-head__title">{catLabel(page, lang)}</span>
            <span className="sortie-head__count">{t("nStages", { n: counts.get(sub ? `${cat.k}/${sub.k}` : cat.k) || 0 })}</span>
          </div>
          {cat.subs && (
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

      {tabs && (
        <div className="sortie-tabs" role="tablist">
          {tabs.ns.map((n) => (
            <button key={n} type="button" role="tab" aria-selected={n === tabNo}
              className={`sortie-tab${n === tabNo ? " sortie-tab--active" : ""}`} onClick={() => url.setText("tab", String(n))}>
              {tabLabel(tabs.tab, n, lang)}
            </button>
          ))}
        </div>
      )}
      <div className={banner != null && !q ? "sortie-page" : undefined}>
        {banner != null && !q && <img className="sortie-page__banner" src={sortieImage(banner)} alt="" />}
        <div className="sortie-page__list">
          {tabs
            ? <StageGrid stages={[...shown].sort((a, b) => a.index - b.index || a.id - b.id)} />
            : sections.map((sec, i) => <EventSection key={sec.k} {...sec} card={sortie?.quest[String(sec.stages[0].id)]}
              startOpen={i < OPEN_FIRST || !!q} />)}
          {(q || cat) && !shown.length && <p className="muted">{t("noStage")}</p>}
        </div>
      </div>
    </div>
  );
}

/** One series button from the game's sortie menu, or a text tile where the game has none. */
function SortieButton({ c, n, onClick }: { c: StageCategory; n: number; onClick: () => void }) {
  const lang = useLang();
  const t = useT();
  return (
    <button type="button" className="sortie-btn" onClick={onClick} disabled={!n}
      style={c.img == null && c.bg != null ? { backgroundImage: `url(${sortieImage(c.bg)})` } : undefined}>
      <span className="sortie-btn__art">
        {c.img != null ? <img src={sortieImage(c.img)} alt="" loading="lazy" /> : <span className="sortie-btn__text">{c.jp}</span>}
      </span>
      <span className="sortie-btn__label">{lang === "ja" ? c.jp : c.en}</span>
      <span className="sortie-btn__n muted small">{t("nStages", { n })}</span>
    </button>
  );
}

const day = (d?: string) => (d ? d.slice(0, 10) : "");

function EventSection({ title, ev, stages, live, startOpen, card }: {
  title: string; ev?: GameEvent; stages: StageEntry[]; live: boolean; startOpen: boolean;
  /** the game's card for this page, used as the thumbnail when the page itself has none */
  card?: number;
}) {
  const [open, setOpen] = useState(startOpen);
  const t = useT();
  const when = ev && !ev.end.startsWith("2099") ? `${day(ev.start)} – ${day(ev.end)}` : ev ? t("since", { d: day(ev.start) }) : "";
  return (
    <section className="event-sec">
      <button type="button" className="event-sec__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {card != null
          ? <img src={sortieImage(card)} alt="" loading="lazy" className="event-sec__card" />
          : <FallbackImage srcs={[mapImage(stages[0].map)]} alt="" width={96} height={54} loading="lazy" className="event-sec__thumb" missingClassName="event-sec__thumb event-sec__thumb--none" />}
        <span className="event-sec__title">{title}</span>
        <span className="event-sec__meta">
          {!live && <span className="hub-badge" title={t("pastTitle")}>{t("past")}</span>}
          {when && <span className="muted small">{when}</span>}
          <span className="muted small">{t("nStages", { n: stages.length })}</span>
        </span>
      </button>
      {open && <StageGrid stages={stages} />}
    </section>
  );
}

function StageGrid({ stages }: { stages: StageEntry[] }) {
  const t = useT();
  return (
    <div className="stage-grid">
      {stages.map((s) => (
        <Link key={s.id} to={`/stages/${s.id}`} className="stage-card">
          <FallbackImage srcs={[mapImage(s.map)]} alt="" loading="lazy" className="stage-card__img" missingClassName="stage-card__img stage-card__img--none" />
          <span className="stage-card__name">{s.name}</span>
          <span className="stage-card__meta">
            {s.singi && <span className="hub-badge">審議</span>}
            {s.veryHard && <span className="hub-badge">超難</span>}
            {s.recovered && <span className="hub-badge" title={t("cacheTitle")}>{t("cache")}</span>}
            {!s.live && !s.recovered && <span className="hub-badge">{t("removed")}</span>}
            <span className="muted small">{t("enemiesSpawns", { e: s.enemies, s: s.spawns })}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
