import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FallbackImage, FilterChip, FilterRow, LoadState, PageHeader, Panel, SearchBox, SegmentedButtons } from "@altterisk/game-hub";
import { altName, iconUrl, nameOf, rarityLabel, terrainParts, tierName, useMeta, useUnits, weaponLabel } from "../data";
import { effectLabel, effectName, fmtAmount, giantGrade, useBuffData, useReach, type BuffRow } from "../buffData";
import { collectible, useCollection } from "../collection";
import { useUnitFilters } from "../unitFilters";
import { useFx, useHubLabels, useT, type UiKey } from "../i18n";
import { amountOf, atMaxGiant, atTier, byKey, gains, modeOf, reaching, total, type Contribution, type Mode, type TeamUnit } from "../team";
import type { UnitIndexEntry } from "../types";

const SLOT_LABEL: Record<string, UiKey> = {
  skill: "srcSkill", formation: "srcFormation", stratagem: "srcStratagem", special_attack: "srcSpecialAttack",
  class: "srcClass", weapon: "srcWeapon", special: "srcSpecial", token: "srcToken",
};
const PAGE = 20;

/** Kana-insensitive-enough search over both names and the reading. */
const matchesQuery = (u: UnitIndexEntry, q: string) => {
  const s = q.trim().toLowerCase();
  return !s || [u.name, u.name_en ?? "", u.ruby ?? ""].some((x) => x.toLowerCase().includes(s)) || String(u.id) === s;
};

function Face({ u, size = 40 }: { u: UnitIndexEntry | undefined; size?: number }) {
  return u?.face != null
    ? <FallbackImage srcs={[iconUrl(u.face)]} alt="" width={size} height={size} loading="lazy" className="team-face" missingClassName="team-face team-face--none" />
    : <span className="team-face team-face--none" style={{ width: size, height: size }} />;
}

