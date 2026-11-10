import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FallbackImage, LoadState, PageHeader, Panel, SegmentedButtons } from "@altterisk/game-hub";
import { describeRow, rowBases, useEffectDefs, type EffectDefs } from "../effects";
import { tagEN } from "../labels";
import {
  GROUPS, STAT, applyStat, enemyImage, mapImage, preText, useEvents, enemyAbilityRows, frameSec, modsFor, plainText, rate, rowIsEnemySide, useEnemies, useStage, withTargets,
  type Enemy, type EnemyData, type EnemyMod, type MissileInfo, type SingiOption, type StageDetail as Stage,
} from "../stages";
import { usePageMeta } from "../usePageMeta";
import { useUnits } from "../data";
import type { RawRow } from "../types";

// CrowdControlType: 3 火傷 (% of current HP), 4 猛毒 (% of max HP) are the damage-over-time states
const DOT_CC = new Set([3, 4]);

export default function StageDetail() {
  const { id } = useParams();
  const qid = Number(id);
  const { data: stage, loading, error } = useStage(Number.isFinite(qid) ? qid : null);
  const { data: enemies } = useEnemies();
  const { data: defs } = useEffectDefs();
  usePageMeta(stage ? {
    title: stage.name, description: `${stage.name} (Shiro Project:RE): enemies, stats, stage multipliers${stage.singi ? " and deliberations (審議)" : ""}.`,
  } : null);
  if (!stage || !enemies || !defs) return <LoadState loading={loading || !enemies || !defs} error={error} />;
  return <StageView stage={stage} data={enemies} defs={defs} />;
}

