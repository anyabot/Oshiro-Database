import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Breadcrumbs, EmptyState, LoadState, MetaChip, MetaChips, PageHeader, Panel, StatRows, TabPanel, UrlTabs, routerLinks,
} from "@altterisk/game-hub";
import {
  categoryJp, categoryLabel, iconUrl, rarityLabel, regionLabel, terrainParts, terrainTitle, terrainWord, traitLabel, traitTitle,
  useMeta, useUnit, useUnits, weaponLabel,
} from "../data";
import { DEFAULT_META } from "../meta";
import { unitName } from "../labels";
import { usePageMeta } from "../usePageMeta";
import { describeRow, rowBases, useEffectDefs, type EffectDefs, type RowContext, type RowKind } from "../effects";
import type { Ability, ClassBlock, FieldLink, Form, RawRow, SpecialAbility, SpecialAttack, Stratagem, UnitDetail as Unit } from "../types";

const renderLink = routerLinks(Link, "to");

/** Raw table fields as key=value chips (meanings not decoded). */
function RawChips({ row }: { row: RawRow }) {
  const entries = Object.entries(row);
  if (!entries.length) return <span className="muted small">(all zero)</span>;
  return (
    <div className="raw-chips">
      {entries.map(([k, v]) => (
        <span key={k} className="raw-chip"><span className="raw-chip__k">{k}</span>{String(v)}</span>
      ))}
    </div>
  );
}

function RawRows({ title, rows }: { title: string; rows: RawRow[] }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  // a button, not <details>/<summary>: summary blocks text selection across it
  return (
    <div className="raw">
      <button type="button" className="raw-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} {title} ({rows.length} row{rows.length > 1 ? "s" : ""})
      </button>
      {open && rows.map((r, i) => <RawChips key={i} row={r} />)}
    </div>
  );
}

/** Effect rows as readable lines; each keeps its unused raw fields one click away. */
function EffectList({ title, rows, kind, defs, links, ctx }: {
  title: string; rows: RawRow[]; kind: RowKind; defs?: EffectDefs; links?: Record<string, FieldLink>; ctx?: RowContext;
}) {
  if (!rows.length) return null;
  if (!defs) return <RawRows title={title} rows={rows} />;
  const bases = rowBases(rows);
  return (
    <div className="fx-list">
      {rows.map((r, i) => <EffectRow key={i} r={r} base={bases[i]} kind={kind} defs={defs} link={links?.[String(i)]} ctx={ctx} />)}
    </div>
  );
}

/** One effect row: plain selectable text; the raw fields open from a separate button. */
function EffectRow({ r, base, kind, defs, link, ctx }: { r: RawRow; base?: RawRow; kind: RowKind; defs: EffectDefs; link?: FieldLink; ctx?: RowContext }) {
  const [open, setOpen] = useState(false);
  const { text, evidence, rest } = describeRow(r, kind, defs, link, base, ctx);
  return (
    <div className="fx-row">
      <div className="fx-line">
        <span className="fx-text">{text.length ? text.join(" · ") : <span className="muted">(not decoded)</span>}</span>
        {evidence.length > 0 && (
          <span className="fx-q" title={`Words taken from the game's ability descriptions:\n${evidence.join("\n")}`}>?</span>
        )}
        <button type="button" className="fx-raw-btn" aria-expanded={open} onClick={() => setOpen(!open)} title="raw fields">
          {open ? "−" : "+"}
        </button>
      </div>
      {open && (
        <div className="fx-raw">
          <RawChips row={Object.keys(rest).length ? rest : r} />
          {link && <><RawChips row={link.field} /><RawChips row={link.missile} /></>}
        </div>
      )}
    </div>
  );
}

function Text({ children }: { children?: string | null }) {
  return children ? <p className="game-text">{children}</p> : null;
}

