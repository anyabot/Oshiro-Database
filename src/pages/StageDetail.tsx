import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FallbackImage, LoadState, PageHeader, Panel, SegmentedButtons, TabPanel, UrlTabs } from "@altterisk/game-hub";
import { describeRow, rowBases, useEffectDefs, type EffectDefs } from "../effects";
import { StackNotes } from "../stackNotes";
import { immunityChips } from "../immunity";
import { groupRows, groupTexts } from "../group";
import { tagEN } from "../labels";
import { useFx, useHubLabels, useLang, useT } from "../i18n";
import {
  catLabel, categoryOf, STAT, applyStat, enemyImage, mapImage, preText, useEvents, enemyAbilityRows, frameSec, modsFor, plainText, rate, rowIsEnemySide, useEnemies, useStage, withTargets,
  type Enemy, type EnemyData, type EnemyMod, type MissileInfo, type SingiOption, type StageDetail as Stage,
} from "../stages";
import { usePageMeta } from "../usePageMeta";
import { StageMap, removedNames } from "../stageMap";
import { useUnits } from "../data";
import { useStoryIndex } from "../story";
import { QUEST_SCENE, StoryReader } from "../storyReader";
import type { RawRow } from "../types";

// CrowdControlType: 3 火傷 (% of current HP), 4 猛毒 (% of max HP) are the damage-over-time states
const DOT_CC = new Set([3, 4]);

export default function StageDetail() {
  const { id } = useParams();
  const qid = Number(id);
  const { data: stage, loading, error } = useStage(Number.isFinite(qid) ? qid : null);
  const { data: enemies } = useEnemies();
  const { data: defs } = useEffectDefs();
  const hub = useHubLabels();
  usePageMeta(stage ? {
    title: stage.name, description: `${stage.name} (Shiro Project:RE): enemies, stats, stage multipliers${stage.singi ? " and deliberations (審議)" : ""}.`,
  } : null);
  if (!stage || !enemies || !defs) return <LoadState loading={loading || !enemies || !defs} error={error} labels={hub.load} />;
  return <StageView stage={stage} data={enemies} defs={defs} />;
}

