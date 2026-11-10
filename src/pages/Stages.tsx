import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FilterChip, FilterRow, LoadState, PageHeader, Pager, SearchBox } from "@altterisk/game-hub";
import { listState, searchParamsAdapter, textMatch } from "@altterisk/game-hub/filters";
import { GROUPS, useStages, type StageEntry } from "../stages";

const PAGE = 60;

/** Every stage in the current game data, Hell / Abyss / Bushin first. */
export default function Stages() {
  const { data: stages, loading, error } = useStages();
  const [params, setParams] = useSearchParams();
  const url = listState(searchParamsAdapter(params, setParams));
  const group = url.text("group") || "enma";
  const q = url.text("q");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stages || []) m.set(s.group, (m.get(s.group) || 0) + 1);
    return m;
  }, [stages]);

  const list = useMemo(() => (stages || [])
    .filter((s) => (q ? textMatch(q, [s.name, s.id, s.bushin]) : s.group === group))
    .sort((a, b) => a.tab - b.tab || a.tabNo - b.tabNo || a.index - b.index || a.id - b.id), [stages, group, q]);

  if (!stages) return <LoadState loading={loading} error={error} />;
  const shown = list.slice(url.page * PAGE, (url.page + 1) * PAGE);
  return (
    <div className="page">
      <PageHeader title="Stages"
        subtitle="Every stage in the current game data with its enemies, stage multipliers and, for Hell, Abyss and Bushin stages, the deliberations (審議) you can toggle. Only stages that are live right now are in the data." />
      <div className="stage-search"><SearchBox value={q} onChange={(v) => url.setText("q", v)} placeholder="Search stage name / id / Bushin" /></div>
      {!q && (
        <FilterRow label="Group">
          {GROUPS.map((g) => (
            <FilterChip key={g.k} active={g.k === group} count={counts.get(g.k) || 0} onClick={() => url.setText("group", g.k)}>
              {g.label}{g.jp ? ` ${g.jp}` : ""}
            </FilterChip>
          ))}
        </FilterRow>
      )}
      <ul className="stage-list">
        {shown.map((s) => <StageItem key={s.id} s={s} />)}
      </ul>
      {!list.length && <p className="muted">No stage matches.</p>}
      {list.length > PAGE && <Pager page={url.page} pages={Math.ceil(list.length / PAGE)} onPage={(p) => url.setPage(p)} />}
    </div>
  );
}

function StageItem({ s }: { s: StageEntry }) {
  return (
    <li>
      <Link to={`/stages/${s.id}`} className="stage-item">
        <span className="stage-item__name">{s.name}</span>
        <span className="stage-item__meta">
          {s.bushin && <span className="hub-badge">武神 {s.bushin}</span>}
          {s.singi && <span className="hub-badge">審議</span>}
          {s.veryHard && <span className="hub-badge">超難</span>}
          <span className="muted small">{s.enemies} enemy types · {s.spawns} spawns · #{s.id}</span>
        </span>
      </Link>
    </li>
  );
}
