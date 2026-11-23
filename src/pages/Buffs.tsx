import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FallbackImage, FilterChip, FilterRow, GroupCard, LoadState, PageHeader, SegmentedButtons } from "@altterisk/game-hub";
import { listState, searchParamsAdapter } from "@altterisk/game-hub/filters";
import { altName, iconUrl, nameOf, rarityLabel, tierName, useMeta, useUnits, weaponLabel } from "../data";
import { useUnitFilters } from "../unitFilters";
import type { UnitIndexEntry } from "../types";
import { useFx, useHubLabels, useT, type UiKey } from "../i18n";
import { HITS, PERMANENT, effectLabel, fmtAmount, isUtil, useBuffData, type BuffRow } from "../buffData";

const CATEGORIES: { k: string; label: UiKey }[] = [
  { k: "offense", label: "catOffense" },
  { k: "defense", label: "catDefense" },
  { k: "ki", label: "catKi" },
  { k: "other", label: "catOther" },
  { k: "debuff", label: "catDebuff" },
  { k: "utility", label: "catUtility" },
];
const DEBUFF_COLOR = "#f7768e";

// StatusType ranges: 2xx attack-side, 3xx defense-side, 1xx HP; 5xx special gauge, 10xxx Ki/stratagem
const OFFENSE = new Set([202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 217, 219, 220, 223, 225]);
const DEFENSE = new Set([101, 102, 103, 105, 107, 111, 113, 301, 302, 303, 304, 305, 306, 307, 314, 316, 321]);
function category(r: BuffRow): string {
  if (r.k.startsWith("util:")) return "utility";
  const key = r.k.split("|")[0];
  // damage an effect deals (× ATK, % of HP): offense, whoever it lands on
  if (key.startsWith("dmgfx:")) return "offense";
  if (r.sd === "e") return "debuff";
  if (key.startsWith("dmg:dealt") || key === "dmg:bonus" || key === "hits") return "offense";
  if (key.startsWith("dmg:taken") || key.startsWith("counter:") || key.startsWith("heal:") || key === "evade" || key === "barrier" || key === "nullify") return "defense";
  if (key === "ki:natural" || key === "ki:periodic") return "ki";
  // inspire keys ("status:202~giver:202") rank with the status they change
  const m = /^status:(\d+)/.exec(key);
  if (!m) return "other";
  const s = Number(m[1]);
  if (OFFENSE.has(s)) return "offense";
  if (DEFENSE.has(s)) return "defense";
  if (s === 106 || (s >= 500 && s < 600) || s >= 10000) return "ki";
  return "other";
}

const SOURCES: { value: string; label: UiKey; note: UiKey }[] = [
  { value: "skill", label: "srcSkill", note: "noteSkill" },
  { value: "formation", label: "srcFormation", note: "noteFormation" },
  { value: "stratagem", label: "srcStratagem", note: "noteStratagem" },
  { value: "special_attack", label: "srcSpecialAttack", note: "noteSpecialAttack" },
  { value: "class", label: "srcClass", note: "noteClass" },
  { value: "weapon", label: "srcWeapon", note: "noteWeapon" },
  { value: "special", label: "srcSpecial", note: "noteSpecial" },
  { value: "possession", label: "srcPossession", note: "notePossession" },
  { value: "defeat", label: "srcDefeat", note: "noteDefeat" },
  { value: "token", label: "srcToken", note: "noteToken" },
];
const SOURCE_BY = Object.fromEntries(SOURCES.map((s) => [s.value, s]));