function StageView({ stage, data, defs }: { stage: Stage; data: EnemyData; defs: EffectDefs }) {
  const [params, setParams] = useSearchParams();
  const t = useT();
  const lang = useLang();
  const hard = params.get("diff") === "hard" && !!stage.rates.hard;
  // chosen deliberations live in the URL (?d=1031,1032) so a setup can be shared
  const chosen = new Set((params.get("d") || "").split(",").filter(Boolean).map(Number));
  const setParam = (k: string, v: string | null) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    setParams(n, { replace: true });
  };
  const options = stage.singi?.options ?? [];
  const toggle = (o: SingiOption) => {
    const next = new Set(chosen);
    if (next.has(o.id)) next.delete(o.id);
    else {
      // 同時設定不可: one option per non-zero group
      if (o.grp) for (const x of options) if (x.grp === o.grp) next.delete(x.id);
      next.add(o.id);
    }
    setParam("d", [...next].join(","));
  };
  const active = options.filter((o) => chosen.has(o.id));
  const points = active.reduce((s, o) => s + o.pts, 0);
  // rebuilt Bushin: estimated multipliers (those live Bushin of the same rank use), on unless switched off
  const est = stage.estimate && (hard ? stage.estimate.hard : stage.estimate.normal);
  const useEst = !!stage.estimate?.normal && params.get("mult") !== "base";
  const r = (useEst && est ? est.rates : (hard ? stage.rates.hard : stage.rates.normal)) ?? [0, 0, 0];
  // enemy castle girls (EnemyType 敵城娘) whose name is exactly one castle girl's: link to her page
  const { data: units } = useUnits();
  const girlLink = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const u of units || []) if (!u.npc) m.set(u.name, [...(m.get(u.name) || []), u.id]);
    return (e: Enemy) => (e.types.includes(101) && m.get(e.name)?.length === 1 ? m.get(e.name)![0] : undefined);
  }, [units]);

  const order = useMemo(() => {
    const first = new Map<number, number>();
    for (const s of stage.spawns) if (!first.has(s.e)) first.set(s.e, s.t);
    // enemies with no EnemyText name are map helpers (spawners, timers): listed last
    const named = (id: number) => (data.enemies[id]?.name.startsWith("Enemy ") ? 1 : 0);
    const spawned = [...first.keys()].sort((a, b) => named(a) - named(b));
    // each enemy followed by the forms it turns into (EnemyTransform), once each
    const rows: { id: number; form?: string; depth: number }[] = [];
    const seen = new Set<number>();
    const add = (id: number, depth: number, form?: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      rows.push({ id, depth, form });
      for (const [to, trig, sec] of stage.forms?.[id] ?? []) {
        add(to, depth + 1, trig === -4 ? t("atRoutePoint") : sec ? t("afterSec", { n: sec }) : t("transformTrigger", { n: trig }));
      }
    };
    for (const id of spawned) add(id, 0);
    return rows;
  }, [stage, data]);

  const place = categoryOf({ ...stage, live: stage.live ?? false });
  const seriesUrl = `/stages?group=${place.cat.k}${place.sub ? `&sub=${place.sub.k}` : ""}`;
  const { data: events } = useEvents();
  const ev = stage.event != null ? events?.find((e) => e.id === stage.event) : undefined;
  const { data: storyIndex } = useStoryIndex();
  const hasStory = !!storyIndex?.quests.includes(stage.id);
  // sections as tabs (?tab=); Enemies is the default and keeps the URL clean
  const tabs = [
    { id: "enemies", label: t("enemies") },
    { id: "map", label: t("mapTitle") },
    ...(stage.singi ? [{ id: "singi", label: active.length ? t("deliberationsTab", { n: points }) : t("deliberationsTabNone") }] : []),
    { id: "spawns", label: t("spawnTab", { n: stage.spawns.length }) },
    ...(hasStory ? [{ id: "story", label: t("story") }] : []),
  ];
  const asked = params.get("tab") ?? "enemies";
  const tab = tabs.some((x) => x.id === asked) ? asked : "enemies";
  return (
    <div className="page stage-page">
      <p className="muted small"><Link to="/stages">{t("stagesTitle")}</Link> / <Link to={seriesUrl}>{catLabel(place.sub ?? place.cat, lang)}</Link>{ev ? ` / ${ev.title}` : ""}</p>
      <PageHeader title={stage.name}
        subtitle={[stage.bushin ? `武神 ${stage.bushin}` : "", t("quest", { id: stage.id }), t("mapN", { n: stage.map })].filter(Boolean).join(" · ")} />
      {stage.recovered && (
        <p className="muted small">{t("recovered")}{t(stage.estimate?.normal ? "recoveredEst" : "recoveredBase")}</p>
      )}
      {!stage.recovered && stage.live === false && <p className="muted small">{t("removedStage")}</p>}
      {stage.description && <p className="game-text">{plainText(stage.description)}</p>}
      <div className="stage-facts">
        <span>{t("initialKi", { n: stage.ki })}</span>
        {stage.coreLife > 0 && <span>{t("coreLife", { n: stage.coreLife })}</span>}
        {stage.battlefield && <span title="戦場効果">{plainText(stage.battlefield)}</span>}
        {stage.terrain && <span title="属性詳細">{plainText(stage.terrain)}</span>}
      </div>

      <div className="buff-options">
        {stage.rates.hard && (
          <SegmentedButtons label={t("difficulty")} selected={hard ? "hard" : "normal"}
            options={[{ value: "normal", label: t("normal") }, { value: "hard", label: t(stage.veryHard ? "hardVery" : "hard") }]}
            onToggle={(v) => setParam("diff", v === "hard" ? "hard" : null)} />
        )}
        {stage.estimate?.normal && (
          <SegmentedButtons label={t("multipliers")} selected={useEst ? "est" : "base"}
            options={[{ value: "est", label: t("estimated") }, { value: "base", label: t("noneBase") }]}
            onToggle={(v) => setParam("mult", v === "base" ? "base" : null)} />
        )}
        <span className="muted small">
          {t("stageMult", { a: rate(r[0]), h: rate(r[1]), d: rate(r[2]) })}
          {useEst && est && t("estFrom", { from: stage.estimate!.from.join(", "), values: est.values.map((v) => v.map((x) => rate(x)).join("/")).join(t("or")), n: est.n, of: est.of })}
        </span>
      </div>

      <UrlTabs label={t("stageSections")} idBase="stage" className="stage-tabs" tabs={tabs} active={tab}
        onChange={(id) => setParam("tab", id === "enemies" ? null : id)} />

      {tab === "enemies" && (
        <TabPanel tab="enemies" idBase="stage">
          {stage.singi && (
            <p className="muted small">
              {active.length
                ? t("delibActive", { n: active.length, pts: points })
                : t("delibNone")}{" "}
              <button type="button" className="link-btn" onClick={() => setParam("tab", "singi")}>{t("delibOpen")}</button>
            </p>
          )}
          <Panel title={t("enemies")} note={<>{t("enemiesNote", { then: active.length ? t("thenDelib") : "" })}{" "}
            <span className="chg-innate">{t("ownAbility")}</span> <span className="chg-singi">{t("fromDelib")}</span></>}>
            <table className="hub-table hub-table--stack enemy-table">
              <thead><tr><th>{t("enemy")}</th><th>#</th><th>{t("thHp")}</th><th>{t("thAtk")}</th><th>{t("thDef")}</th><th>{t("thMdef")}</th><th>{t("thRange")}</th><th>{t("thMove")}</th><th>{t("thAbilities")}</th></tr></thead>
              <tbody>
                {order.map(({ id: eid, form, depth }) => {
                  const e = data.enemies[eid];
                  return e ? <EnemyRow key={eid} id={eid} e={e} n={stage.counts[eid] ?? 0} r={r} active={active} data={data} defs={defs}
                    form={form} depth={depth} unit={girlLink(e)} /> : null;
                })}
              </tbody>
            </table>
          </Panel>
        </TabPanel>
      )}

      {tab === "map" && (
        <TabPanel tab="map" idBase="stage">
          {stage.spots ? (
            <Panel title={t("mapTitle")}>
              <StageMap info={stage.spots} mapNo={stage.map} questId={stage.id} name={stage.name} hard={hard}
                removers={active.filter((o) => o.mask).map((o) => ({ name: o.name, mask: o.mask! }))}
                rowList={(rows, kind) => kind === "ability" ? <RowList rows={rows} defs={defs} kind="ability" />
                  : <RowList rows={withTargets(rows.map(({ EffectTextureID, AttributeMatchEffectID, ...r }) => r))} defs={defs} />} />
            </Panel>
          ) : (
            <FallbackImage srcs={[mapImage(stage.map)]} alt={t("mapAlt", { name: stage.name })} className="stage-hero" missingClassName="stage-hero event-sec__thumb--none" />
          )}
          {stage.mapEffect.length > 0 && (
            <Panel title={t("mapEffects")} note={t("mapEffectsNote")}>
              <RowList rows={withTargets(stage.mapEffect)} defs={defs} />
            </Panel>
          )}
        </TabPanel>
      )}

      {tab === "singi" && stage.singi && (
        <TabPanel tab="singi" idBase="stage">
          <Panel title={t("deliberations", { n: points })}
            note={stage.singi.gold ? t("goldSilver", { g: stage.singi.gold, s: stage.singi.silver ?? "" }) : t("sameGroup")}>
            <div className="singi-list">
              {options.map((o) => <SingiRow key={o.id} o={o} on={chosen.has(o.id)} onToggle={() => toggle(o)} defs={defs}
                removes={o.mask && stage.spots ? removedNames(stage.spots, o.mask, lang, hard).join(", ") : ""} />)}
            </div>
            {chosen.size > 0 && <button className="hub-btn" onClick={() => setParam("d", null)}>{t("clearDelib")}</button>}
          </Panel>
        </TabPanel>
      )}

      {tab === "spawns" && (
        <TabPanel tab="spawns" idBase="stage"><Timeline stage={stage} data={data} /></TabPanel>
      )}

      {tab === "story" && hasStory && (
        <TabPanel tab="story" idBase="stage">
          <Panel title={t("story")} note={<>{t("storyNote")} · <Link to={`/story/q/${stage.id}`}>{t("storyReadOn")}</Link></>}>
            <StoryReader parts={[{ key: String(stage.id), title: "", file: `q/${stage.id}`, sceneLabel: (n) => t(QUEST_SCENE[n] ?? "storyScene3") }]} />
          </Panel>
        </TabPanel>
      )}
    </div>
  );
}

