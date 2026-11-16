import { useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Breadcrumbs, EmptyState, LoadState, MetaChip, MetaChips, PageHeader, Panel, StatRows, TabPanel, UrlTabs, routerLinks,
} from "@altterisk/game-hub";
import {
  altName, categoryJp, categoryLabel, iconUrl, nameOf, possessionMatches, rarityLabel, regionLabel, terrainParts, terrainTitle, terrainWord, tierName,
  traitLabel, traitTitle, useMeta, usePossessions, useUnit, useUnits, weaponLabel,
} from "../data";
import { DEFAULT_META } from "../meta";
import { useFx, useHubLabels, useT, type UiKey } from "../i18n";
import { terrainIcon, weaponIcon } from "../filterIcons";
import { usePageMeta } from "../usePageMeta";
import { StatSimPanel } from "../statSimPanel";
import { combinedLines, type Fact } from "../combine";
import { describeRow, rowBases, stratagemContext, useEffectDefs, type EffectDefs, type RowContext, type RowKind, type Sentence } from "../effects";
import { groupRows, type Line } from "../group";
import type {
  Ability, ClassBlock, FieldLink, Form, PossessionSource, RawRow, SpecialAbility, SpecialAttack, Stratagem, UnitDetail as Unit, UnitIndexEntry,
} from "../types";

const renderLink = routerLinks(Link, "to");

/** Raw table fields as key=value chips (meanings not decoded). */
function RawChips({ row }: { row: RawRow }) {
  const t = useT();
  const entries = Object.entries(row);
  if (!entries.length) return <span className="muted small">{t("allZero")}</span>;
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
  const t = useT();
  if (!rows.length) return null;
  // a button, not <details>/<summary>: summary blocks text selection across it
  return (
    <div className="raw">
      <button type="button" className="raw-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} {title} ({rows.length > 1 ? t("rows", { n: rows.length }) : t("row")})
      </button>
      {open && rows.map((r, i) => <RawChips key={i} row={r} />)}
    </div>
  );
}

/** Effect rows as readable lines (alike sentences merged, src/group.ts); each line keeps the raw fields of
 *  the rows it came from one click away. */
function EffectList({ title, rows, kind, defs, links, ctx }: {
  title: string; rows: RawRow[]; kind: RowKind; defs?: EffectDefs; links?: Record<string, FieldLink>; ctx?: RowContext;
}) {
  if (!rows.length) return null;
  if (!defs) return <RawRows title={title} rows={rows} />;
  const bases = rowBases(rows);
  const described = rows.map((r, i) => describeRow(r, kind, defs, links?.[String(i)], bases[i], ctx));
  // totals across rows: overlapping receivers that stack, ladders of attack-bonus multipliers
  const facts: Fact[] = described.flatMap((s) => s.facts.map((f) => ({ ...f, text: s.text[f.line] ?? "" })));
  const combined = combinedLines(facts);
  // alike sentences merged across rows; a row with no sentence keeps its place as "(not decoded)"
  const shown = groupRows(described.map((s) => s.text));
  const t = useT();
  const fx = useFx();
  return (
    <div className="fx-list">
      {shown.map((l, i) => (
        <EffectLine key={i} line={l} rows={l.rows.map((j) => ({ r: rows[j], s: described[j], link: links?.[String(j)] }))} />
      ))}
      {combined.length > 0 && (
        <div className="fx-combined">
          <span className="fx-combined__label">{t("combined")}</span>
          {combined.map((c, i) => <div key={i}>{fx.line(c)}</div>)}
        </div>
      )}
    </div>
  );
}