function AbilityBlock({ label, a, kind = "ability", defs, from }: {
  label: string; a: Ability; kind?: RowKind; defs?: EffectDefs; from?: string;
}) {
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">{label}</span>
        {from && <span className="hub-badge" title="This renovation doesn't change this slot">from {from}</span>}
        <span className="ability__name">{a.name || (a.missing ? "(not in the ability tables)" : "(no text)")}</span>
        <span className="ability__id">#{a.id}</span>
      </div>
      <Text>{a.description}</Text>
      {a.effects && <EffectList title="effect rows" rows={a.effects} kind={kind} defs={defs} links={a.field_links} />}
    </div>
  );
}

function StratagemBlock({ s, defs, from }: { s: Stratagem; defs?: EffectDefs; from?: string }) {
  const { data: index } = useUnits();
  // EnchantEffect.TargetType 2 = 自分のみ: the effect sets' "target" is the user herself
  const setCtx: RowContext = {
    selfOnly: !!s.effect && defs?.labels[`etarget:${s.effect.row.TargetType}`]?.jp === "自分のみ",
    // FieldEffectType 3: the stratagem's effects land on every unit in its area
    fieldArea: Number(s.field?.field.FieldEffectType) === 3,
  };
  if (s.missing) {
    return <div className="ability"><div className="ability__head"><span className="ability__label">Stratagem</span><span className="ability__name">(not in Gimmick.atb)</span><span className="ability__id">#{s.id}</span></div></div>;
  }
  return (
    <div className={`ability${s.set_member ? " ability--member" : ""}`}>
      <div className="ability__head">
        <span className="ability__label">{s.set_member ? "Stratagem (set member)" : "Stratagem 計略"}</span>
        {from && <span className="hub-badge" title="This renovation doesn't change this slot">from {from}</span>}
        <span className="ability__name">{s.name}</span>
        <span className="ability__id">#{s.id}</span>
      </div>
      <div className="ability__stats">
        {s.ki != null && <span>Ki {s.ki}</span>}
        {s.cooldown != null && <span>Cooldown {s.cooldown}s</span>}
        {s.stock != null && <span>Stock {s.stock}</span>}
      </div>
      <Text>{s.description}</Text>
      {s.guide && <p className="muted small">{s.guide}</p>}
      {s.raw && <RawRows title="Gimmick row" rows={[s.raw]} />}
      {s.field && <EffectList title="FieldEffect" rows={[{ AbilityType: 21 }]} kind="ability" defs={defs} links={{ 0: s.field }} />}
      {s.token && (
        <div className="nested">
          <p className="switch-line">
            Places <b>{unitName(index?.find((x) => x.id === s.token!.card_id)) || s.token.name || `card #${s.token.card_id}`}</b>
            {typeof s.token.config.DeployLimit === "number" ? ` (up to ${s.token.config.DeployLimit})` : ""}
          </p>
          {s.token.ability && <AbilityBlock label="Placed unit's ability" a={s.token.ability} defs={defs} />}
          {s.token.general_ability && <AbilityBlock label="Placed unit's ability" a={s.token.general_ability} defs={defs} />}
          <RawRows title={`TokenConfig #${s.token.token_id}`} rows={[s.token.config]} />
        </div>
      )}
      {s.effect && <EffectList title={`EnchantEffect #${s.effect.id}`} rows={[s.effect.row]} kind="enchant" defs={defs} ctx={setCtx} />}
      {s.effect?.AllyEffectSetID && <EffectList title="ally effect set" rows={s.effect.AllyEffectSetID} kind="enchant_set" defs={defs} ctx={setCtx} />}
      {s.effect?.OpponentEffectSetID && <EffectList title="opponent effect set" rows={s.effect.OpponentEffectSetID} kind="enchant_set" defs={defs} ctx={setCtx} />}
    </div>
  );
}

function SpecialAttackBlock({ sa, defs, from }: { sa: SpecialAttack; defs?: EffectDefs; from?: string }) {
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">Special attack</span>
        {from && <span className="hub-badge" title="This renovation doesn't change this slot">from {from}</span>}
        <span className="ability__name">{sa.ability?.name || ""}</span>
        <span className="ability__id">#{sa.id}</span>
      </div>
      <Text>{sa.ability?.description}</Text>
      {sa.raw && <EffectList title="SpecialAttack row" rows={[sa.raw]} kind="special_attack" defs={defs} />}
      {sa.ability?.effects && <EffectList title="effect rows" rows={sa.ability.effects} kind="ability" defs={defs} />}
    </div>
  );
}