/** A list of effect rows as sentences. */
function RowList({ rows, defs, kind = "organized", enemy = false }: { rows: RawRow[]; defs: EffectDefs; kind?: "organized" | "ability"; enemy?: boolean }) {
  const bases = kind === "ability" ? rowBases(rows) : [];
  const t = useT();
  const fx = useFx();
  const lines = groupRows(rows.map((r, i) => describeRow(r, kind, defs, undefined, bases[i], { enemyOwner: enemy }).text));
  return (
    <>
      <ul className="fx-plain">
        {lines.map((l, i) => <li key={i}>{l.text ? fx.line(l.text) : t("notDecoded")}</li>)}
      </ul>
      <StackNotes texts={lines.map((l) => l.text)} />
    </>
  );
}

function SingiRow({ o, on, onToggle, defs, removes }: { o: SingiOption; on: boolean; onToggle: () => void; defs: EffectDefs; removes?: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const fx = useFx();
  const enemySide = useMemo(() => (o.rows ? withTargets(o.rows).some((r) => rowIsEnemySide(r, defs)) : false), [o, defs]);
  return (
    <div className={`singi${on ? " is-on" : ""}`}>
      <label className="singi__head">
        <input type="checkbox" checked={on} onChange={onToggle} />
        <span className="singi__pts">{o.pts}</span>
        <span className="singi__name">{o.name}</span>
        {o.grp > 0 && <span className="hub-badge" title={t("groupTitle")}>{t("groupN", { n: o.grp })}</span>}
        {enemySide && <span className="hub-badge singi__enemy">{t("changesEnemies")}</span>}
      </label>
      <p className="game-text singi__text">{o.text}</p>
      {removes && <p className="small chg-singi">{t("singiRemoves", { spots: removes })}</p>}
      {o.rows ? (
        <>
          <button type="button" className="fx-raw-btn" onClick={() => setOpen(!open)} title={t("decodedRows")}>{open ? "−" : "+"}</button>
          {open && <RowList rows={withTargets(o.rows)} defs={defs} />}
        </>
      ) : o.pre ? (
        <ul className="fx-plain">{o.pre.map((r, i) => <li key={i}>{fx.line(preText(r, defs))}</li>)}</ul>
      ) : <span className="muted small">{t("textOnly")}</span>}
    </div>
  );
}

const fmtMod = (m: EnemyMod) => {
  const v = m.unit === "×" ? `×${Math.round(m.v * 1000) / 1000}` : `${m.dir === "+" ? "+" : "−"}${m.v}${m.unit === "s" ? "s" : m.unit}`;
  return v;
};

function statCell(base: number, rateMul: number, mods: EnemyMod[]) {
  const scaled = Math.round(base * rateMul);
  const final = applyStat(scaled, mods);
  return (
    <span title={`base ${base}${rateMul !== 1 ? ` · ×${rateMul} stage = ${scaled}` : ""}${mods.length ? ` · ${mods.map((m) => `${fmtMod(m)} (${m.src})`).join(", ")}` : ""}`}
      className={final > scaled ? "up" : final < scaled ? "down" : undefined}>{final.toLocaleString()}</span>
  );
}

function EnemyRow({ id, e, n, r, active, data, defs, form, depth = 0, unit }: {
  id: number; e: Enemy; n: number; r: [number, number, number]; active: SingiOption[]; data: EnemyData; defs: EffectDefs;
  form?: string; depth?: number; unit?: number;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const lang = useLang();
  const fx = useFx();
  const { applied, unknown, notes } = useMemo(() => modsFor(e, active, defs, data.targets), [e, active, defs, data]);
  const by = (k: string) => applied.filter((m) => m.key === k);
  const shownKeys: string[] = [STAT.hp, STAT.atk, STAT.def, STAT.mdef, STAT.range, STAT.move];
  const other = applied.filter((m) => !shownKeys.includes(m.key));
  const types = e.types.map((x) => data.types[x]).filter(Boolean).map((x) => (lang === "ja" ? x : tagEN(x) ?? x));
  const dot = hasDot(e, defs);
  // the enemy's own ability, as its sentences (the same as in its expanded detail)
  const innate = useMemo(() => {
    const rows = enemyAbilityRows(e.ability?.rows ?? []);
    const bases = rowBases(rows);
    return groupTexts(rows.flatMap((r, i) => describeRow(r, "ability", defs, undefined, bases[i], { enemyOwner: true }).text));
  }, [e, defs]);
  // what its attacks do besides damage (状態異常, debuffs), so it shows without opening the enemy
  const attacks = useMemo(() => [...new Set(e.missiles.map((m) => missileText(m, defs))
    .filter((x) => !/\(no extra effects\)$/.test(x))
    .map((x) => x.replace(/^Missile #\d+:\s*/, "")))], [e, defs]);
  return (
    <>
      <tr className={open ? "is-open" : undefined}>
        <td data-label={t("enemy")} style={depth ? { paddingLeft: 12 + 16 * depth } : undefined}>
          {form && <div className="small muted">{t("formAt", { form })}</div>}
          <div className="enemy-cell">
          {e.dot != null && <FallbackImage srcs={[enemyImage(e.dot)]} alt="" loading="lazy" className="enemy-icon" missingClassName="enemy-icon enemy-icon--none" />}
          <div>
          <button type="button" className="enemy-name" onClick={() => setOpen(!open)} aria-expanded={open}>
            {e.name.startsWith("Enemy ") ? t("mapHelper", { name: e.name }) : e.name}
          </button>
          <div className="muted small">
            {unit != null && <><Link to={`/units/${unit}`}>{t("girlPage")}</Link> · </>}
            {types.join(" · ")}{e.flying ? ` · ${t("flying")}` : ""}{e.magic ? ` · ${t("magicAttack")}` : ""}{e.boss ? ` · ${t("boss")}` : ""}
          </div>
          {dot && <span className="hub-badge dot-badge" title={dot}>DoT</span>}
          <ImmunityChips texts={innate} />
          </div>
          </div>
        </td>
        <td data-label="#">{form ? "–" : n}</td>
        <td data-label={t("thHp")}>{statCell(e.hp, rate(r[1]), by(STAT.hp))}</td>
        <td data-label={t("thAtk")}>{statCell(e.atk, rate(r[0]), by(STAT.atk))}</td>
        <td data-label={t("thDef")}>{statCell(e.def, rate(r[2]), by(STAT.def))}</td>
        <td data-label={t("thMdef")}>{statCell(e.mdef, 1, by(STAT.mdef))}</td>
        <td data-label={t("thRange")}>{statCell(e.range, 1, by(STAT.range))}</td>
        <td data-label={t("thMove")}>{statCell(Math.round(e.move), 1, by(STAT.move))}</td>
        <td data-label={t("thAbilities")} className="enemy-mods">
          {innate.map((tx, i) => <div key={`i${i}`} className="small chg-innate" title={t("ownAbility")}>{fx.line(tx)}</div>)}
          {attacks.map((tx, i) => <div key={`a${i}`} className="small chg-innate" title={t("attackEffectsTitle")}>{t("attackEffects")}: {fx.line(tx)}</div>)}
          {other.map((m, i) => <div key={i} className="small chg-singi" title={m.src}>{fx.line(m.text.replace(/^[^:]*: /, ""))}</div>)}
          {notes.map((m, i) => <div key={`n${i}`} className={`small chg-singi${m.sure ? "" : " muted"}`} title={m.src}>{m.sure ? "" : "? "}{fx.line(m.text.replace(/^[^:]*: /, ""))}</div>)}
          {unknown.map((m, i) => <div key={`u${i}`} className="small muted" title={`${m.src}: its target isn't an enemy type the page can test`}>? {fx.line(m.text)}</div>)}
        </td>
      </tr>
      {open && (
        <tr className="enemy-detail"><td colSpan={9}><EnemyDetail id={id} e={e} defs={defs} /></td></tr>
      )}
    </>
  );
}

/** Damage-over-time sources of an enemy, as text; "" when it has none. */
function hasDot(e: Enemy, defs: EffectDefs): string {
  const out: string[] = [];
  for (const m of [...e.missiles, ...e.deadMissiles]) {
    if (m.CrowdControlType && DOT_CC.has(m.CrowdControlType)) out.push(`attack inflicts ${defs.labels[`cc:${m.CrowdControlType}`]?.jp ?? m.CrowdControlType}`);
    if (m.DealDamageEffectID) {
      const row = defs.effect_tables?.DealDamageEffect?.[m.DealDamageEffectID];
      if (row?.IntervalInMillis) out.push("attack leaves periodic damage");
    }
  }
  for (const r of e.ability?.rows ?? []) {
    const ue = defs.unit_effect[Number(r.AbilityEffectType)];
    if (ue?.[0] === 9) out.push("ability deals periodic damage");
  }
  return [...new Set(out)].join("; ");
}

function missileText(m: MissileInfo, defs: EffectDefs): string {
  // class-ability row shape 6/2: EffectValue is a Missile.atb id (worded by the shared missile describer)
  return describeRow({ AbilityType: 6, AbilityTypeDetail: 2, EffectValue: m.id }, "ability", defs).text.join(" · ").replace(/^:\s*/, "");
}

/** What the enemy ignores (its own immunities, debuffs first) and the buffs it cancels on castle girls. */
function ImmunityChips({ texts }: { texts: string[] }) {
  const t = useT();
  const lang = useLang();
  const { own, blocks, gives, ailments } = useMemo(() => immunityChips(texts), [texts]);
  if (!own.length && !blocks.length && !gives.length && !ailments.length) return null;
  const name = (c: { en: string; ja: string }) => (lang === "ja" ? c.ja : c.en);
  return (
    <div className="imm">
      {(own.length > 0 || ailments.length > 0) && (
        <div className="imm__row" title={t("immuneTitle")}>
          <span className="imm__label">{t("immuneTo")}</span>
          {own.map((c) => <span key={c.key} className={`imm__chip${c.down ? " is-debuff" : ""}`}>{name(c)}</span>)}
          {ailments.length > 0 && (
            <span className="imm__chip is-debuff" title={ailments.join(", ")}>
              {ailments.length >= 8 ? t("allAilments") : t("ailmentsN", { n: ailments.length })}
            </span>
          )}
        </div>
      )}
      {blocks.length > 0 && (
        <div className="imm__row" title={t("cancelsTitle")}>
          <span className="imm__label">{t("cancelsOnGirls")}</span>
          {blocks.map((c) => <span key={c.key} className="imm__chip is-cancel">{name(c)}</span>)}
        </div>
      )}
      {gives.length > 0 && (
        <div className="imm__row" title={t("givesTitle")}>
          <span className="imm__label">{t("givesEnemies")}</span>
          {gives.map((c) => <span key={c.key} className={`imm__chip${c.down ? " is-debuff" : ""}`}>{name(c)}</span>)}
        </div>
      )}
    </div>
  );
}

function EnemyDetail({ id, e, defs }: { id: number; e: Enemy; defs: EffectDefs }) {
  const t = useT();
  const fx = useFx();
  return (
    <div className="enemy-detail__body">
      <div className="stage-facts">
        <span>{t("attackWait", { n: e.wait })}</span>
        <span>{t("targetsN", { n: e.targets })}</span>
        {e.block > 1 && <span>{t("needsBlockers", { n: e.block })}</span>}
        <span>{t("coreDamage", { n: e.core })}</span>
        {e.hpStock > 0 && <span>{t("hpStock", { n: e.hpStock })}</span>}
        <span className="muted">{t("enemyN", { id })}</span>
      </div>
      {e.ability && (
        <div className="ability">
          <div className="ability__head"><span className="ability__label">{t("ability")}</span><span className="ability__name">{e.ability.name || t("noName")}</span><span className="ability__id">#{e.ability.id}</span></div>
          {e.ability.text && <p className="game-text">{e.ability.text}</p>}
          <RowList rows={enemyAbilityRows(e.ability.rows)} defs={defs} kind="ability" enemy />
        </div>
      )}
      {e.missiles.length > 0 && (
        <div className="ability">
          <div className="ability__head"><span className="ability__label">{t("attack")}</span></div>
          <ul className="fx-plain">{e.missiles.map((m) => <li key={m.id}>{fx.line(missileText(m, defs))}</li>)}</ul>
        </div>
      )}
      {e.deadMissiles.length > 0 && (
        <div className="ability">
          <div className="ability__head"><span className="ability__label">{t("onDeath")}</span></div>
          <ul className="fx-plain">{e.deadMissiles.map((m) => <li key={m.id}>{fx.line(missileText(m, defs))}</li>)}</ul>
        </div>
      )}
      {e.transforms.length > 0 && (
        <p className="small muted">{t("transformsInto", { ids: e.transforms.map((x) => `#${x.TransformedEnemyID}`).join(", "), t: e.transforms.map((x) => x.Trigger ?? "?").join(", ") })}</p>
      )}
    </div>
  );
}

function Timeline({ stage, data }: { stage: Stage; data: EnemyData }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <Panel title={t("spawnOrder", { n: stage.spawns.length })} note={t("spawnNote")}>
      <button className="hub-btn" onClick={() => setOpen(!open)}>{t(open ? "hideSpawns" : "showSpawns")}</button>
      {open && (
        <table className="hub-table timeline">
          <thead><tr><th>{t("time")}</th><th>{t("enemy")}</th><th>{t("route")}</th></tr></thead>
          <tbody>
            {stage.spawns.map((s, i) => (
              <tr key={i}><td>{frameSec(s.t)}s</td><td>{data.enemies[s.e]?.name ?? `#${s.e}`}{s.hid ? t("hidden") : ""}{s.lv ? t("strength", { n: s.lv }) : ""}</td><td>{s.r}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
