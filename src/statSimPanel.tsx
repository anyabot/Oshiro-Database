// Stat simulator panel on the unit page: level, 改 / 改壱 (★), limit breaks and giantification grade.
import { useMemo, useState } from "react";
import { Panel, SegmentedButtons, StatRows } from "@altterisk/game-hub";
import { useT } from "./i18n";
import { giantKi, levelCap, maxGrade, simulate, useGrowth, type Reno } from "./statSim";
import type { Form, RawRow, UnitDetail as Unit } from "./types";

/** The latest value of a form slot up to a tier (a tier without its own slot keeps the earlier one). */
function upTo<T>(forms: Form[], tier: number, pick: (f: Form) => T | undefined | null): T | undefined {
  let out: T | undefined;
  for (const f of [...forms].sort((a, b) => a.tier - b.tier)) {
    if (f.tier > tier) break;
    const v = pick(f);
    if (v != null && (!Array.isArray(v) || v.length)) out = v;
  }
  return out;
}

const MAX_LIMIT_BREAKS = 4;

export function StatSimPanel({ u }: { u: Unit }) {
  const t = useT();
  const { data: g } = useGrowth();
  const card = u.raw as RawRow;
  const cls = u.class as RawRow | null;
  const maxReno = Math.min(2, Number(u.max_renovation) || 0) as Reno;
  const [reno, setReno] = useState<Reno>(0);
  const [level, setLevel] = useState<number | null>(null);
  const [lb, setLb] = useState(0);
  const [grade, setGrade] = useState(0);

  const always = useMemo(() => upTo(u.forms, reno, (f) => f.always?.effects) ?? [], [u, reno]);
  const stratagem = !!upTo(u.forms, reno, (f) => f.stratagems);
  if (!g || !cls || !card) return null;

  const cap = levelCap(g, card, cls, reno, lb);
  const lv = Math.min(level ?? cap, cap);
  const mg = maxGrade(g, card, reno);
  const gr = Math.min(grade, mg);
  const potentials = (u.potential ?? []).filter((p) => p.limit_break <= lb).map((p) => p.raw);
  const r = simulate(g, { card, cls, reno, level: lv, limitBreaks: lb, grade: gr, always, stratagem, potentials });
  const ki = giantKi(g, card, r.giantBase, reno, r.giantCut);
  const renoOpts = [
    { value: "0", label: `${t("simBase")} ★${Number(card.Rarity) || 0}` },
    ...(maxReno >= 1 ? [{ value: "1", label: `改 ★${Math.min((Number(card.Rarity) || 0) + 1, 8)}` }] : []),
    ...(maxReno >= 2 ? [{ value: "2", label: "改壱 ★9" }] : []),
  ];

  return (
    <Panel title={t("simTitle")} note={t("simNote")}>
      <div className="sim-controls">
        {renoOpts.length > 1 && (
          <SegmentedButtons label={t("simReno")} selected={String(reno)} options={renoOpts}
            onToggle={(v) => setReno(Number(v) as Reno)} />
        )}
        <label className="sim-row">
          <span>{t("simLevel")}</span>
          <input type="range" min={1} max={cap} value={lv} onChange={(e) => setLevel(Number(e.target.value))} />
          <input type="number" min={1} max={cap} value={lv} className="sim-num"
            onChange={(e) => setLevel(Math.max(1, Math.min(cap, Number(e.target.value) || 1)))} />
          <span className="muted small">/ {cap}</span>
        </label>
        <label className="sim-row">
          <span>{t("simLimitBreak")}</span>
          <select value={lb} onChange={(e) => setLb(Number(e.target.value))}>
            {Array.from({ length: MAX_LIMIT_BREAKS + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <span className="muted small">{t("simLimitBreakNote")}</span>
          {lb > 0 && (u.potential ?? []).some((p) => p.limit_break <= lb) && (
            <span className="small">{(u.potential ?? []).filter((p) => p.limit_break <= lb).map((p) => p.description).join("、")}</span>
          )}
        </label>
        <SegmentedButtons label={t("simGiant")} selected={String(gr)}
          options={Array.from({ length: mg + 1 }, (_, i) => ({ value: String(i), label: i === 0 ? "—" : i === mg ? `${i} 最大` : String(i) }))}
          onToggle={(v) => setGrade(Number(v))} />
      </div>
      <StatRows columns={2} rows={[
        { label: t("hp"), value: r.hp },
        { label: t("atk"), value: r.atk },
        { label: t("def"), value: r.def },
        { label: t("regen"), value: r.regen },
        { label: t("range"), value: r.range },
        { label: t("cost"), value: r.cost },
        ...(r.atkSpeed ? [{ label: t("simAtkSpeed"), value: `+${r.atkSpeed}%` }] : []),
        { label: t("simCorr"), value: `${r.corrections.hp}/${r.corrections.atk}/${r.corrections.def}/${r.corrections.regen}%` },
        { label: t("simGrowth"), value: gr ? `+${r.growth.join("/")}%` : "—" },
      ]} />
      <p className="small">{t("simKi")}{" "}
        {ki.map((k, i) => <span key={i} className={`sim-ki${i + 1 === gr + 1 ? " sim-ki--next" : ""}`}>{i + 1}: {k}{i + 1 === ki.length ? " (最大化)" : ""}</span>)}
      </p>
      {always.length > 0 && <p className="muted small">{t(r.applied.length ? "simAlways" : "simAlwaysNone")}</p>}
    </Panel>
  );
}
