import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckboxGroup, EmptyState, EntityTile, FilterChip, FilterPanel, ListToolbar, LoadState, Pager, SearchBox, routerLinks,
} from "@altterisk/game-hub";
import {
  TERRAINS, altName, categoryLabel, iconUrl, isMainWeapon, nameOf, rarityLabel, regionLabel, terrainLabel,
  terrainParts, traitLabel, traitTitle, PLACEMENTS, placementTags, useAdded, useMeta, useUnits, weaponLabel,
} from "../data";
import type { UnitIndexEntry } from "../types";
import { terrainOptionLabel, weaponOptionLabel } from "../filterIcons";
import { useHubLabels, useT } from "../i18n";
import { VaFilter, vaMatches } from "../vaFilter";

const PAGE = 60;
const renderLink = routerLinks(Link, "to");

export default function UnitList() {
  const { data: units, loading, error } = useUnits();
  const { data: added } = useAdded();
  const { data: meta } = useMeta();
  // filter/search/page state lives in the URL so back/forward and shared links restore the view
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);
  const t = useT();
  const hub = useHubLabels();
  // Card.MaxRenovationCount values as filter options
  const renovationOpts = [
    { value: "2", label: t("kaiNiOpt") },
    { value: "1", label: t("kaiOpt") },
    { value: "0", label: t("noRenovation") },
  ];

  const q = params.get("q") || "";
  const showNpc = params.get("npc") === "1";
  const showDup = params.get("dup") === "1";
  // default: newest first by added.json date (CDN upload of the card file); ?sort=id keeps game ID order
  const byId = params.get("sort") === "id";
  const page = Number(params.get("page") || "0");
  const csv = (key: string): string[] => (params.get(key) || "").split(",").filter(Boolean);
  const rarityF = csv("rarity");
  const weaponF = csv("weapon");
  const regionF = csv("region");
  const traitF = csv("trait");
  const categoryF = csv("cat");
  const terrainF = csv("terrain");
  const kaiF = csv("kai");
  const placeF = csv("place");
  const vaF = csv("va");

  // any filter/search change resets pagination; ?page= is 0-based
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };
  const toggleCsv = (key: string, list: string[], value: string) => {
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    setParam(key, next.join(","));
  };

  // options = values actually present among playable castle girls, in id order
  const opts = useMemo(() => {
    const rar = new Set<number>(), wep = new Set<number>(), reg = new Set<number>(), tr = new Set<number>(), cat = new Set<number>();
    for (const u of units || []) {
      if (u.npc) continue;
      rar.add(u.rarity);
      if (u.weapon) wep.add(u.weapon);
      if (u.region) reg.add(u.region);
      u.traits?.forEach((t) => tr.add(t));
      cat.add(u.category);
    }
    const sorted = (s: Set<number>) => [...s].sort((a, b) => a - b);
    return {
      rarity: sorted(rar).map((v) => ({ value: String(v), label: rarityLabel(meta, v) })),
      weapon: sorted(wep).filter(isMainWeapon).map((v) => ({ value: String(v), label: weaponOptionLabel(v, weaponLabel(meta, v)) })),
      weaponOther: sorted(wep).some((w) => !isMainWeapon(w)),
      region: sorted(reg).map((v) => ({ value: String(v), label: regionLabel(meta, v) })),
      trait: sorted(tr).map((v) => ({ value: String(v), label: traitLabel(meta, v) })),
      category: sorted(cat).map((v) => ({ value: String(v), label: categoryLabel(meta, v) })),
      // terrain words that some playable castle girl has, in the game's order (平 平山 山 水 地獄 無)
      terrain: TERRAINS.filter((x) => (units || []).some((u) => !u.npc && terrainParts(meta, u.terrain).includes(x)))
        .map((x) => ({ value: x.slug, label: terrainOptionLabel(x.slug, x.jp) })),
    };
  }, [units, meta]);

  const filtered = useMemo(() => {
    if (!units) return [] as UnitIndexEntry[];
    const term = q.trim().toLowerCase();
    const has = (list: string[], v: number | null | undefined) => v != null && list.includes(String(v));
    const out = units.filter((u) => {
      // NPC / token / twin entries stay hidden unless asked for or searched by name/id
      // transformed / twin entries are governed by their own toggle, not the NPC one
      if (!term && !showNpc && u.npc && !u.dup_of && !u.transform_of) return false;
      if (!term && !showDup && (u.dup_of || u.transform_of)) return false;
      if (rarityF.length && !has(rarityF, u.rarity)) return false;
      if (weaponF.length) {
        const other = weaponF.includes("other") && u.weapon != null && !isMainWeapon(u.weapon);
        if (!other && !has(weaponF, u.weapon)) return false;
      }
      if (regionF.length && !has(regionF, u.region)) return false;
      if (traitF.length && !(u.traits || []).some((t) => traitF.includes(String(t)))) return false;
      if (categoryF.length && !has(categoryF, u.category)) return false;
      // a dual-terrain castle (平/水城) matches each of its terrains, like the game's "平を含む城"
      if (terrainF.length && !terrainParts(meta, u.terrain).some((t) => terrainF.includes(t.slug))) return false;
      if (kaiF.length && !has(kaiF, u.renovation)) return false;
      if (placeF.length && !placementTags(u).some((x) => placeF.includes(x))) return false;
      if (vaF.length && !vaMatches(u, vaF)) return false;
      if (term) {
        const hay = `${u.id} ${u.name} ${u.name_en || ""} ${u.ruby || ""} ${u.va || ""} ${u.va_en || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (byId) return out;
    // newest date first, same date by higher ID; undated entries last, by higher ID
    const date = (u: UnitIndexEntry) => added?.units[String(u.id)] ?? "";
    return out.sort((a, b) => date(b).localeCompare(date(a)) || b.id - a.id);
  }, [units, added, meta, q, showNpc, showDup, byId, rarityF, weaponF, regionF, traitF, categoryF, terrainF, kaiF, placeF, vaF]);

  if (loading || error) return <div className="page"><LoadState loading={loading} error={error} labels={hub.load} /></div>;

  const activeCount = rarityF.length + weaponF.length + regionF.length + traitF.length + categoryF.length + terrainF.length + kaiF.length + placeF.length + vaF.length;
  const activeParams = [...new Set(params.keys())].filter((k) => k !== "page" && params.get(k)).length;
  const pages = Math.ceil(filtered.length / PAGE);
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const onPage = (p: number) => setParam("page", p > 1 ? String(p - 1) : null);

  return (
    <div className="page">
      <ListToolbar
        search={<SearchBox value={q} onChange={(v) => setParam("q", v || null)} placeholder={t("searchUnits")} clearLabel={hub.clearSearch} />}
        count={t("nCastleGirls", { n: filtered.length.toLocaleString() })}
        labels={hub.toolbar}
        activeFilters={activeParams}
        onClearFilters={() => setParams(new URLSearchParams(), { replace: true })}
        actions={(
          <>
            <FilterChip active={byId} onClick={() => setParam("sort", byId ? null : "id")} title={t("byIdTitle")}>{t("byId")}</FilterChip>
            <FilterChip active={showDup} onClick={() => setParam("dup", showDup ? null : "1")}>{t("twinEntries")}</FilterChip>
            <FilterChip active={showNpc} onClick={() => setParam("npc", showNpc ? null : "1")}>{t("npcEntries")}</FilterChip>
          </>
        )}
      />

      <FilterPanel open={showFilters} onToggle={() => setShowFilters(!showFilters)} activeCount={activeCount} phoneOnly={false} labels={hub.filters}>
        <CheckboxGroup title={t("rarity")} options={opts.rarity} selected={rarityF} onToggle={(v) => toggleCsv("rarity", rarityF, v)} />
        <CheckboxGroup
          title={t("weapon")}
          options={opts.weaponOther ? [...opts.weapon, { value: "other", label: t("otherCollab") }] : opts.weapon}
          selected={weaponF}
          onToggle={(v) => toggleCsv("weapon", weaponF, v)}
        />
        <CheckboxGroup title={t("terrain")} options={opts.terrain} selected={terrainF} onToggle={(v) => toggleCsv("terrain", terrainF, v)} />
        <CheckboxGroup title={t("placement")} options={PLACEMENTS.map((p) => ({ value: p, label: t(`place_${p}`) }))} selected={placeF} onToggle={(v) => toggleCsv("place", placeF, v)} />
        <CheckboxGroup title={t("renovation")} options={renovationOpts} selected={kaiF} onToggle={(v) => toggleCsv("kai", kaiF, v)} />
        <CheckboxGroup title={t("region")} options={opts.region} selected={regionF} onToggle={(v) => toggleCsv("region", regionF, v)} />
        <CheckboxGroup title={t("trait")} options={opts.trait} selected={traitF} onToggle={(v) => toggleCsv("trait", traitF, v)} />
        <CheckboxGroup title={t("category")} options={opts.category} selected={categoryF} onToggle={(v) => toggleCsv("cat", categoryF, v)} />
        <VaFilter units={units ?? undefined} selected={vaF} onToggle={(v) => toggleCsv("va", vaF, v)} />
      </FilterPanel>

      {traitF.length === 1 && meta?.traits[traitF[0]] && !meta.traits[traitF[0]].label && (
        <p className="muted small">{traitTitle(meta, Number(traitF[0]))}</p>
      )}

      <Pager page={page + 1} pages={pages} onPage={onPage} labels={hub.pager} />
      {shown.length === 0 && <EmptyState title={t("noMatchUnits")} hint={t("noMatchHint")} />}

      <div className="unit-grid">
        {shown.map((u) => (
          <EntityTile
            key={u.id}
            href={`/units/${u.id}`}
            renderLink={renderLink}
            className="unit-tile"
            icon={u.face ? <img src={iconUrl(u.face)} alt="" width={60} height={60} loading="lazy" /> : <span className="icon-missing" />}
            title={nameOf(u) || t("unnamed")}
            subtitle={`${altName(u) ? `${altName(u)} · ` : ""}#${u.id} · ${rarityLabel(meta, u.rarity)} · ${weaponLabel(meta, u.weapon)}${u.terrain ? ` · ${terrainLabel(meta, u.terrain)}` : ""}${u.region ? ` · ${regionLabel(meta, u.region)}` : ""}`}
            badges={(u.traits?.length || u.dup_of || u.transform_of || u.npc || u.renovation === 2) ? (
              <>
                {u.renovation === 2 && <span className="hub-badge hub-badge--accent" title={t("kaiNiTitle")}>{t("kaiNiBadge")}</span>}
                {u.traits?.map((tr) => <span key={tr} className="hub-badge" title={traitTitle(meta, tr)}>{traitLabel(meta, tr)}</span>)}
                {u.dup_of && <span className="hub-badge hub-badge--warning">{t("twinOf", { id: u.dup_of })}</span>}
                {u.transform_of && <span className="hub-badge hub-badge--accent">{t("transformedOf", { id: u.transform_of })}</span>}
                {u.npc && <span className="hub-badge">{t("cardType", { n: u.card_type })}</span>}
              </>
            ) : undefined}
          />
        ))}
      </div>

      <Pager page={page + 1} pages={pages} onPage={onPage} labels={hub.pager} />
    </div>
  );
}
