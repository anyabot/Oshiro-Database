import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FallbackImage, FilterChip, FilterRow, GroupCard, LoadState, PageHeader, SegmentedButtons } from "@altterisk/game-hub";
import { listState, searchParamsAdapter } from "@altterisk/game-hub/filters";
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import { iconUrl, rarityLabel, useMeta, useUnits, weaponLabel } from "../data";
import type { UnitIndexEntry } from "../types";

/** One row of public/data/buffs.json (scripts/buffs.ts). */
interface BuffRow {
  u: number;
  /** renovation tier the slot comes from; -1 = every tier */
  t: number;
  sl: string;
  /** "<stat key>|<+|->|<unit>" */
  k: string;
  v: number;
  mx?: number;
  /** grows with no cap (LimitValue 9999+) */
  nc?: 1;
  sd: "a" | "e";
  w: string;
  n?: string;
  st?: 0 | 1 | string;
  nm?: string;
}
interface BuffData { keys: Record<string, string>; rows: BuffRow[] }

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });

const CATEGORIES = [
  { k: "offense", label: "Offense" },
  { k: "defense", label: "Defense & healing" },
  { k: "ki", label: "Ki & cooldowns" },
  { k: "other", label: "Other" },
  { k: "debuff", label: "Enemy debuffs" },
];
const DEBUFF_COLOR = "#f7768e";

// StatusType ranges: 2xx attack-side, 3xx defense-side, 1xx HP; 5xx special gauge, 10xxx Ki/stratagem
const OFFENSE = new Set([202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 217, 219, 220, 223, 225]);
const DEFENSE = new Set([101, 102, 103, 105, 107, 111, 113, 301, 302, 303, 304, 305, 306, 307, 314, 316, 321]);
function category(r: BuffRow): string {
  if (r.sd === "e") return "debuff";
  const key = r.k.split("|")[0];
  if (key === "dmg:dealt" || key === "dmg:bonus") return "offense";
  if (key === "dmg:taken") return "defense";
  if (key === "ki:natural") return "ki";
  const m = /^status:(\d+)$/.exec(key);
  if (!m) return "other";
  const s = Number(m[1]);
  if (OFFENSE.has(s)) return "offense";
  if (DEFENSE.has(s)) return "defense";
  if (s === 106 || (s >= 500 && s < 600) || s >= 10000) return "ki";
  return "other";
}

const SOURCES = [
  { value: "skill", label: "Specialty 特技" },
  { value: "formation", label: "Formation 編成特技" },
  { value: "stratagem", label: "Stratagem 計略" },
  { value: "special_attack", label: "Special attack" },
  { value: "class", label: "Class ability" },
  { value: "special", label: "Special ability" },
  { value: "possession", label: "Possession 所持" },
  { value: "defeat", label: "On defeat 撃破時" },
];
const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.value, s.label]));
const SOURCE_NOTE: Record<string, string> = {
  skill: "The castle girl's own specialty: always on while deployed, or on its trigger.",
  formation: "Applies to the formation from the start of the battle.",
  stratagem: "Active while the stratagem lasts.",
  special_attack: "Applied by the special attack.",
  class: "Every castle girl of the class has it.",
  special: "Special ability (sub-ability) effects.",
  possession: "Applies while the castle girl is owned / in the formation.",
  defeat: "When the castle girl is defeated.",
};

