import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FallbackImage, FilterChip, FilterRow, LoadState, PageHeader, SearchBox } from "@altterisk/game-hub";
import { listState, searchParamsAdapter, textMatch } from "@altterisk/game-hub/filters";
import { GROUPS, mapImage, useEvents, useStages, type GameEvent, type StageEntry } from "../stages";

const HELL = new Set(["enma", "hel", "osiris"]);

/** Events shown open at first; the rest are one click away. */
const OPEN_FIRST = 6;

/** Every stage the site has seen, grouped by series and by event (Event.atb), newest first. */
export default function Stages() {
  const { data: stages, loading, error } = useStages();
  const { data: events } = useEvents();
  const [params, setParams] = useSearchParams();
  const url = listState(searchParamsAdapter(params, setParams));
  const group = url.text("group") || "enma";
  const q = url.text("q");
  const pastToo = url.text("past") !== "0";

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stages || []) if (pastToo || s.live) m.set(s.group, (m.get(s.group) || 0) + 1);
    return m;
  }, [stages, pastToo]);

  const sections = useMemo(() => {
    const evById = new Map((events || []).map((e) => [e.id, e]));
    const list = (stages || []).filter((s) => (pastToo || s.live)
      && (q ? textMatch(q, [s.name, s.id, s.bushin, s.event != null ? evById.get(s.event)?.title : ""]) : s.group === group));
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
      return {
        k, ev, stages: ss,
        title: k.startsWith("b:") ? `武神 ${ss[0].bushin}` : k.startsWith("a:") ? k.slice(2) : ev?.title ?? "Without an event",
        live: ss.some((s) => s.live),
      };
    }).sort((a, b) => Number(b.live) - Number(a.live)
      // hell areas keep the game's order (by their first stage); events newest first
      || (a.k.startsWith("a:") && b.k.startsWith("a:") ? a.stages[0].id - b.stages[0].id : 0)
      || (b.ev?.start ?? "").localeCompare(a.ev?.start ?? "") || a.title.localeCompare(b.title));
  }, [stages, events, group, q, pastToo]);

  if (!stages) return <LoadState loading={loading} error={error} />;
  return (
    <div className="page">
      <PageHeader title="Stages"
        subtitle="Stages with their enemies, stats and, for Hell, Hades and Bushin, the deliberations (審議) you can toggle. Grouped by event; past events are rebuilt from maps still in the game client's cache, and stages the game removes stay here." />
      <div className="stage-search"><SearchBox value={q} onChange={(v) => url.setText("q", v)} placeholder="Search stage, event or Bushin" /></div>
      {!q && (
        <FilterRow label="Series">
          {GROUPS.map((g) => (
            <FilterChip key={g.k} active={g.k === group} count={counts.get(g.k) || 0} onClick={() => url.setText("group", g.k)}>
              {g.label}{g.jp ? ` ${g.jp}` : ""}
            </FilterChip>
          ))}
        </FilterRow>
      )}
      <FilterRow label="Show">
        <FilterChip active={pastToo} onClick={() => url.setText("past", "")}>Current and past</FilterChip>
        <FilterChip active={!pastToo} onClick={() => url.setText("past", "0")}>Current only</FilterChip>
      </FilterRow>
      {sections.map((sec, i) => <EventSection key={sec.k} {...sec} startOpen={i < OPEN_FIRST || !!q} />)}
      {!sections.length && <p className="muted">No stage matches.</p>}
    </div>
  );
}

const day = (d?: string) => (d ? d.slice(0, 10) : "");

function EventSection({ title, ev, stages, live, startOpen }: {
  title: string; ev?: GameEvent; stages: StageEntry[]; live: boolean; startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const when = ev && !ev.end.startsWith("2099") ? `${day(ev.start)} – ${day(ev.end)}` : ev ? `since ${day(ev.start)}` : "";
  return (
    <section className="event-sec">
      <button type="button" className="event-sec__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <FallbackImage srcs={[mapImage(stages[0].map)]} alt="" width={96} height={54} loading="lazy" className="event-sec__thumb" missingClassName="event-sec__thumb event-sec__thumb--none" />
        <span className="event-sec__title">{title}</span>
        <span className="event-sec__meta">
          {!live && <span className="hub-badge" title="No stage of this event is in the game's current quest list">past</span>}
          {when && <span className="muted small">{when}</span>}
          <span className="muted small">{stages.length} stages</span>
        </span>
      </button>
      {open && (
        <div className="stage-grid">
          {stages.map((s) => (
            <Link key={s.id} to={`/stages/${s.id}`} className="stage-card">
              <FallbackImage srcs={[mapImage(s.map)]} alt="" loading="lazy" className="stage-card__img" missingClassName="stage-card__img stage-card__img--none" />
              <span className="stage-card__name">{s.name}</span>
              <span className="stage-card__meta">
                {s.singi && <span className="hub-badge">審議</span>}
                {s.veryHard && <span className="hub-badge">超難</span>}
                {s.recovered && <span className="hub-badge" title="Rebuilt from the cached map: no stage multipliers or names in the data">cache</span>}
                {!s.live && !s.recovered && <span className="hub-badge">removed</span>}
                <span className="muted small">{s.enemies} enemies · {s.spawns} spawns</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
