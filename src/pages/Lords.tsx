import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LoadState, PageHeader } from "@altterisk/game-hub";
import { listState, searchParamsAdapter } from "@altterisk/game-hub/filters";
import { useHubLabels, useLang, useT, type UiKey } from "../i18n";
import { useEffectDefs } from "../effects";
import { colorSegments, effectHp, lordDotUrl, lordNum, lordStat, useLords, type LordOutfit } from "../lords";
import { AbilityBlock } from "./UnitDetail";

type Col = "hp" | "atk" | "def" | "regen" | "range" | "wait" | "targets";
const COLS: { k: Col; label: UiKey }[] = [
  { k: "hp", label: "hp" }, { k: "atk", label: "atk" }, { k: "def", label: "def" }, { k: "regen", label: "regen" },
  { k: "range", label: "range" }, { k: "wait", label: "lordWait" }, { k: "targets", label: "targets" },
];

function values(o: LordOutfit, lv: number): Record<Col, number> {
  const c = o.class;
  return {
    hp: lordStat(c, "Health", lv) + effectHp(o), atk: lordStat(c, "Attack", lv), def: lordStat(c, "Defense", lv),
    regen: lordStat(c, "Regeneration", lv), range: lordNum(c, "AttackRange"), wait: lordNum(c, "AttackWait"),
    targets: lordNum(c, "MaxTarget"),
  };
}

/** Change against the plain lord (装束なし); for attack wait lower is better. */
function Diff({ v, base, k }: { v: number; base: number; k: Col }) {
  const d = v - base;
  if (!d) return null;
  const good = k === "wait" ? d < 0 : d > 0;
  return <span className={`lord-diff ${good ? "lord-diff--up" : "lord-diff--down"}`}>{d > 0 ? "+" : "−"}{Math.abs(d)}</span>;
}

/** Lord outfits (殿の装束): what each changes on the lord at the base camp: stats, range, attack and effect. */
export default function Lords() {
  const { data, loading, error } = useLords();
  const { data: defs } = useEffectDefs();
  const [params, setParams] = useSearchParams();
  const url = listState(searchParamsAdapter(params, setParams));
  const t = useT();
  const lang = useLang();
  const hub = useHubLabels();
  const lv = Math.max(1, Math.min(99, Number(url.text("lv")) || 99));
  const sort = (url.text("sort") || "") as Col | "";
  const [lvDraft, setLvDraft] = useState<number | null>(null);

  const base = data?.find((o) => o.id === 0);
  const rows = useMemo(() => {
    const list = (data || []).map((o) => ({ o, v: values(o, lv) }));
    if (sort) list.sort((a, b) => (sort === "wait" ? a.v[sort] - b.v[sort] : b.v[sort] - a.v[sort]) || a.o.id - b.o.id);
    return list;
  }, [data, lv, sort]);

  if (!data) return <LoadState loading={loading} error={error} labels={hub.load} />;
  const bv = base ? values(base, lv) : null;
  const name = (o: LordOutfit) => (lang === "ja" ? o.name : o.name_en || o.name);
  const alt = (o: LordOutfit) => (lang === "ja" ? o.name_en || "" : o.name_en ? o.name : "");
  const shownLv = lvDraft ?? lv;

  return (
    <div className="page">
      <PageHeader title={t("lordsTitle")} subtitle={t("lordsSubtitle")} />
      <div className="lord-level">
        <label htmlFor="lord-lv">{t("lordLevel")}</label>
        <input id="lord-lv" type="range" min={1} max={99} value={shownLv}
          onChange={(e) => setLvDraft(Number(e.target.value))}
          onPointerUp={() => { if (lvDraft != null) { url.setText("lv", lvDraft === 99 ? "" : String(lvDraft)); setLvDraft(null); } }}
          onKeyUp={() => { if (lvDraft != null) { url.setText("lv", lvDraft === 99 ? "" : String(lvDraft)); setLvDraft(null); } }} />
        <span className="lord-level__n">Lv {shownLv}</span>
        <span className="muted small">{t("lordVsDefault")}</span>
      </div>

      <div className="lord-table-wrap">
        <table className="lord-table">
          <thead>
            <tr>
              <th>{t("lordOutfit")}</th>
              {COLS.map((c) => (
                <th key={c.k}>
                  <button type="button" className={`lord-sort${sort === c.k ? " lord-sort--on" : ""}`}
                    onClick={() => url.setText("sort", sort === c.k ? "" : c.k)}>{t(c.label)}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ o, v }) => (
              <tr key={o.id}>
                <td>
                  <a href={`#lord-${o.id}`} className="lord-name">
                    {o.dot && <img src={lordDotUrl(o.id)} alt="" className="lord-dot lord-dot--sm" loading="lazy" />}
                    <span>{name(o)}{alt(o) && <span className="muted small lord-alt">{alt(o)}</span>}</span>
                  </a>
                </td>
                {COLS.map((c) => (
                  <td key={c.k} className="lord-num">
                    {v[c.k] || "—"}
                    {bv && o.id !== 0 && <Diff v={v[c.k]} base={bv[c.k]} k={c.k} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lord-cards">
        {rows.map(({ o }) => (
          <section key={o.id} id={`lord-${o.id}`} className="lord-card">
            <div className="lord-card__head">
              {o.dot && <img src={lordDotUrl(o.id)} alt="" className="lord-dot" loading="lazy" />}
              <div>
                <h2 className="lord-card__name">{name(o)}</h2>
                {alt(o) && <div className="muted small">{alt(o)}</div>}
                <div className="muted small">#{o.id}{o.weapon && <> · <Link to={`/equipment/${o.weapon}`}>{t("weapon")} #{o.weapon}</Link></>}</div>
              </div>
            </div>
            <p className="game-text lord-text">
              {colorSegments(o.text).map((s, i) => <span key={i} className={s.gold ? "lord-gold" : undefined}>{s.text}</span>)}
            </p>
            {o.ability && <AbilityBlock label={t("lordEffect")} a={o.ability} defs={defs ?? undefined} />}
            {o.organized && <AbilityBlock label={t("lordOrganized")} a={o.organized} defs={defs ?? undefined} />}
            {o.class_ability && <AbilityBlock label={t("classAbility")} a={o.class_ability} defs={defs ?? undefined} />}
          </section>
        ))}
      </div>
    </div>
  );
}