/** One effect line: plain selectable text; the raw fields of its rows open from a separate button. */
function EffectLine({ line, rows }: { line: Line; rows: { r: RawRow; s: Sentence; link?: FieldLink }[] }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const fx = useFx();
  const evidence = [...new Set(rows.flatMap((x) => x.s.evidence))];
  return (
    <div className="fx-row">
      <div className="fx-line">
        <span className="fx-text" title={line.text && fx.line(line.text) !== line.text ? line.text : undefined}>{line.text ? fx.line(line.text) : <span className="muted">{t("notDecoded")}</span>}</span>
        {evidence.length > 0 && (
          <span className="fx-q" title={`${t("evidence")}\n${evidence.join("\n")}`}>?</span>
        )}
        <button type="button" className="fx-raw-btn" aria-expanded={open} onClick={() => setOpen(!open)}
          title={rows.length > 1 ? t("rawFieldsN", { n: rows.length }) : t("rawFields")}>
          {open ? "−" : "+"}
        </button>
      </div>
      {open && (
        <div className="fx-raw">
          {rows.map(({ r, s, link }, i) => (
            <div key={i}>
              <RawChips row={Object.keys(s.rest).length ? s.rest : r} />
              {link && <><RawChips row={link.field} /><RawChips row={link.missile} /></>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Text({ children }: { children?: string | null }) {
  return children ? <p className="game-text">{children}</p> : null;
}

export function AbilityBlock({ label, a, kind = "ability", defs, from }: {
  label: string; a: Ability; kind?: RowKind; defs?: EffectDefs; from?: string;
}) {
  const t = useT();
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">{label}</span>
        {from && <span className="hub-badge" title={t("fromTierTitle")}>{t("fromTier", { tier: from })}</span>}
        <span className="ability__name">{a.name || (a.missing ? t("notInAbility") : t("noText"))}</span>
        <span className="ability__id">#{a.id}</span>
      </div>
      <Text>{a.description}</Text>
      {a.effects && <EffectList title="effect rows" rows={a.effects} kind={kind} defs={defs} links={a.field_links} />}
    </div>
  );
}

function StratagemBlock({ s, defs, from }: { s: Stratagem; defs?: EffectDefs; from?: string }) {
  const { data: index } = useUnits();
  const t = useT();
  // EnchantEffect.TargetType 2 = 自分のみ: the effect sets' "target" is the user herself
  const setCtx: RowContext = defs ? stratagemContext(defs, s) : {};
  if (s.missing) {
    return <div className="ability"><div className="ability__head"><span className="ability__label">{t("stratagem")}</span><span className="ability__name">{t("notInGimmick")}</span><span className="ability__id">#{s.id}</span></div></div>;
  }
  return (
    <div className={`ability${s.set_member ? " ability--member" : ""}`}>
      <div className="ability__head">
        <span className="ability__label">{s.set_member ? t("stratagemMember") : t("stratagem")}</span>
        {from && <span className="hub-badge" title={t("fromTierTitle")}>{t("fromTier", { tier: from })}</span>}
        <span className="ability__name">{s.name}</span>
        <span className="ability__id">#{s.id}</span>
      </div>
      <div className="ability__stats">
        {s.ki != null && <span>{t("ki", { n: s.ki })}</span>}
        {s.cooldown != null && <span>{t("cooldown", { n: s.cooldown })}</span>}
        {s.stock != null && <span>{t("stock", { n: s.stock })}</span>}
      </div>
      <Text>{s.description}</Text>
      {s.guide && <p className="muted small">{s.guide}</p>}
      {s.raw && <RawRows title="Gimmick row" rows={[s.raw]} />}
      {s.field && <EffectList title="FieldEffect" rows={[{ AbilityType: 21 }]} kind="ability" defs={defs} links={{ 0: s.field }} />}
      {s.placement && <EffectList title={`LocationEffect #${s.placement.location_id}`} rows={[s.placement.location]} kind="location" defs={defs} />}
      {s.placement && s.placement.effects.length > 0 && <EffectList title={`PlacementEffect #${s.placement.location.Param2}`} rows={s.placement.effects} kind="placement" defs={defs} />}
      {s.token && (
        <div className="nested">
          <p className="switch-line">
            {t("places")} <b>{nameOf(index?.find((x) => x.id === s.token!.card_id)) || s.token.name || `card #${s.token.card_id}`}</b>
            {typeof s.token.config.DeployLimit === "number" ? t("upTo", { n: s.token.config.DeployLimit }) : ""}
          </p>
          {s.token.ability && <AbilityBlock label={t("placedAbility")} a={s.token.ability} defs={defs} />}
          {s.token.general_ability && <AbilityBlock label={t("placedAbility")} a={s.token.general_ability} defs={defs} />}
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
  const t = useT();
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">{t("specialAttack")}</span>
        {from && <span className="hub-badge" title={t("fromTierTitle")}>{t("fromTier", { tier: from })}</span>}
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
  const t = useT();
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">{t("specialAbility")}</span>
        <span className="ability__name">{s.name}</span>
        <span className="ability__id">#{s.id}</span>
      </div>
      {s.switch && (
        <p className="switch-line">{t("switchesWeapon")} <b>{s.switch[0] ?? "?"}</b> ⇄ <b>{s.switch[1] ?? "?"}</b></p>
      )}
      <div className="ability__stats">
        {s.ki != null && <span>{t("ki", { n: s.ki })}</span>}
        {s.duration != null && <span>{t("duration", { n: s.duration })}</span>}
        {s.reuse != null && <span>{t("reuse", { n: s.reuse })}</span>}
        {s.deploy_wait != null && <span>{t("deployWait", { n: s.deploy_wait })}</span>}
      </div>
      <Text>{s.description}</Text>
      {s.raw && <RawRows title="SpecialAbility row" rows={[s.raw]} />}
      {s.sub_ability && <div className="nested"><AbilityBlock label={t("transformedState")} a={s.sub_ability} defs={defs} /></div>}
    </div>
  );
}

const SLOT_LABELS: [keyof Form, UiKey, RowKind][] = [
  ["ability", "specialty", "ability"],
  ["organized", "formation", "organized"],
  ["possessed", "possession", "ability"],
  ["defeated", "onDefeat", "ability"],
  ["always", "alwaysAbility", "always"],
  ["quest", "questAbility", "quest"],
];

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
      slots[k] = [v[0], tierName(v[0].tier)];
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
  const t = useT();
  return (
    <Panel title={tierTitle(view)}>
      {SLOT_LABELS.map(([k, label, kind]) => {
        const e = sl[k];
        const a = e?.[0][k] as Ability | undefined;
        return a ? <AbilityBlock key={k} label={t(label)} a={a} kind={kind} defs={defs} from={e![1]} /> : null;
      })}
      {strat?.[0].stratagems?.map((s, i) => <StratagemBlock key={`${s.id}-${i}`} s={s} defs={defs} from={strat[1]} />)}
      {sa?.[0].special_attack && <SpecialAttackBlock sa={sa[0].special_attack} defs={defs} from={sa[1]} />}
      {Object.keys(sl).length === 0 && <p className="muted">{t("noAbilities")}</p>}
    </Panel>
  );
}

/** A class the card can use: its weapon, class ability and a one-line stat summary. */
function ClassSection({ label, block, defs }: { label: string; block: ClassBlock; defs?: EffectDefs }) {
  const c = block.class;
  const t = useT();
  return (
    <div className="ability">
      <div className="ability__head">
        <span className="ability__label">{label}</span>
        <span className="ability__name">{block.weapon.name ?? "?"}</span>
        <span className="ability__id">{t("classId", { id: block.class_id })}</span>
      </div>
      <div className="ability__stats">
        <span>{t("thAtk")} {num(c, "InitialAttack")} → {num(c, "MaxAttack")}</span>
        <span>{t("thDef")} {num(c, "InitialDefense")} → {num(c, "MaxDefense")}</span>
        <span>{t("range")} {num(c, "AttackRange")}</span>
        {num(c, "MaxTarget") > 0 && <span>{t("targets")} {num(c, "MaxTarget")}</span>}
        {PLACE_OF[num(c, "AttackType")] && (
          <span>{t("placement")} {t(`place_${PLACE_OF[num(c, "AttackType")]}`)}{num(c, "ShipLocationPlaceable") ? ` + ${t("place_water")}` : ""}</span>
        )}
      </div>
      {block.class_ability && (
        <div className="nested"><AbilityBlock label={t("classAbility")} a={block.class_ability} defs={defs} /></div>
      )}
    </div>
  );
}

/** Class.AttackType -> placement (as tools/export_units.py PLACEMENT). */
const PLACE_OF: Record<number, "melee" | "ranged" | "both"> = { 1: "melee", 100: "ranged", 1001: "both" };

function num(row: RawRow | null, k: string): number {
  const v = row?.[k];
  return typeof v === "number" ? v : 0;
}

function StatsPanel({ u }: { u: Unit }) {
  const c = u.class;
  const range = (a: string, b: string) => `${num(c, a)} → ${num(c, b)}`;
  const t = useT();
  return (
    <Panel title={t("stats")} note={t("statsNote")}>
      <StatRows
        columns={2}
        rows={[
          { label: t("cost"), value: num(c, "Cost") },
          { label: t("maxLevel"), value: num(c, "MaxLevel") },
          { label: t("range"), value: num(c, "AttackRange") },
          { label: t("hp"), value: range("InitialHealth", "MaxHealth") },
          { label: t("atk"), value: range("InitialAttack", "MaxAttack") },
          { label: t("def"), value: range("InitialDefense", "MaxDefense") },
          { label: t("regen"), value: range("InitialRegeneration", "MaxRegeneration") },
          { label: t("targets"), value: num(c, "MaxTarget") || "—" },
          { label: t("block"), value: num(c, "BlockCount") || "—" },
          { label: "AttackSpeed", value: num(c, "AttackSpeed") },
          { label: "AttackWait", value: num(c, "AttackWait") },
          { label: "KiGainInterval / KiBaseFeed", value: `${num(c, "KiGainInterval")} / ${num(c, "KiBaseFeed")}` },
          { label: t("hpCorr"), value: `${u.corrections.hp}%` },
          { label: t("atkCorr"), value: `${u.corrections.atk}%` },
          { label: t("defCorr"), value: `${u.corrections.def}%` },
          { label: t("regenCorr"), value: `${u.corrections.regen}%` },
        ]}
      />
      {c && <RawRows title={`Class #${c.ClassID}`} rows={[c]} />}
    </Panel>
  );
}

/** Tab / panel title of a tier: "Kai 改壱" in English, "改壱" in Japanese. */
function tierTitle(v: TierView): string {
  const name = tierName(v.tier);
  return name === v.label ? v.label : `${name} ${v.label}`;
}

/** Every castle girl's possession ability (所持) whose group target (weapon, region, trait, terrain) includes
 *  this one, grouped by the girl who owns it; a renovation that keeps the same ability merges into one entry. */
function PossessionBuffsPanel({ u, defs, byId }: { u: Unit; defs?: EffectDefs; byId: Map<number, UnitIndexEntry> }) {
  const { data } = usePossessions();
  const t = useT();
  if (!data || u.npc) return null;
  const me = { weapon: u.weapon.type, region: u.region, traits: u.traits, terrain: u.terrain };
  const hits = data.sources.filter((p) => p.targets.some((c) => { const r = data.rules[c]; return r && possessionMatches(r, me); }));
  // one entry per owner + ability (same name, text and rows across tiers)
  const groups = new Map<string, { p: PossessionSource; tiers: number[] }>();
  for (const p of hits) {
    const k = `${p.u}|${p.name}|${p.desc}|${JSON.stringify(p.effects)}`;
    const g = groups.get(k);
    if (g) g.tiers.push(p.t); else groups.set(k, { p, tiers: [p.t] });
  }
  const list = [...groups.values()];
  return (
    <Panel title={t("possessionBuffs")} note={t("possessionBuffsNote")}>
      {list.length === 0 && <p className="muted">{t("possessionBuffsNone")}</p>}
      {list.map(({ p, tiers }) => {
        const owner = byId.get(p.u);
        return (
          <div className="ability" key={`${p.u}-${p.id}-${tiers.join()}`}>
            <div className="ability__head">
              <Link to={`/units/${p.u}${tiers[0] ? `?kai=${tiers[0]}` : ""}`} className="possession-owner" title={owner?.name}>
                {owner?.face ? <img src={iconUrl(owner.face)} alt="" width={32} height={32} loading="lazy" /> : null}
                <span>{owner ? nameOf(owner) : `#${p.u}`}</span>
              </Link>
              {tiers.map((x) => <span key={x} className="hub-badge">{tierName(x)}</span>)}
              <span className="ability__name">{p.name}</span>
              <span className="ability__id">#{p.id}</span>
            </div>
            <Text>{p.desc}</Text>
            <EffectList title="effect rows" rows={p.effects} kind="ability" defs={defs} />
          </div>
        );
      })}
    </Panel>
  );
}

/** A translated sentence with a {link} placeholder, rendered with the link element in its place. */
function withLink(sentence: string, link: ReactNode): ReactNode {
  const [before, after = ""] = sentence.split("{link}");
  return <>{before}{link}{after}</>;
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
  const t = useT();
  const hub = useHubLabels();

  usePageMeta(
    u
      ? {
          title: nameOf(u),
          description: `${nameOf(u)}${u.name_en ? ` (${u.name})` : ""} (${rarityLabel(meta, u.rarity)} ${u.weapon.name ?? ""}) in Shiro Project:RE: stats, specialty, formation specialty, stratagem${u.forms.length > 1 ? ", renovation tiers" : ""} and profile.`,
        }
      : error || !valid ? { title: "Castle girl not found", description: DEFAULT_META.description, noindex: true } : null
  );

  if (!valid || error) {
    return <div className="page"><EmptyState title={t("noUnit", { id: String(rawId) })} action={<Link to="/units">{t("backShort")}</Link>} /></div>;
  }
  if (loading || !u) return <div className="page"><LoadState loading labels={hub.load} /></div>;

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
      <Breadcrumbs renderLink={renderLink} items={[{ label: t("castleGirls"), href: "/units" }, { label: nameOf(u) }]} />
      <PageHeader
        art={u.face ? <img className="unit-face" src={iconUrl(u.face)} alt="" width={120} height={120} /> : undefined}
        title={nameOf(u)}
        id={`#${u.id}`}
        subtitle={[altName(u), u.ruby || ""].filter(Boolean).join(" · ") || undefined}
        meta={(
          <MetaChips>
            <MetaChip label={t("rarity")} value={rarityLabel(meta, u.rarity)} renderLink={renderLink} href={`/units?rarity=${u.rarity}`} />
            <MetaChip label={t("weapon")} value={weaponLabel(meta, u.weapon.type)} icon={weaponIcon(u.weapon.type)} renderLink={renderLink} href={u.weapon.type ? `/units?weapon=${u.weapon.type}` : undefined} />
            {terrainParts(meta, u.terrain).map((x) => (
              <MetaChip key={x.slug} label={t("terrain")} value={terrainWord(x.jp)} icon={terrainIcon(x.slug)} title={terrainTitle(meta, u.terrain)}
                renderLink={renderLink} href={`/units?terrain=${x.slug}`} />
            ))}
            {u.placement && <MetaChip label={t("placement")} value={t(`place_${u.placement}`)} title={t(`placeTitle_${u.placement}`)}
              renderLink={renderLink} href={`/units?place=${u.placement}`} />}
            {u.water && <MetaChip label={t("placement")} value={t("place_water")} title={t("placeTitle_water")} renderLink={renderLink} href="/units?place=water" />}
            {u.boat && <MetaChip label={t("placement")} value={t("place_boat")} title={t("placeTitle_boat")} renderLink={renderLink} href="/units?place=boat" />}
            {u.max_renovation === 2 && <MetaChip label={t("renovation")} value={t("kaiNiOpt")} renderLink={renderLink} href="/units?kai=2" />}
            {u.region && <MetaChip label={t("region")} value={regionLabel(meta, u.region)} renderLink={renderLink} href={`/units?region=${u.region}`} />}
            <MetaChip label={t("category")} value={categoryLabel(meta, u.category)} title={categoryJp(meta, u.category)}
              renderLink={renderLink} href={`/units?cat=${u.category}`} />
            {u.traits.map((tr) => (
              <MetaChip key={tr} label={t("trait")} value={traitLabel(meta, tr)} title={traitTitle(meta, tr)} renderLink={renderLink} href={`/units?trait=${tr}`} />
            ))}
            {u.voice_actor && <MetaChip label={t("cv")} value={u.voice_actor} />}
            {u.npc && <MetaChip label={t("cardTypeLabel")} value={u.card_type} />}
          </MetaChips>
        )}
      />

      {u.dup_of && (
        <p className="notice">{withLink(t("twinNotice"), <Link to={`/units/${u.dup_of}`}>#{u.dup_of}</Link>)}</p>
      )}
      {u.transform_of && (
        <p className="notice">{withLink(t("transformNotice"), <Link to={`/units/${u.transform_of}`}>#{u.transform_of}</Link>)}</p>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          {u.forms.length === 0 && <Panel title={t("abilities")}><p className="muted">{t("noAbilities")}</p></Panel>}
          {views.length > 1 && (
            <UrlTabs
              label={t("renovation")}
              idBase="kai"
              className="tier-tabs"
              tabs={views.map((v) => ({ id: String(v.tier), label: tierTitle(v) }))}
              active={String(tier)}
              onChange={setTier}
            />
          )}
          {view && (
            <TabPanel tab={String(view.tier)} idBase="kai">
              <FormPanel view={view} defs={defs} />
            </TabPanel>
          )}
          {u.special_ability && <Panel title={t("specialAbility")}><SpecialAbilityBlock s={u.special_ability} defs={defs} /></Panel>}
          {u.transform_into && (
            <Panel
              title={t("transformedState")}
              note={withLink(t("transformNote", { what: t(u.special_ability?.raw?.Transform ? "whatSpecial" : "whatStratagem") }), <Link to={`/units/${u.transform_into.id}`}>#{u.transform_into.id}</Link>)}
            >
              {u.transform_into.general_ability && (
                <AbilityBlock label={t("stratagemEffects")} a={u.transform_into.general_ability} defs={defs} />
              )}
              {u.transform_into.main_class && <ClassSection label={t("weapon")} block={u.transform_into.main_class} defs={defs} />}
              {u.transform_into.sub_class && <ClassSection label={t("switchWeapon")} block={u.transform_into.sub_class} defs={defs} />}
              {u.transform_into.ability && <AbilityBlock label={t("specialty")} a={u.transform_into.ability} defs={defs} />}
              {u.transform_into.special_ability && <SpecialAbilityBlock s={u.transform_into.special_ability} defs={defs} />}
            </Panel>
          )}
          {(u.general_ability || u.before_attack || u.moving_attack || u.one_time_reactive) && (
            <Panel title={t("otherAbilities")}>
              {u.general_ability && <AbilityBlock label={t("generalAbility")} a={u.general_ability} defs={defs} />}
              {u.before_attack && <AbilityBlock label={t("beforeAttack")} a={u.before_attack} defs={defs} />}
              {u.moving_attack?.ability && <AbilityBlock label={t("movingAttack")} a={u.moving_attack.ability} defs={defs} />}
              {u.moving_attack?.raw && <RawRows title={`MovingAttack #${u.moving_attack.id}`} rows={[u.moving_attack.raw]} />}
              {u.one_time_reactive && <RawRows title="OneTimeEffectReactive" rows={[u.one_time_reactive]} />}
            </Panel>
          )}
          {(u.class_ability || u.potential.length > 0 || u.sub_class) && (
            <Panel title={t("classTitle")}>
              {u.class_ability && <AbilityBlock label={t("classAbility")} a={u.class_ability} defs={defs} />}
              {u.sub_class && <ClassSection label={t("switchWeaponSub")} block={u.sub_class} defs={defs} />}
              {u.potential.length > 0 && (
                <div className="ability">
                  <div className="ability__head">
                    <span className="ability__label">{t("potential")}</span>
                    <span className="ability__name">{u.potential[0].name}</span>
                  </div>
                  <table className="hub-table potential">
                    <tbody>
                      {u.potential.map((p, i) => (
                        <tr key={i}><td className="muted">{t("lb", { n: p.limit_break })}</td><td className="game-text">{p.description}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}
          <PossessionBuffsPanel u={u} defs={defs} byId={byId} />
        </div>

        <div className="detail-side">
          <StatSimPanel u={u} />
          <StatsPanel u={u} />
          {(u.weapon.description || u.dedicated_weapon) && (
            <Panel title={t("weaponTitle", { name: u.weapon.name ?? "—" })}>
              <Text>{u.weapon.description}</Text>
              <Text>{u.weapon.battle_description}</Text>
              {u.dedicated_weapon && (
                <div className="ability">
                  <div className="ability__head">
                    <span className="ability__label">{t("dedicatedWeapon")}</span>
                    <span className="ability__name"><Link to={`/equipment/${u.dedicated_weapon.id}`}>{u.dedicated_weapon.name}</Link></span>
                    <span className="ability__id">#{u.dedicated_weapon.id}</span>
                  </div>
                  <Text>{u.dedicated_weapon.description}</Text>
                </div>
              )}
            </Panel>
          )}
          {u.skins.length > 0 && (
            <Panel title={t("otherVersions")}>
              <div className="skin-list">
                {u.skins.map((sid) => {
                  const s = byId.get(sid);
                  return (
                    <Link key={sid} to={`/units/${sid}`} className="skin" title={s?.name}>
                      {s?.face ? <img src={iconUrl(s.face)} alt="" width={56} height={56} loading="lazy" /> : <span className="icon-missing small-icon" />}
                      <span className="skin__name">{s ? nameOf(s) : `#${sid}`}</span>
                    </Link>
                  );
                })}
              </div>
            </Panel>
          )}
          {(u.introduction || u.welcome || u.flavor.length > 0) && (
            <Panel title={t("profile")}>
              <Text>{u.introduction}</Text>
              {u.welcome && <p className="game-text quote">{u.welcome}</p>}
              {u.flavor.map((f, i) => <p key={i} className="game-text quote">{f}</p>)}
            </Panel>
          )}
          <Panel title={t("rawCard")}>
            <RawRows title="Card.atb row" rows={[u.raw]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