function StageView({ stage, data, defs }: { stage: Stage; data: EnemyData; defs: EffectDefs }) {
  const [params, setParams] = useSearchParams();
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
        add(to, depth + 1, trig === -4 ? "at a point of its route" : sec ? `after ${sec}s` : `transform trigger ${trig}`);
      }
    };
    for (const id of spawned) add(id, 0);
    return rows;
  }, [stage, data]);

  const group = GROUPS.find((g) => g.k === stage.group);
  const { data: events } = useEvents();
  const ev = stage.event != null ? events?.find((e) => e.id === stage.event) : undefined;
  return (
    <div className="page stage-page">
      <p className="muted small"><Link to={`/stages?group=${stage.group}`}>Stages</Link> / {group?.label}{ev ? ` / ${ev.title}` : ""}</p>
      <PageHeader title={stage.name}
        subtitle={[stage.bushin ? `武神 ${stage.bushin}` : "", `Quest #${stage.id}`, `map ${stage.map}`].filter(Boolean).join(" · ")} />
      <FallbackImage srcs={[mapImage(stage.map)]} alt={`${stage.name} map`} className="stage-hero" missingClassName="stage-hero event-sec__thumb--none" />
      {stage.recovered && (
        <p className="muted small">This stage is from a past event and no longer in the game's quest list: it was rebuilt from the map still in the client cache, so its own name, stage multipliers and Ki aren't in the data.{stage.estimate?.normal ? " The multipliers below are estimated from the live Bushin of the same rank." : " Enemy stats below are their base values."}</p>
      )}
      {!stage.recovered && stage.live === false && <p className="muted small">Removed from the game's quest list; kept from an earlier export.</p>}
      {stage.description && <p className="game-text">{plainText(stage.description)}</p>}
      <div className="stage-facts">
        <span>Initial Ki {stage.ki}</span>
        {stage.coreLife > 0 && <span>Core life {stage.coreLife}</span>}
        {stage.battlefield && <span title="戦場効果">{plainText(stage.battlefield)}</span>}
        {stage.terrain && <span title="属性詳細">{plainText(stage.terrain)}</span>}
      </div>

      <div className="buff-options">
        {stage.rates.hard && (
          <SegmentedButtons label="Difficulty" selected={hard ? "hard" : "normal"}
            options={[{ value: "normal", label: "Normal" }, { value: "hard", label: stage.veryHard ? "Hard / 超難" : "Hard" }]}
            onToggle={(v) => setParam("diff", v === "hard" ? "hard" : null)} />
        )}
        {stage.estimate?.normal && (
          <SegmentedButtons label="Multipliers" selected={useEst ? "est" : "base"}
            options={[{ value: "est", label: "Estimated" }, { value: "base", label: "None (base stats)" }]}
            onToggle={(v) => setParam("mult", v === "base" ? "base" : null)} />
        )}
        <span className="muted small">
          Stage multipliers (攻撃/耐久/防御補正): ATK ×{rate(r[0])}, HP ×{rate(r[1])}, DEF ×{rate(r[2])}
          {useEst && est && ` — estimated: the live Bushin of this rank (${stage.estimate!.from.join(", ")}) use ${est.values.map((v) => v.map((x) => rate(x)).join("/")).join(" or ")} (ATK/HP/DEF); ${est.n} of ${est.of} use these`}
        </span>
      </div>

      {stage.mapEffect.length > 0 && (
        <Panel title="Map effects マップ効果" note="Active for the whole stage.">
          <RowList rows={withTargets(stage.mapEffect)} defs={defs} />
        </Panel>
      )}

      {stage.singi && (
        <Panel title={`Deliberations 審議 · ${points} points`}
          note={stage.singi.gold ? `Gold at ${stage.singi.gold}, silver at ${stage.singi.silver} points.` : "Options in the same group can't be chosen together."}>
          <div className="singi-list">
            {options.map((o) => <SingiRow key={o.id} o={o} on={chosen.has(o.id)} onToggle={() => toggle(o)} defs={defs} />)}
          </div>
          {chosen.size > 0 && <button className="hub-btn" onClick={() => setParam("d", null)}>Clear deliberations</button>}
        </Panel>
      )}

      <Panel title="Enemies" note={<>Stats ×stage multiplier{active.length ? ", then the chosen deliberations" : ""}. Hover a number for the base value.{" "}
        <span className="chg-innate">■ the enemy's own ability</span> <span className="chg-singi">■ from deliberations</span></>}>
        <table className="hub-table hub-table--stack enemy-table">
          <thead><tr><th>Enemy</th><th>#</th><th>HP</th><th>ATK</th><th>DEF</th><th>Magic DEF</th><th>Range</th><th>Move</th><th>Abilities &amp; changes</th></tr></thead>
          <tbody>
            {order.map(({ id: eid, form, depth }) => {
              const e = data.enemies[eid];
              return e ? <EnemyRow key={eid} id={eid} e={e} n={stage.counts[eid] ?? 0} r={r} active={active} data={data} defs={defs}
                form={form} depth={depth} unit={girlLink(e)} /> : null;
            })}
          </tbody>
        </table>
      </Panel>

      <Timeline stage={stage} data={data} />
    </div>
  );
}

/** A list of effect rows as sentences. */
function RowList({ rows, defs, kind = "organized", enemy = false }: { rows: RawRow[]; defs: EffectDefs; kind?: "organized" | "ability"; enemy?: boolean }) {
  const bases = kind === "ability" ? rowBases(rows) : [];
  return (
    <ul className="fx-plain">
      {rows.map((r, i) => <li key={i}>{describeRow(r, kind, defs, undefined, bases[i], { enemyOwner: enemy }).text.join(" · ") || "(not decoded)"}</li>)}
    </ul>
  );
}

function SingiRow({ o, on, onToggle, defs }: { o: SingiOption; on: boolean; onToggle: () => void; defs: EffectDefs }) {
  const [open, setOpen] = useState(false);
  const enemySide = useMemo(() => (o.rows ? withTargets(o.rows).some((r) => rowIsEnemySide(r, defs)) : false), [o, defs]);
  return (
    <div className={`singi${on ? " is-on" : ""}`}>
      <label className="singi__head">
        <input type="checkbox" checked={on} onChange={onToggle} />
        <span className="singi__pts">{o.pts}</span>
        <span className="singi__name">{o.name}</span>
        {o.grp > 0 && <span className="hub-badge" title="同時設定不可: only one option of this group">group {o.grp}</span>}
        {enemySide && <span className="hub-badge singi__enemy">changes enemies</span>}
      </label>
      <p className="game-text singi__text">{o.text}</p>
      {o.rows ? (
        <>
          <button type="button" className="fx-raw-btn" onClick={() => setOpen(!open)} title="decoded effect rows">{open ? "−" : "+"}</button>
          {open && <RowList rows={withTargets(o.rows)} defs={defs} />}
        </>
      ) : o.pre ? (
        <ul className="fx-plain">{o.pre.map((r, i) => <li key={i}>{preText(r, defs)}</li>)}</ul>
      ) : <span className="muted small">No effect rows in the data (text only).</span>}
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
  const { applied, unknown, notes } = useMemo(() => modsFor(e, active, defs, data.targets), [e, active, defs, data]);
  const by = (k: string) => applied.filter((m) => m.key === k);
  const shownKeys: string[] = [STAT.hp, STAT.atk, STAT.def, STAT.mdef, STAT.range, STAT.move];
  const other = applied.filter((m) => !shownKeys.includes(m.key));
  const types = e.types.map((t) => data.types[t]).filter(Boolean).map((t) => tagEN(t) ?? t);
  const dot = hasDot(e, defs);
  // the enemy's own ability, as its sentences (the same as in its expanded detail)
  const innate = useMemo(() => {
    const rows = enemyAbilityRows(e.ability?.rows ?? []);
    const bases = rowBases(rows);
    return rows.flatMap((r, i) => describeRow(r, "ability", defs, undefined, bases[i], { enemyOwner: true }).text);
  }, [e, defs]);
  return (
    <>
      <tr className={open ? "is-open" : undefined}>
        <td data-label="Enemy" style={depth ? { paddingLeft: 12 + 16 * depth } : undefined}>
          {form && <div className="small muted">↳ form ({form})</div>}
          <div className="enemy-cell">
          {e.dot != null && <FallbackImage srcs={[enemyImage(e.dot)]} alt="" loading="lazy" className="enemy-icon" missingClassName="enemy-icon enemy-icon--none" />}
          <div>
          <button type="button" className="enemy-name" onClick={() => setOpen(!open)} aria-expanded={open}>
            {e.name.startsWith("Enemy ") ? `${e.name} (map helper, no name)` : e.name}
          </button>
          <div className="muted small">
            {unit != null && <><Link to={`/units/${unit}`}>castle girl page</Link> · </>}
            {types.join(" · ")}{e.flying ? " · flying" : ""}{e.magic ? " · magic attack" : ""}{e.boss ? " · boss" : ""}
          </div>
          {dot && <span className="hub-badge dot-badge" title={dot}>DoT</span>}
          </div>
          </div>
        </td>
        <td data-label="#">{form ? "–" : n}</td>
        <td data-label="HP">{statCell(e.hp, rate(r[1]), by(STAT.hp))}</td>
        <td data-label="ATK">{statCell(e.atk, rate(r[0]), by(STAT.atk))}</td>
        <td data-label="DEF">{statCell(e.def, rate(r[2]), by(STAT.def))}</td>
        <td data-label="Magic DEF">{statCell(e.mdef, 1, by(STAT.mdef))}</td>
        <td data-label="Range">{statCell(e.range, 1, by(STAT.range))}</td>
        <td data-label="Move">{statCell(Math.round(e.move), 1, by(STAT.move))}</td>
        <td data-label="Abilities & changes" className="enemy-mods">
          {innate.map((t, i) => <div key={`i${i}`} className="small chg-innate" title="The enemy's own ability">{t}</div>)}
          {other.map((m, i) => <div key={i} className="small chg-singi" title={m.src}>{m.text.replace(/^[^:]*: /, "")}</div>)}
          {notes.map((m, i) => <div key={`n${i}`} className={`small chg-singi${m.sure ? "" : " muted"}`} title={m.src}>{m.sure ? "" : "? "}{m.text.replace(/^[^:]*: /, "")}</div>)}
          {unknown.map((m, i) => <div key={`u${i}`} className="small muted" title={`${m.src}: its target isn't an enemy type the page can test`}>? {m.text}</div>)}
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

function EnemyDetail({ id, e, defs }: { id: number; e: Enemy; defs: EffectDefs }) {
  return (
    <div className="enemy-detail__body">
      <div className="stage-facts">
        <span>Attack wait {e.wait}</span>
        <span>Targets {e.targets}</span>
        {e.block > 1 && <span>Needs {e.block} blockers</span>}
        <span>Core damage {e.core}</span>
        {e.hpStock > 0 && <span>HP stock {e.hpStock}</span>}
        <span className="muted">Enemy #{id}</span>
      </div>
      {e.ability && (
        <div className="ability">
          <div className="ability__head"><span className="ability__label">Ability</span><span className="ability__name">{e.ability.name || "(no name)"}</span><span className="ability__id">#{e.ability.id}</span></div>
          {e.ability.text && <p className="game-text">{e.ability.text}</p>}
          <RowList rows={enemyAbilityRows(e.ability.rows)} defs={defs} kind="ability" enemy />
        </div>
      )}
      {e.missiles.length > 0 && (
        <div className="ability">
          <div className="ability__head"><span className="ability__label">Attack</span></div>
          <ul className="fx-plain">{e.missiles.map((m) => <li key={m.id}>{missileText(m, defs)}</li>)}</ul>
        </div>
      )}
      {e.deadMissiles.length > 0 && (
        <div className="ability">
          <div className="ability__head"><span className="ability__label">On death</span></div>
          <ul className="fx-plain">{e.deadMissiles.map((m) => <li key={m.id}>{missileText(m, defs)}</li>)}</ul>
        </div>
      )}
      {e.transforms.length > 0 && (
        <p className="small muted">Transforms into enemy {e.transforms.map((t) => `#${t.TransformedEnemyID}`).join(", ")} (trigger {e.transforms.map((t) => t.Trigger ?? "?").join(", ")}).</p>
      )}
    </div>
  );
}

function Timeline({ stage, data }: { stage: Stage; data: EnemyData }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel title={`Spawn order · ${stage.spawns.length} enemies`} note="Time from the start of the stage (30 frames per second); loops and waits for events are not simulated.">
      <button className="hub-btn" onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"} spawn list</button>
      {open && (
        <table className="hub-table timeline">
          <thead><tr><th>Time</th><th>Enemy</th><th>Route</th></tr></thead>
          <tbody>
            {stage.spawns.map((s, i) => (
              <tr key={i}><td>{frameSec(s.t)}s</td><td>{data.enemies[s.e]?.name ?? `#${s.e}`}{s.hid ? " (hidden)" : ""}{s.lv ? ` · strength ${s.lv}` : ""}</td><td>{s.r}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