// who receives it, bucketed from the receiver text the effect describer writes
const REACH = [
  { value: "self", label: "Self" },
  { value: "single", label: "Single target" },
  { value: "range", label: "In range" },
  { value: "wide", label: "All / formation" },
  { value: "group", label: "Tokens & others" },
];
function reach(r: BuffRow): string {
  const w = r.w;
  if (w === "Self") return "self";
  if (w === "Target" || w === "Enemy hit" || w === "Enemies it blocks") return "single";
  if (/in range|in the target's range/.test(w)) return "range";
  if (/^All |in the formation$|^Allies$|^Castle girls$|^Enemies$/.test(w)) return "wide";
  return "group";
}

const RARITY_MIN = [
  { value: "", label: "Any" },
  { value: "5", label: "★5+" },
  { value: "6", label: "★6+" },
];

const UNIT_TAG: Record<string, string> = { "%": "%", "": "flat", "×": "×", s: "sec" };
function effectLabel(k: string, names: Record<string, string>): string {
  const [key, dir, unit] = k.split("|");
  return `${names[key] ?? key} ${dir === "+" ? "↑" : "↓"} ${UNIT_TAG[unit] ?? unit}`;
}

const fmtNum = (n: number) => String(Math.round(n * 1000) / 1000);
function fmtAmount(k: string, v: number): string {
  const [, dir, unit] = k.split("|");
  if (unit === "×") return `×${fmtNum(v)}`;
  return `${dir === "+" ? "+" : "−"}${fmtNum(v)}${unit === "s" ? "s" : unit}`;
}
/** Multipliers below 1 rank the smaller one first; everything else the bigger amount. */
const lowerFirst = (k: string) => k.endsWith("|-|×");

const PREVIEW = 10;

/** Who gives the biggest X to whom: one ranked list per effect and source. */
export default function Buffs() {
  const { data, loading, error } = useJson<BuffData>(loader, "buffs");
  const { data: index } = useUnits();
  const { data: meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const adapter = searchParamsAdapter(params, setParams);
  const url = listState(adapter);

  const cat = CATEGORIES.find((c) => c.k === url.text("cat"))?.k ?? "offense";
  const sources = url.list("source");
  const reaches = url.list("to");
  const base = url.text("tier") === "base";
  const byValue = url.text("rank") === "value";
  const minRarity = Number(url.text("rarity")) || 0;

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
    && (!minRarity || (units.get(r.u)?.rarity ?? 0) >= minRarity)),
  [tiered, sources.join(), reaches.join(), minRarity, units]);

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
      const seen = new Set<number>();
      const ranked = [...m.get(s.value)!]
        .sort((a, b) => (lower ? score(a) - score(b) : score(b) - score(a)) || b.v - a.v)
        .filter((r) => !seen.has(r.u) && !!seen.add(r.u));
      return { sl: s.value, ranked };
    });
  }, [keys, key, byValue]);

  if (!data) return <LoadState loading={loading} error={error} />;
  const names = data.keys;
  return (
    <div className="page buffs-page">
      <PageHeader title="Buff ranking"
        subtitle="Who gives the biggest effect, by stat, source and receiver. One row per castle girl (her best), ranked within each source." />
      <details className="stack-help">
        <summary>How effects stack</summary>
        <ul className="small">
          <li><strong>Strongest only</strong>: plain % changes of one stat keep only the biggest increase and the biggest decrease (and some flat stats, like DEF ignore and Ki refund, do the same).</li>
          <li><strong>Stacks</strong>: flat values and the stacking % kind are added together.</li>
          <li>Growing and per-count effects are ranked by the most they reach (their cap); switch <em>Rank by</em> to compare the base step instead. Effects that grow with no cap are ranked by their step.</li>
          <li>Values are the stored amounts before giantification scaling.</li>
        </ul>
      </details>
      <FilterRow label="Type">
        {CATEGORIES.map((c) => (
          <FilterChip key={c.k} active={c.k === cat} count={unitsIn(byCat.get(c.k) || [])}
            color={c.k === "debuff" ? DEBUFF_COLOR : undefined}
            onClick={() => adapter.set({ cat: c.k, k: null })}>
            {c.label}
          </FilterChip>
        ))}
      </FilterRow>
      <FilterRow label="Effect">
        {keys.map(([k, list]) => (
          <FilterChip key={k} active={k === key} count={unitsIn(list)} onClick={() => url.setText("k", k)}>{effectLabel(k, names)}</FilterChip>
        ))}
        {!keys.length && <span className="muted small">Nothing matches these filters.</span>}
      </FilterRow>
      <FilterRow label="Receiver">
        <FilterChip active={!reaches.length} onClick={() => url.clear(["to"])}>Any</FilterChip>
        {REACH.map((o) => (
          <FilterChip key={o.value} active={reaches.includes(o.value)} onClick={() => url.toggle("to", o.value)}>{o.label}</FilterChip>
        ))}
      </FilterRow>
      <FilterRow label="Source">
        <FilterChip active={!sources.length} onClick={() => url.clear(["source"])}>All</FilterChip>
        {SOURCES.map((o) => (
          <FilterChip key={o.value} active={sources.includes(o.value)} onClick={() => url.toggle("source", o.value)}>{o.label}</FilterChip>
        ))}
      </FilterRow>
      <div className="buff-options">
        <SegmentedButtons label="Renovation" selected={base ? "base" : "best"}
          options={[{ value: "best", label: "Highest" }, { value: "base", label: "Unrenovated" }]}
          onToggle={(v) => url.setText("tier", v === "base" ? "base" : "")} />
        <SegmentedButtons label="Rank by" selected={byValue ? "value" : "max"}
          options={[{ value: "max", label: "Max reached" }, { value: "value", label: "Base value" }]}
          onToggle={(v) => url.setText("rank", v === "value" ? "value" : "")} />
        <SegmentedButtons label="Rarity" selected={url.text("rarity")}
          options={RARITY_MIN} onToggle={(v) => url.setText("rarity", v)} />
      </div>
      <div className="buff-groups">
        {key && groups.map(({ sl, ranked }) => {
          const open = expanded.has(sl);
          const shown = open ? ranked : ranked.slice(0, PREVIEW);
          return (
            <GroupCard key={sl} className="buff-group"
              title={`${effectLabel(key, names)} · ${SOURCE_LABEL[sl]}`}
              count={`${ranked.length} castle girls`}
              note={SOURCE_NOTE[sl]}>
              <table className="hub-table hub-table--stack buff-table">
                <thead><tr><th>#</th><th>Value</th><th>Castle girl</th><th>Receiver</th><th>Conditions</th></tr></thead>
                <tbody>
                  {shown.map((r, i) => {
                    const u: UnitIndexEntry | undefined = units.get(r.u);
                    return (
                      <tr key={`${r.u}-${i}`}>
                        <td data-label="#" className="muted">{i + 1}</td>
                        <td data-label="Value" className="buff-val">
                          <strong>{fmtAmount(r.k, r.v)}</strong>
                          {r.mx != null && r.mx !== r.v && <div className="small muted">max {fmtAmount(r.k, r.mx)}</div>}
                          {r.nc && <div className="small muted">no cap</div>}
                          {r.st != null && (
                            <div className={`buff-stack ${r.st === 1 ? "is-stack" : r.st === 0 ? "is-max" : ""}`}>
                              {r.st === 1 ? "stacks" : r.st === 0 ? "strongest only" : r.st}
                            </div>
                          )}
                        </td>
                        <td data-label="Castle girl">
                          <Link className="buff-unit" to={`/units/${r.u}${r.t > 0 ? `?kai=${r.t}` : ""}`}>
                            {u?.face != null
                              ? <FallbackImage srcs={[iconUrl(u.face)]} alt="" width={36} height={36} loading="lazy" missingClassName="buff-noicon" />
                              : <span className="buff-noicon" />}
                            <span>
                              <span className="buff-unit-name">{u?.name ?? `#${r.u}`}</span>
                              {u && <span className="buff-unit-meta">{rarityLabel(meta, u.rarity)} · {weaponLabel(meta, u.weapon)}{r.t > 0 ? ` · ${["", "Kai", "Kai Ni"][r.t]}` : ""}</span>}
                            </span>
                          </Link>
                        </td>
                        <td data-label="Receiver" className="buff-target">{r.w}</td>
                        <td data-label="Conditions" className="buff-target">
                          {r.n ? <span className="small">{r.n}</span> : <span className="muted small">—</span>}
                          {r.nm && <div className="muted small">{r.nm}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {ranked.length > PREVIEW && (
                <button className="hub-btn buff-more" onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(sl)) n.delete(sl); else n.add(sl); return n; })}>
                  {open ? `Show top ${PREVIEW}` : `Show all ${ranked.length}`}
                </button>
              )}
            </GroupCard>
          );
        })}
      </div>
      <p className="muted small">
        Built from the same decoded effect rows the castle girl pages show. Effects still shown as raw fields there
        (undecoded codes, % of another stat, crowd control, damage over time) are not ranked here.
      </p>
    </div>
  );
}