// who receives it, bucketed from the receiver text the effect describer writes
const REACH: { value: string; label: UiKey }[] = [
  { value: "self", label: "reachSelf" },
  { value: "single", label: "reachSingle" },
  { value: "range", label: "reachRange" },
  { value: "wide", label: "reachWide" },
  { value: "group", label: "reachGroup" },
];
function reach(r: BuffRow): string {
  const w = r.w;
  if (w === "Self") return "self";
  if (w === "Target" || w === "Enemy hit" || w === "Enemy that defeated her" || w === "Enemies it blocks" || w === "Chosen placement spot" || / placed on the spot$/.test(w)) return "single";
  if (/in range|in the target's range|in the area$/.test(w)) return "range";
  // Ki over time goes to the side's shared pool: "Your side"
  if (/^All |in the formation$|^Allies$|^Castle girls$|^Enemies$|^Your side$/.test(w)) return "wide";
  return "group";
}



/** Multipliers below 1 rank the smaller one first; everything else the bigger amount. */
// an attack gap set to a value (「攻撃後の隙が…になる」): the shorter one first
const lowerFirst = (k: string) => k.endsWith("|-|×") || k.startsWith("status:207|=|");

const PREVIEW = 10;

/** Who gives the biggest X to whom: one ranked list per effect and source. */
export default function Buffs() {
  const { data, loading, error } = useBuffData();
  const { data: index } = useUnits();
  const { data: meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const adapter = searchParamsAdapter(params, setParams);
  const t = useT();
  const hub = useHubLabels();
  const fx = useFx();
  const url = listState(adapter);

  const cat = CATEGORIES.find((c) => c.k === url.text("cat"))?.k ?? "offense";
  const sources = url.list("source");
  const reaches = url.list("to");
  // stacking: "1" stacks, "0" strongest only, "x" anything else (a rule in words, or none given)
  const stacking = url.list("stack");
  const stackOf = (r: BuffRow) => (r.st === 1 ? "1" : r.st === 0 ? "0" : "x");
  const base = url.text("tier") === "base";
  const byValue = url.text("rank") === "value";
  // castle girl filters (same as the castle girl list): only buffs from matching castle girls
  const unitFilter = useUnitFilters(index ?? undefined, meta ?? undefined, params, setParams);

  const units = useMemo(() => new Map((index || []).map((u) => [u.id, u])), [index]);

  // Tier: "best" keeps, per castle girl and slot, the highest renovation that has it; "base" the
  // unrenovated card only. Tier -1 rows (class, special ability) count for every tier.
  const tiered = useMemo(() => {
    const rows = data?.rows || [];
    if (base) return rows.filter((r) => r.t <= 0);
    const top = new Map<string, number>();
    for (const r of rows) {
      const g = `${r.u}|${r.sl}`;
      if (r.t > (top.get(g) ?? -1)) top.set(g, r.t);
    }
    return rows.filter((r) => r.t < 0 || r.t === top.get(`${r.u}|${r.sl}`));
  }, [data, base]);

  const filtered = useMemo(() => tiered.filter((r) =>
    (!sources.length || sources.includes(r.sl))
    && (!reaches.length || reaches.includes(reach(r)))
    && (!stacking.length || stacking.includes(stackOf(r)))
    && (!unitFilter.activeCount || unitFilter.matches(units.get(r.u)))),
  [tiered, sources.join(), reaches.join(), stacking.join(), unitFilter.matches, unitFilter.activeCount, units]);

  const unitsIn = (list: BuffRow[]) => new Set(list.map((r) => r.u)).size;
  const byCat = useMemo(() => {
    const m = new Map<string, BuffRow[]>();
    for (const r of filtered) {
      const c = category(r);
      m.set(c, [...(m.get(c) || []), r]);
    }
    return m;
  }, [filtered]);
  const keys = useMemo(() => {
    const m = new Map<string, BuffRow[]>();
    for (const r of byCat.get(cat) || []) m.set(r.k, [...(m.get(r.k) || []), r]);
    return [...m.entries()].sort((a, b) => unitsIn(b[1]) - unitsIn(a[1]));
  }, [byCat, cat]);
  const key = keys.find(([k]) => k === url.text("k"))?.[0] ?? keys[0]?.[0];

  const groups = useMemo(() => {
    const list = keys.find(([k]) => k === key)?.[1] || [];
    const lower = key ? lowerFirst(key) : false;
    const score = (r: BuffRow) => (byValue ? r.v : r.mx ?? r.v);
    const m = new Map<string, BuffRow[]>();
    for (const r of list) m.set(r.sl, [...(m.get(r.sl) || []), r]);
    return SOURCES.filter((s) => m.has(s.value)).map((s) => {
      // one row per castle girl and receiver: a narrower buff (only Plain castle girls) isn't hidden by her
      // stronger one for everyone
      const seen = new Set<string>();
      const ranked = [...m.get(s.value)!]
        .sort((a, b) => (lower ? score(a) - score(b) : score(b) - score(a)) || b.v - a.v)
        .filter((r) => !seen.has(`${r.u}|${r.w}`) && !!seen.add(`${r.u}|${r.w}`));
      return { sl: s.value, ranked };
    });
  }, [keys, key, byValue]);

  if (!data) return <LoadState loading={loading} error={error} labels={hub.load} />;
  const names = data.keys;
  return (
    <div className="page buffs-page">
      <PageHeader title={t("buffTitle")} subtitle={t("buffSubtitle")} />
      <details className="stack-help">
        <summary>{t("stackHelp")}</summary>
        <ul className="small">
          {(["stackStrongest", "stackAdds", "stackGrow", "stackScale"] as const).map((k) => (
            // fixed strings from the UI table, with <b>/<i> markup only
            <li key={k} dangerouslySetInnerHTML={{ __html: t(k) }} />
          ))}
        </ul>
      </details>
      <FilterRow label={t("type")}>
        {CATEGORIES.map((c) => (
          <FilterChip key={c.k} active={c.k === cat} count={unitsIn(byCat.get(c.k) || [])}
            color={c.k === "debuff" ? DEBUFF_COLOR : undefined}
            onClick={() => adapter.set({ cat: c.k, k: null })}>
            {t(c.label)}
          </FilterChip>
        ))}
      </FilterRow>
      <FilterRow label={t("effect")}>
        {keys.map(([k, list]) => (
          <FilterChip key={k} active={k === key} count={unitsIn(list)} onClick={() => url.setText("k", k)}>{effectLabel(k, names)}</FilterChip>
        ))}
        {!keys.length && <span className="muted small">{t("nothingMatches")}</span>}
      </FilterRow>
      <FilterRow label={t("receiver")}>
        <FilterChip active={!reaches.length} onClick={() => url.clear(["to"])}>{t("any")}</FilterChip>
        {REACH.map((o) => (
          <FilterChip key={o.value} active={reaches.includes(o.value)} onClick={() => url.toggle("to", o.value)}>{t(o.label)}</FilterChip>
        ))}
      </FilterRow>
      <FilterRow label={t("stacking")}>
        <FilterChip active={!stacking.length} onClick={() => url.clear(["stack"])}>{t("all")}</FilterChip>
        <FilterChip active={stacking.includes("1")} onClick={() => url.toggle("stack", "1")}>{t("stacks")}</FilterChip>
        <FilterChip active={stacking.includes("0")} onClick={() => url.toggle("stack", "0")}>{t("strongestOnly")}</FilterChip>
        <FilterChip active={stacking.includes("x")} onClick={() => url.toggle("stack", "x")}>{t("stackOther")}</FilterChip>
      </FilterRow>
      <FilterRow label={t("source")}>
        <FilterChip active={!sources.length} onClick={() => url.clear(["source"])}>{t("all")}</FilterChip>
        {SOURCES.map((o) => (
          <FilterChip key={o.value} active={sources.includes(o.value)} onClick={() => url.toggle("source", o.value)}>{t(o.label)}</FilterChip>
        ))}
      </FilterRow>
      <div className="buff-options">
        <SegmentedButtons label={t("renovation")} selected={base ? "base" : "best"}
          options={[{ value: "best", label: t("highest") }, { value: "base", label: t("unrenovated") }]}
          onToggle={(v) => url.setText("tier", v === "base" ? "base" : "")} />
        <SegmentedButtons label={t("rankBy")} selected={byValue ? "value" : "max"}
          options={[{ value: "max", label: t("maxReached") }, { value: "value", label: t("baseValue") }]}
          onToggle={(v) => url.setText("rank", v === "value" ? "value" : "")} />
      </div>
      <div className="buff-unit-filters">{unitFilter.panel}</div>
      <div className="buff-groups">
        {key && groups.map(({ sl, ranked }) => {
          const open = expanded.has(sl);
          const shown = open ? ranked : ranked.slice(0, PREVIEW);
          return (
            <GroupCard key={sl} className="buff-group"
              title={`${effectLabel(key, names)} · ${t(SOURCE_BY[sl].label)}`}
              count={t("nCastleGirls", { n: new Set(ranked.map((r) => r.u)).size })}
              note={t(SOURCE_BY[sl].note)}>
              <table className="hub-table hub-table--stack buff-table">
                <thead><tr><th>#</th><th>{t("value")}</th><th>{t("castleGirl")}</th><th>{t("receiver")}</th><th>{t("conditions")}</th></tr></thead>
                <tbody>
                  {shown.map((r, i) => {
                    const u: UnitIndexEntry | undefined = units.get(r.u);
                    return (
                      <tr key={`${r.u}-${i}`}>
                        <td data-label="#" className="muted">{i + 1}</td>
                        <td data-label={t("value")} className="buff-val">
                          <strong>{isUtil(r.k) ? (r.v >= PERMANENT ? t("permanent") : r.v === 0 ? "✓" : t("seconds", { n: r.v })) : fmtAmount(r.k, r.v)}</strong>
                          {r.mx != null && r.mx !== r.v && <div className="small muted">{t("max", { v: fmtAmount(r.k, r.mx) })}</div>}
                          {r.nc && <div className="small muted">{t("noCap")}</div>}
                          {r.st != null && (
                            <div className={`buff-stack ${r.st === 1 ? "is-stack" : r.st === 0 ? "is-max" : ""}`}>
                              {r.st === 1 ? t("stacks") : r.st === 0 ? t("strongestOnly") : r.st}
                            </div>
                          )}
                        </td>
                        <td data-label={t("castleGirl")}>
                          <Link className="buff-unit" to={`/units/${r.u}${r.t > 0 ? `?kai=${r.t}` : ""}`}>
                            {u?.face != null
                              ? <FallbackImage srcs={[iconUrl(u.face)]} alt="" width={36} height={36} loading="lazy" missingClassName="buff-noicon" />
                              : <span className="buff-noicon" />}
                            <span>
                              <span className="buff-unit-name" title={altName(u) || undefined}>{u ? nameOf(u) : `#${r.u}`}</span>
                              {u && <span className="buff-unit-meta">{rarityLabel(meta, u.rarity)} · {weaponLabel(meta, u.weapon)}{r.t > 0 ? ` · ${tierName(r.t)}` : ""}</span>}
                            </span>
                          </Link>
                        </td>
                        <td data-label={t("receiver")} className="buff-target">{fx.who(r.w)}</td>
                        <td data-label={t("conditions")} className="buff-target">
                          {r.n ? <span className="small">{isUtil(r.k) || r.k === HITS ? fx.line(r.n) : fx.note(r.n)}</span> : <span className="muted small">—</span>}
                          {r.nm && <div className="muted small">{r.nm}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {ranked.length > PREVIEW && (
                <button className="hub-btn buff-more" onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(sl)) n.delete(sl); else n.add(sl); return n; })}>
                  {open ? t("showTop", { n: PREVIEW }) : t("showAll", { n: ranked.length })}
                </button>
              )}
            </GroupCard>
          );
        })}
      </div>
      <p className="muted small">{t("buffFooter")}</p>
    </div>
  );
}