function SpecialAbilityBlock({ s, defs }: { s: SpecialAbility; defs?: EffectDefs }) {
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">Special ability</span>
        <span className="ability__name">{s.name}</span>
        <span className="ability__id">#{s.id}</span>
      </div>
      {s.switch && (
        <p className="switch-line">Switches weapon: <b>{s.switch[0] ?? "?"}</b> ⇄ <b>{s.switch[1] ?? "?"}</b></p>
      )}
      <div className="ability__stats">
        {s.ki != null && <span>Ki {s.ki}</span>}
        {s.duration != null && <span>Duration {s.duration}s</span>}
        {s.reuse != null && <span>Reuse {s.reuse}s</span>}
        {s.deploy_wait != null && <span>Usable {s.deploy_wait}s after deploy</span>}
      </div>
      <Text>{s.description}</Text>
      {s.raw && <RawRows title="SpecialAbility row" rows={[s.raw]} />}
      {s.sub_ability && <div className="nested"><AbilityBlock label="Transformed state" a={s.sub_ability} defs={defs} /></div>}
    </div>
  );
}

const SLOT_LABELS: [keyof Form, string, RowKind][] = [
  ["ability", "Specialty 特技", "ability"],
  ["organized", "Formation specialty 編成特技", "organized"],
  ["possessed", "Possession ability 所持", "ability"],
  ["defeated", "On defeat 撃破時", "ability"],
  ["always", "Always ability", "always"],
  ["quest", "Quest ability", "quest"],
];

const TIER_EN = ["Base", "Kai", "Kai Ni"];
const TIER_SLOTS: (keyof Form)[] = ["ability", "organized", "possessed", "defeated", "always", "quest", "stratagems", "special_attack"];

/** A renovation tier as the game plays it: the tier's own slots over every earlier tier's. */
interface TierView {
  tier: number;
  label: string;
  /** slot -> [form it comes from, that tier's name when carried over from an earlier tier]. */
  slots: Partial<Record<keyof Form, [Form, string | undefined]>>;
}

function tierViews(u: Unit): TierView[] {
  const views: TierView[] = [];
  if (!u.forms.length) return views;
  const max = Math.max(u.max_renovation, ...u.forms.map((f) => f.tier));
  let prev: TierView["slots"] = {};
  for (let n = 0; n <= max; n++) {
    const own = u.forms.find((f) => f.tier === n);
    const slots: TierView["slots"] = {};
    for (const [k, v] of Object.entries(prev) as [keyof Form, [Form, string | undefined]][]) {
      slots[k] = [v[0], TIER_EN[v[0].tier] ?? v[0].label];
    }
    for (const k of TIER_SLOTS) if (own?.[k]) slots[k] = [own, undefined];
    prev = slots;
    views.push({ tier: n, label: own?.label ?? ["未改築", "改壱", "改弐"][n] ?? `tier ${n}`, slots });
  }
  return views;
}

function FormPanel({ view, defs }: { view: TierView; defs?: EffectDefs }) {
  const sl = view.slots;
  const strat = sl.stratagems;
  const sa = sl.special_attack;
  return (
    <Panel title={`${TIER_EN[view.tier] ?? ""} ${view.label}`.trim()}>
      {SLOT_LABELS.map(([k, label, kind]) => {
        const e = sl[k];
        const a = e?.[0][k] as Ability | undefined;
        return a ? <AbilityBlock key={k} label={label} a={a} kind={kind} defs={defs} from={e![1]} /> : null;
      })}
      {strat?.[0].stratagems?.map((s, i) => <StratagemBlock key={`${s.id}-${i}`} s={s} defs={defs} from={strat[1]} />)}
      {sa?.[0].special_attack && <SpecialAttackBlock sa={sa[0].special_attack} defs={defs} from={sa[1]} />}
      {Object.keys(sl).length === 0 && <p className="muted">No abilities.</p>}
    </Panel>
  );
}

