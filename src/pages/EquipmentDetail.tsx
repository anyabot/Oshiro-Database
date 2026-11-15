import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs, EmptyState, LoadState, MetaChip, MetaChips, PageHeader, Panel, routerLinks } from "@altterisk/game-hub";
import { useHubLabels, useT } from "../i18n";
import { useEffectDefs } from "../effects";
import { iconUrl, nameOf, useUnits } from "../data";
import { useStages } from "../stages";
import { usePageMeta } from "../usePageMeta";
import { useWeapons, weaponDotUrl, weaponIconUrl, type Weapon } from "../weapons";
import { AbilityLines, SourceLine, useStatText, weaponTypeName } from "../weaponParts";

const renderLink = routerLinks(Link, "to");

export default function EquipmentDetail() {
  const id = Number(useParams().id);
  const { data, loading, error } = useWeapons();
  const { data: defs } = useEffectDefs();
  const { data: index } = useUnits();
  const { data: stageList } = useStages();
  const t = useT();
  const hub = useHubLabels();
  const statText = useStatText();

  const maps = useMemo(() => ({
    weapons: new Map((data?.weapons ?? []).map((w) => [w.id, w] as [number, Weapon])),
    units: new Map((index ?? []).map((u) => [u.id, u])),
    stages: new Map((stageList ?? []).map((s) => [s.id, s])),
  }), [data, index, stageList]);
  const w = maps.weapons.get(id);
  usePageMeta(w ? { title: w.name, description: `${w.name} (★${w.rarity} ${data?.types[String(w.type)] ?? ""}) in Shiro Project:RE: stats, ability and how to get it.` } : null);

  if (!data) return <div className="page"><LoadState loading={loading} error={error} labels={hub.load} /></div>;
  if (!w) return <div className="page"><EmptyState title={t("noWeapon", { id })} action={<Link to="/equipment">{t("backShort")}</Link>} /></div>;
  const up = w.evolution ? maps.weapons.get(w.evolution) : undefined;

  return (
    <div className="page unit-detail">
      <Breadcrumbs renderLink={renderLink} items={[{ label: t("equipTitle"), href: "/equipment" }, { label: w.name }]} />
      <PageHeader
        art={w.dot
          ? <span className="weapon-art"><img className="weapon-dot" src={weaponDotUrl(w.dot)} alt="" /></span>
          : <img className="unit-face" src={weaponIconUrl(w.type)} alt="" width={96} height={96} />}
        title={w.name || `#${w.id}`}
        id={`#${w.id}`}
        meta={(
          <MetaChips>
            <MetaChip label={t("rarity")} value={`★${w.rarity}`} renderLink={renderLink} href={`/equipment?rarity=${w.rarity}`} />
            <MetaChip label={t("weapon")} value={weaponTypeName(data, w.type)} icon={<img src={weaponIconUrl(w.type)} alt="" width={20} height={20} />}
              renderLink={renderLink} href={`/equipment?type=${w.type <= 24 ? w.type : "other"}`} />
            {w.kind === 1 && <MetaChip value={t("kindInitial")} />}
            {w.kind === 2 && <MetaChip value={t("kindMaterial")} />}
            {up && <MetaChip label={t("upgradesTo")} value={up.name} renderLink={renderLink} href={`/equipment/${up.id}`} />}
          </MetaChips>
        )}
      />
      <div className="detail-grid">
        <div className="detail-main">
          {(w.text || statText(w.stats).length > 0 || w.ability.length > 0) && <Panel title={t("weaponStats")} note={t("weaponStatsNote")}>
            {statText(w.stats).length > 0 && <p className="weapon-stats">{statText(w.stats).join(" · ")}</p>}
            {/* the decoded effects sit with the stats: together they are what the weapon does */}
            {w.ability.length > 0 && defs && (
              <div className="weapon-effects">
                <span className="fx-combined__label">{t("weaponAbility")}</span>
                <AbilityLines rows={w.ability} defs={defs} />
              </div>
            )}
            {w.text && <p className="game-text">{w.text}</p>}
          </Panel>}
          {w.special && (
            <Panel title={t("weaponSpecial")} note={t("weaponSpecialNote")}>
              <div className="skin-list">
                {w.special.castles.map((cid) => {
                  const u = maps.units.get(cid);
                  return (
                    <Link key={cid} to={`/units/${cid}`} className="skin" title={u?.name}>
                      {u?.face ? <img src={iconUrl(u.face)} alt="" width={56} height={56} loading="lazy" /> : <span className="icon-missing small-icon" />}
                      <span className="skin__name">{u ? nameOf(u) : `#${cid}`}</span>
                    </Link>
                  );
                })}
              </div>
              {statText(w.special.stats).length > 0 && <p className="weapon-stats">{statText(w.special.stats).join(" · ")}</p>}
              {w.special.ability.length > 0 && defs && <AbilityLines rows={w.special.ability} defs={defs} />}
            </Panel>
          )}
        </div>
        <div className="detail-side">
          <Panel title={t("weaponSources")}>
            {w.sources.length ? (
              <ul className="weapon-sources">
                {w.sources.map((s, i) => <li key={i}><SourceLine s={s} units={maps.units} stages={maps.stages} weapons={maps.weapons} /></li>)}
              </ul>
            ) : <p className="muted small">{t("weaponNoSource")}</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