/** Pick a castle girl to buff, build a formation around her, and see who adds the most buffs next. */
export default function Team() {
  const { data, loading, error } = useBuffData();
  const { data: reach } = useReach();
  const { data: index } = useUnits();
  const { data: meta } = useMeta();
  const [coll] = useCollection();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [addQ, setAddQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const t = useT();
  const hub = useHubLabels();
  const fx = useFx();

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const owned = Object.keys(coll).length;
  const targetId = Number(params.get("t")) || null;
  const members = (params.get("m") || "").split(",").map(Number).filter((n) => n && n !== targetId);
  const mode: Mode = params.get("mode") === "def" ? "def" : params.get("mode") === "util" ? "util" : "off";
  // the pool: the viewer's collection when they have one, unless they ask for every castle girl
  const fromCollection = owned > 0 && params.get("pool") !== "all";
  const focus = new Set((params.get("k") || "").split(",").filter(Boolean));
  const unitFilter = useUnitFilters(index ?? undefined, meta ?? undefined, params, setParams);

  const units = useMemo(() => new Map((index || []).map((u) => [u.id, u])), [index]);
  const pool = useMemo(() => (index || []).filter((u) => collectible(u) && (!fromCollection || String(u.id) in coll)), [index, coll, fromCollection]);
  /** renovation used for a castle girl: what the viewer owns, else her highest */
  const tierOf = (id: number) => coll[id] ?? units.get(id)?.renovation ?? 0;

  // the rows the team builder can use, by giver
  const rowsBy = useMemo(() => {
    const m = new Map<number, BuffRow[]>();
    for (const r of data?.rows || []) if (modeOf(r)) m.set(r.u, [...(m.get(r.u) || []), r]);
    return m;
  }, [data]);

  const target: TeamUnit | null = useMemo(() => {
    const u = targetId != null ? units.get(targetId) : undefined;
    return u ? { ...u, terrainWords: terrainParts(meta ?? undefined, u.terrain).map((x) => x.jp) } : null;
  }, [targetId, units, meta]);

  const contribOf = (g: number, m: Mode = mode): Contribution[] =>
    target && reach ? reaching(atMaxGiant(atTier(rowsBy.get(g) || [], tierOf(g)), giantGrade(data ?? undefined, g, tierOf(g))), g, target, reach, m, giantGrade(data ?? undefined, g, tierOf(g))) : [];
  const team = target ? [target.id, ...members] : [];
  // what the formation gives her, both kinds (the overview) and the chosen one (table, ranking)
  const both = useMemo(() => ({
    off: byKey(team.flatMap((g) => contribOf(g, "off"))),
    def: byKey(team.flatMap((g) => contribOf(g, "def"))),
    util: byKey(team.flatMap((g) => contribOf(g, "util"))),
  }), [team.join(), target, reach, rowsBy, coll]);
  const current = both[mode];

  const ranked = useMemo(() => {
    if (!target || !reach) return [];
    return pool
      .filter((u) => !team.includes(u.id) && unitFilter.matches(u))
      .map((u) => ({ u, ...gains(current, contribOf(u.id), focus) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score || b.fresh - a.fresh);
  }, [pool, current, unitFilter.matches, params.get("k")]);

  if (!data || !index) return <LoadState loading={loading} error={error} labels={hub.load} />;
  const names = data.keys;

  const setTeam = (ids: number[]) => { setShown(PAGE); set("m", ids.join(",") || null); };
  const toggleFocus = (k: string) => {
    const n = new Set(focus);
    if (n.has(k)) n.delete(k); else n.add(k);
    set("k", [...n].join(",") || null);
  };
  const unitMeta = (u: UnitIndexEntry) =>
    `${rarityLabel(meta ?? undefined, u.rarity)} · ${weaponLabel(meta ?? undefined, u.weapon)}${tierOf(u.id) > 0 ? ` · ${tierName(tierOf(u.id))}` : ""}`;
  const describe = (c: Contribution) => [
    t(SLOT_LABEL[c.row.sl] ?? "srcSkill"), c.row.nm, fx.who(c.row.w), c.row.n ? fx.note(c.row.n) : "",
    c.row.st === 1 ? t("stacks") : c.row.st === 0 ? t("strongestOnly") : "",
  ].filter(Boolean).join(" · ");

  const picks = q ? pool.filter((u) => matchesQuery(u, q)).slice(0, 24) : [];
  // manual formation: any castle girl, the viewer's own first
  const addPicks = addQ
    ? (index || []).filter((u) => collectible(u) && !team.includes(u.id) && matchesQuery(u, addQ))
      .sort((a, b) => Number(String(b.id) in coll) - Number(String(a.id) in coll)).slice(0, 24)
    : [];
  /** buff another member instead: she becomes the target, the old target joins the formation */
  const makeTarget = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("t", String(id));
    const m = [target!.id, ...members.filter((x) => x !== id)];
    next.set("m", m.join(","));
    next.delete("k");
    setParams(next, { replace: true });
  };
  const sortKeys = (m: Map<string, Contribution[]>) => [...m.entries()].sort((a, b) => effectLabel(a[0], names).localeCompare(effectLabel(b[0], names)));
  const currentKeys = sortKeys(current);

  return (
    <div className="page team-page">
      <PageHeader title={t("teamTitle")} subtitle={t("teamSubtitle")} />
      <div className="team-options">
        <SegmentedButtons label={t("teamPool")} selected={fromCollection ? "own" : "all"}
          options={[{ value: "own", label: t("teamPoolOwn", { n: owned }) }, { value: "all", label: t("teamPoolAll") }]}
          onToggle={(v) => set("pool", v === "all" ? "all" : null)} />
      </div>
      <p className="muted small">{t("teamMaxNote")}</p>
      {!owned && <p className="muted small">{t("teamNoCollection")} <Link to="/collection">{t("navCollection")}</Link></p>}

      <Panel title={t("teamTarget")}>
        {target ? (
          <div className="team-target">
            <Link className="team-unit" to={`/units/${target.id}`}>
              <Face u={units.get(target.id)} size={56} />
              <span>
                <span className="team-unit__name" title={altName(units.get(target.id)) || undefined}>{nameOf(units.get(target.id))}</span>
                <span className="team-unit__meta">{unitMeta(units.get(target.id)!)}</span>
              </span>
            </Link>
            <button className="hub-btn" onClick={() => { set("t", null); setQ(""); }}>{t("teamChange")}</button>
          </div>
        ) : (
          <>
            <SearchBox value={q} onChange={setQ} placeholder={t("searchUnits")} clearLabel={hub.clearSearch} />
            <div className="team-picks">
              {picks.map((u) => (
                <button key={u.id} className="team-pick" onClick={() => { const next = new URLSearchParams(params); next.set("t", String(u.id)); setParams(next, { replace: true }); setQ(""); }}>
                  <Face u={u} size={36} />
                  <span>{nameOf(u)}</span>
                </button>
              ))}
              {q && !picks.length && <span className="muted small">{t("nothingMatches")}</span>}
              {!q && <span className="muted small">{t("teamPickHint")}</span>}
            </div>
          </>
        )}
      </Panel>

      {target && (
        <>
          <Panel title={t("teamFormation", { n: team.length })}>
            <div className="team-members">
              {team.map((id) => {
                const u = units.get(id);
                return (
                  <span key={id} className={`team-member${id === target.id ? " is-target" : ""}`}>
                    <Link to={`/units/${id}`} title={u ? nameOf(u) : String(id)}><Face u={u} size={44} /></Link>
                    <span className="team-member__name">{u ? nameOf(u) : `#${id}`}</span>
                    {id !== target.id && <button className="team-member__x" aria-label={t("teamRemove")} title={t("teamRemove")} onClick={() => setTeam(members.filter((m) => m !== id))}>×</button>}
                    {id !== target.id && <button className="team-member__t" title={t("teamMakeTarget")} onClick={() => makeTarget(id)}>{t("teamBuffHer")}</button>}
                  </span>
                );
              })}
            </div>
            <div className="team-add-manual">
              <SearchBox value={addQ} onChange={setAddQ} placeholder={t("teamAddSearch")} clearLabel={hub.clearSearch} />
              {addQ && (
                <div className="team-picks">
                  {addPicks.map((u) => (
                    <button key={u.id} className={`team-pick${String(u.id) in coll ? " is-own" : ""}`} onClick={() => setTeam([...members, u.id])}>
                      <Face u={u} size={36} />
                      <span>{nameOf(u)}{String(u.id) in coll && coll[u.id] > 0 ? ` · ${tierName(coll[u.id])}` : ""}</span>
                    </button>
                  ))}
                  {!addPicks.length && <span className="muted small">{t("nothingMatches")}</span>}
                </div>
              )}
            </div>
            {members.length > 0 && <button className="hub-btn team-clear" onClick={() => setTeam([])}>{t("teamClear")}</button>}
          </Panel>

          <Panel title={t("teamOverall", { name: nameOf(units.get(target.id)) })}>
            <div className="team-overall">
              {(["off", "def", "util"] as const).map((m) => (
                <div key={m} className="team-overall__col">
                  <h3 className="team-overall__h">{t(m === "off" ? "teamOffense" : m === "def" ? "teamDefense" : "teamUtility")}</h3>
                  {both[m].size ? (
                    <ul className="team-overall__list">
                      {sortKeys(both[m]).map(([k, cs]) => (
                        <li key={k}>
                          <span>{effectLabel(k, names)}</span>
                          <strong className="team-num">{fmtAmount(k, amountOf(k, total(k, cs)))}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted small">{t("teamNothingYet")}</p>}
                </div>
              ))}
            </div>
          </Panel>

          <FilterRow label={t("type")}>
            <FilterChip active={mode === "off"} onClick={() => { const n = new URLSearchParams(params); n.delete("mode"); n.delete("k"); setParams(n, { replace: true }); }}>{t("teamOffense")}</FilterChip>
            <FilterChip active={mode === "def"} onClick={() => { const n = new URLSearchParams(params); n.set("mode", "def"); n.delete("k"); setParams(n, { replace: true }); }}>{t("teamDefense")}</FilterChip>
            <FilterChip active={mode === "util"} onClick={() => { const n = new URLSearchParams(params); n.set("mode", "util"); n.delete("k"); setParams(n, { replace: true }); }}>{t("teamUtility")}</FilterChip>
          </FilterRow>

          <Panel title={t("teamCurrent", { name: nameOf(units.get(target.id)) })}>
            {currentKeys.length ? (
              <>
                <p className="muted small">{t("teamFocusHint")}</p>
                <table className="hub-table hub-table--stack team-current">
                  <thead><tr><th>{t("effect")}</th><th>{t("teamTotal")}</th><th>{t("teamFrom")}</th></tr></thead>
                  <tbody>
                    {currentKeys.map(([k, cs]) => (
                      <tr key={k} className={focus.has(k) ? "is-focus" : undefined}>
                        <td data-label={t("effect")}>
                          <label className="team-focus">
                            <input type="checkbox" checked={focus.has(k)} onChange={() => toggleFocus(k)} /> {effectLabel(k, names)}
                          </label>
                        </td>
                        <td data-label={t("teamTotal")} className="team-num"><strong>{fmtAmount(k, amountOf(k, total(k, cs)))}</strong></td>
                        <td data-label={t("teamFrom")}>
                          <span className="team-from">
                            {cs.filter((c, i) => cs.findIndex((o) => o.giver === c.giver && o.v === c.v) === i).map((c, i) => (
                              <span key={i} className="team-from__item" title={`${nameOf(units.get(c.giver))}: ${fmtAmount(k, c.v)} · ${describe(c)}`}>
                                <Face u={units.get(c.giver)} size={24} />
                                <span className="small">{fmtAmount(k, c.v)}</span>
                              </span>
                            ))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : <p className="muted small">{t("teamNothingYet")}</p>}
          </Panel>

          <h2 className="team-h">{t("teamSuggest")}</h2>
          <p className="muted small">{t("teamSuggestNote")}</p>
          <div className="buff-unit-filters">{unitFilter.panel}</div>
          {focus.size > 0 && (
            <p className="small">{t("teamFocusOn", { n: focus.size })} <button className="hub-btn" onClick={() => set("k", null)}>{t("teamFocusClear")}</button></p>
          )}
          <ol className="team-cands">
            {ranked.slice(0, shown).map(({ u, list, fresh, score }) => (
              <li key={u.id} className="team-cand">
                <div className="team-cand__head">
                  <Link className="team-unit" to={`/units/${u.id}${tierOf(u.id) > 0 ? `?kai=${tierOf(u.id)}` : ""}`}>
                    <Face u={u} size={44} />
                    <span>
                      <span className="team-unit__name" title={altName(u) || undefined}>{nameOf(u)}</span>
                      <span className="team-unit__meta">{unitMeta(u)}</span>
                    </span>
                  </Link>
                  <span className="team-cand__score" title={t("teamScoreTitle")}>
                    {fresh > 0 && <span className="team-new">{t("teamNewN", { n: fresh })}</span>}
                    <span className="muted small">{score.toFixed(1)}</span>
                  </span>
                  <button className="hub-btn team-add" onClick={() => setTeam([...members, u.id])}>{t("teamAdd")}</button>
                </div>
                <div className="team-gains">
                  {list.map((g) => {
                    const up = g.after > g.before;
                    return (
                      <span key={g.k} className={`team-gain${g.isNew ? " is-new" : up ? " is-up" : " is-none"}${g.best.near ? " is-near" : ""}`}
                        title={`${describe(g.best)}${up ? `\n${fmtAmount(g.k, amountOf(g.k, g.before))} → ${fmtAmount(g.k, amountOf(g.k, g.after))}` : `\n${t("teamNoGain")}`}`}>
                        {effectName(g.k, names)} <strong>{fmtAmount(g.k, g.best.v)}</strong>
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
          {!ranked.length && <p className="muted">{t("teamNoCandidates")}</p>}
          {ranked.length > shown && <button className="hub-btn" onClick={() => setShown(shown + PAGE)}>{t("teamMore", { n: Math.min(PAGE, ranked.length - shown), left: ranked.length - shown })}</button>}
          <p className="muted small">{t("teamFooter")}</p>
        </>
      )}
    </div>
  );
}