/** A class the card can use: its weapon, class ability and a one-line stat summary. */
function ClassSection({ label, block, defs }: { label: string; block: ClassBlock; defs?: EffectDefs }) {
  const c = block.class;
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">{label}</span>
        <span className="ability__name">{block.weapon.name ?? "?"}</span>
        <span className="ability__id">class #{block.class_id}</span>
      </div>
      <div className="ability__stats">
        <span>ATK {num(c, "InitialAttack")} → {num(c, "MaxAttack")}</span>
        <span>DEF {num(c, "InitialDefense")} → {num(c, "MaxDefense")}</span>
        <span>Range {num(c, "AttackRange")}</span>
        {num(c, "MaxTarget") > 0 && <span>Targets {num(c, "MaxTarget")}</span>}
      </div>
      {block.class_ability && (
        <div className="nested"><AbilityBlock label="Class ability" a={block.class_ability} defs={defs} /></div>
      )}
    </div>
  );
}

function num(row: RawRow | null, k: string): number {
  const v = row?.[k];
  return typeof v === "number" ? v : 0;
}

function StatsPanel({ u }: { u: Unit }) {
  const c = u.class;
  const range = (a: string, b: string) => `${num(c, a)} → ${num(c, b)}`;
  return (
    <Panel title="Stats" note="Class base values (initial → max level). Card corrections are percentages the game applies on top; the final-stat formula is not decoded yet.">
      <StatRows
        columns={2}
        rows={[
          { label: "Cost", value: num(c, "Cost") },
          { label: "Max level", value: num(c, "MaxLevel") },
          { label: "Range", value: num(c, "AttackRange") },
          { label: "HP 耐久", value: range("InitialHealth", "MaxHealth") },
          { label: "ATK 攻撃", value: range("InitialAttack", "MaxAttack") },
          { label: "DEF 防御", value: range("InitialDefense", "MaxDefense") },
          { label: "Regen 回復", value: range("InitialRegeneration", "MaxRegeneration") },
          { label: "Targets", value: num(c, "MaxTarget") || "—" },
          { label: "Block", value: num(c, "BlockCount") || "—" },
          { label: "AttackSpeed", value: num(c, "AttackSpeed") },
          { label: "AttackWait", value: num(c, "AttackWait") },
          { label: "KiGainInterval / KiBaseFeed", value: `${num(c, "KiGainInterval")} / ${num(c, "KiBaseFeed")}` },
          { label: "HP correction", value: `${u.corrections.hp}%` },
          { label: "ATK correction", value: `${u.corrections.atk}%` },
          { label: "DEF correction", value: `${u.corrections.def}%` },
          { label: "Regen correction", value: `${u.corrections.regen}%` },
        ]}
      />
      {c && <RawRows title={`Class #${c.ClassID}`} rows={[c]} />}
    </Panel>
  );
}

