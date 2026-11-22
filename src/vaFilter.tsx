// Voice actor (CV) filter, shared by the castle girl list and the reusable unit filters (src/unitFilters.tsx).
// Names come from units.json `va` (VoiceActor.atb) and `va_en` (tools/data/va_names_en.json). Shared credits
// (「花澤香菜＆佐藤聡美」) count for each of the voice actors in them.
import { useMemo, useState } from "react";
import { FilterRow, SearchBox } from "@altterisk/game-hub";
import { useHubLabels, useLang, useT } from "./i18n";
import type { UnitIndexEntry } from "./types";

const SPLIT_JA = /[＆&]/;
const SPLIT_EN = / & /;
/** How many voice actors to show before the search narrows them (selected ones always show). */
const TOP = 12;

/** The voice actors of a card, one per credited name. */
export function vaNames(u: Pick<UnitIndexEntry, "va"> | undefined): string[] {
  return u?.va ? u.va.split(SPLIT_JA).map((s) => s.trim()).filter(Boolean) : [];
}

/** Does the card have one of the chosen voice actors? */
export const vaMatches = (u: Pick<UnitIndexEntry, "va"> | undefined, selected: readonly string[]) =>
  vaNames(u).some((n) => selected.includes(n));

interface VaOption { jp: string; en: string; n: number }

function vaOptions(units: UnitIndexEntry[] | undefined): VaOption[] {
  const m = new Map<string, VaOption>();
  for (const u of units || []) {
    if (u.npc || u.dup_of || u.transform_of) continue;
    const jp = vaNames(u);
    const en = u.va_en?.split(SPLIT_EN) ?? [];
    jp.forEach((name, i) => {
      const o = m.get(name) ?? { jp: name, en: (en.length === jp.length ? en[i] : jp.length === 1 ? u.va_en : "") || "", n: 0 };
      o.n++;
      m.set(name, o);
    });
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.jp.localeCompare(b.jp, "ja"));
}

export function VaFilter({ units, selected, onToggle }: {
  units: UnitIndexEntry[] | undefined;
  selected: readonly string[];
  onToggle: (jp: string) => void;
}) {
  const t = useT();
  const hub = useHubLabels();
  const ja = useLang() === "ja";
  const [q, setQ] = useState("");
  const all = useMemo(() => vaOptions(units), [units]);
  if (!all.length) return null;
  const term = q.trim().toLowerCase();
  const shown = term
    ? all.filter((o) => o.jp.toLowerCase().includes(term) || o.en.toLowerCase().includes(term))
    : [...all.filter((o) => selected.includes(o.jp)), ...all.filter((o) => !selected.includes(o.jp)).slice(0, TOP)];
  return (
    <FilterRow label={t("voiceActor")} className="va-filter">
      <SearchBox value={q} onChange={setQ} placeholder={t("searchVa", { n: all.length })} clearLabel={hub.clearSearch} className="va-search" />
      {shown.map((o) => {
        const on = selected.includes(o.jp);
        const name = ja || !o.en ? o.jp : o.en;
        const other = ja ? o.en : o.jp;
        return (
          <label key={o.jp} className={`hub-chip${on ? " hub-chip--on" : ""}`} title={other && other !== name ? other : undefined}>
            <input type="checkbox" className="hub-visually-hidden" checked={on} onChange={() => onToggle(o.jp)} />
            {name} <span className="muted small">{o.n}</span>
          </label>
        );
      })}
      {term && !shown.length && <span className="muted small">{t("nothingMatches")}</span>}
    </FilterRow>
  );
}