export default function UnitDetail() {
  const rawId = useParams().id;
  const id = Number(rawId);
  const valid = Number.isInteger(id) && id > 0;
  const { data: u, loading, error } = useUnit(valid ? id : null);
  const { data: meta } = useMeta();
  const { data: index } = useUnits();
  const { data: defs } = useEffectDefs();
  const [params, setParams] = useSearchParams();

  usePageMeta(
    u
      ? {
          title: unitName(u),
          description: `${unitName(u)}${u.name_en ? ` (${u.name})` : ""} (${rarityLabel(meta, u.rarity)} ${u.weapon.name ?? ""}) in Shiro Project:RE: stats, specialty, formation specialty, stratagem${u.forms.length > 1 ? ", renovation tiers" : ""} and profile.`,
        }
      : error || !valid ? { title: "Castle girl not found", description: DEFAULT_META.description, noindex: true } : null
  );

  if (!valid || error) {
    return <div className="page"><EmptyState title={`No castle girl #${rawId}.`} action={<Link to="/units">Back to the list</Link>} /></div>;
  }
  if (loading || !u) return <div className="page"><LoadState loading /></div>;

  const byId = new Map((index || []).map((x) => [x.id, x]));
  const views = tierViews(u);
  // ?kai=1 / ?kai=2 opens that renovation; Base keeps the URL clean
  const tier = Math.min(Math.max(0, Number(params.get("kai")) || 0), Math.max(0, views.length - 1));
  const view = views[tier];
  const setTier = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "0") next.delete("kai"); else next.set("kai", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="page unit-detail">
      <Breadcrumbs renderLink={renderLink} items={[{ label: "Castle Girls", href: "/units" }, { label: unitName(u) }]} />
      <PageHeader
        art={u.face ? <img className="unit-face" src={iconUrl(u.face)} alt="" width={120} height={120} /> : undefined}
        title={unitName(u)}
        id={`#${u.id}`}
        subtitle={[u.name_en ? u.name : "", u.ruby || ""].filter(Boolean).join(" · ") || undefined}
        meta={(
          <MetaChips>
            <MetaChip label="Rarity" value={rarityLabel(meta, u.rarity)} renderLink={renderLink} href={`/units?rarity=${u.rarity}`} />
            <MetaChip label="Weapon" value={weaponLabel(meta, u.weapon.type)} renderLink={renderLink} href={u.weapon.type ? `/units?weapon=${u.weapon.type}` : undefined} />
            {terrainParts(meta, u.terrain).map((t) => (
              <MetaChip key={t.slug} label="Terrain" value={terrainWord(t.jp)} title={terrainTitle(meta, u.terrain)}
                renderLink={renderLink} href={`/units?terrain=${t.slug}`} />
            ))}
            {u.max_renovation === 2 && <MetaChip label="Renovation" value="Kai Ni 改弐" renderLink={renderLink} href="/units?kai=2" />}
            {u.region && <MetaChip label="Region" value={regionLabel(meta, u.region)} renderLink={renderLink} href={`/units?region=${u.region}`} />}
            <MetaChip label="Category" value={categoryLabel(meta, u.category)} title={categoryJp(meta, u.category)}
              renderLink={renderLink} href={`/units?cat=${u.category}`} />
            {u.traits.map((t) => (
              <MetaChip key={t} label="Trait" value={traitLabel(meta, t)} title={traitTitle(meta, t)} renderLink={renderLink} href={`/units?trait=${t}`} />
            ))}
            {u.voice_actor && <MetaChip label="CV" value={u.voice_actor} />}
            {u.npc && <MetaChip label="Card type" value={u.card_type} />}
          </MetaChips>
        )}
      />

      {u.dup_of && (
        <p className="notice">Twin entry of <Link to={`/units/${u.dup_of}`}>#{u.dup_of}</Link> (same name, alternate card).</p>
      )}
      {u.transform_of && (
        <p className="notice">
          Transformed state of <Link to={`/units/${u.transform_of}`}>#{u.transform_of}</Link>: what that castle girl becomes while
          her stratagem is active.
        </p>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          {u.forms.length === 0 && <Panel title="Abilities"><p className="muted">No abilities.</p></Panel>}
          {views.length > 1 && (
            <UrlTabs
              label="Renovation"
              idBase="kai"
              className="tier-tabs"
              tabs={views.map((v) => ({ id: String(v.tier), label: `${TIER_EN[v.tier] ?? v.label} ${v.label}` }))}
              active={String(tier)}
              onChange={setTier}
            />
          )}
          {view && (
            <TabPanel tab={String(view.tier)} idBase="kai">
              <FormPanel view={view} defs={defs} />
            </TabPanel>
          )}
          {u.special_ability && <Panel title="Special ability"><SpecialAbilityBlock s={u.special_ability} defs={defs} /></Panel>}
          {u.transform_into && (
            <Panel
              title="Transformed state"
              note={<>Her {u.special_ability?.raw?.Transform ? "special ability" : "stratagem"} transforms her into <Link to={`/units/${u.transform_into.id}`}>#{u.transform_into.id}</Link>; these apply until it ends.</>}
            >
              {u.transform_into.general_ability && (
                <AbilityBlock label="Stratagem effects" a={u.transform_into.general_ability} defs={defs} />
              )}
              {u.transform_into.main_class && <ClassSection label="Weapon" block={u.transform_into.main_class} defs={defs} />}
              {u.transform_into.sub_class && <ClassSection label="Switch weapon" block={u.transform_into.sub_class} defs={defs} />}
              {u.transform_into.ability && <AbilityBlock label="Specialty 特技" a={u.transform_into.ability} defs={defs} />}
              {u.transform_into.special_ability && <SpecialAbilityBlock s={u.transform_into.special_ability} defs={defs} />}
            </Panel>
          )}
          {(u.general_ability || u.before_attack || u.moving_attack || u.one_time_reactive) && (
            <Panel title="Other abilities">
              {u.general_ability && <AbilityBlock label="General ability" a={u.general_ability} defs={defs} />}
              {u.before_attack && <AbilityBlock label="Before attack" a={u.before_attack} defs={defs} />}
              {u.moving_attack?.ability && <AbilityBlock label="Moving attack" a={u.moving_attack.ability} defs={defs} />}
              {u.moving_attack?.raw && <RawRows title={`MovingAttack #${u.moving_attack.id}`} rows={[u.moving_attack.raw]} />}
              {u.one_time_reactive && <RawRows title="OneTimeEffectReactive" rows={[u.one_time_reactive]} />}
            </Panel>
          )}
          {(u.class_ability || u.potential.length > 0 || u.sub_class) && (
            <Panel title="Class">
              {u.class_ability && <AbilityBlock label="Class ability" a={u.class_ability} defs={defs} />}
              {u.sub_class && <ClassSection label="Switch weapon (sub-class)" block={u.sub_class} defs={defs} />}
              {u.potential.length > 0 && (
                <div className="ability">
                  <div className="ability__head">
                    <span className="ability__label">Potential 潜在</span>
                    <span className="ability__name">{u.potential[0].name}</span>
                  </div>
                  <table className="hub-table potential">
                    <tbody>
                      {u.potential.map((p, i) => (
                        <tr key={i}><td className="muted">LB {p.limit_break}</td><td className="game-text">{p.description}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}
        </div>

        <div className="detail-side">
          <StatsPanel u={u} />
          {(u.weapon.description || u.dedicated_weapon) && (
            <Panel title={`Weapon: ${u.weapon.name ?? "—"}`}>
              <Text>{u.weapon.description}</Text>
              <Text>{u.weapon.battle_description}</Text>
              {u.dedicated_weapon && (
                <div className="ability">
                  <div className="ability__head">
                    <span className="ability__label">Dedicated weapon</span>
                    <span className="ability__name">{u.dedicated_weapon.name}</span>
                    <span className="ability__id">#{u.dedicated_weapon.id}</span>
                  </div>
                  <Text>{u.dedicated_weapon.description}</Text>
                </div>
              )}
            </Panel>
          )}
          {u.skins.length > 0 && (
            <Panel title="Other versions">
              <div className="skin-list">
                {u.skins.map((sid) => {
                  const s = byId.get(sid);
                  return (
                    <Link key={sid} to={`/units/${sid}`} className="skin" title={s?.name}>
                      {s?.face ? <img src={iconUrl(s.face)} alt="" width={56} height={56} loading="lazy" /> : <span className="icon-missing small-icon" />}
                      <span className="skin__name">{s ? unitName(s) : `#${sid}`}</span>
                    </Link>
                  );
                })}
              </div>
            </Panel>
          )}
          {(u.introduction || u.welcome || u.flavor.length > 0) && (
            <Panel title="Profile">
              <Text>{u.introduction}</Text>
              {u.welcome && <p className="game-text quote">{u.welcome}</p>}
              {u.flavor.map((f, i) => <p key={i} className="game-text quote">{f}</p>)}
            </Panel>
          )}
          <Panel title="Raw card data">
            <RawRows title="Card.atb row" rows={[u.raw]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
