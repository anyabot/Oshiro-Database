import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckboxGroup, EmptyState, EntityTile, FilterChip, FilterPanel, ListToolbar, LoadState, Pager, SearchBox, routerLinks,
} from "@altterisk/game-hub";
import {
  TERRAINS, categoryLabel, iconUrl, isMainWeapon, rarityLabel, regionLabel, terrainLabel, terrainParts, terrainWord,
  traitLabel, traitTitle, useMeta, useUnits, weaponLabel,
} from "../data";
import type { UnitIndexEntry } from "../types";
import { unitName } from "../labels";

/** Card.MaxRenovationCount values as filter options. */
const RENOVATION_OPTS = [
  { value: "2", label: "Kai Ni 改弐" },
  { value: "1", label: "Kai 改壱 (no Kai Ni)" },
  { value: "0", label: "No renovation" },
];

const PAGE = 60;
const renderLink = routerLinks(Link, "to");

export default function UnitList() {
  const { data: units, loading, error } = useUnits();
  const { data: meta } = useMeta();
  // filter/search/page state lives in the URL so back/forward and shared links restore the view
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);

  const q = params.get("q") || "";
  const showNpc = params.get("npc") === "1";
  const showDup = params.get("dup") === "1";
  const newest = params.get("sort") === "new";
  const page = Number(params.get("page") || "0");
  const csv = (key: string): string[] => (params.get(key) || "").split(",").filter(Boolean);
  const rarityF = csv("rarity");
  const weaponF = csv("weapon");
  const regionF = csv("region");
  const traitF = csv("trait");
  const categoryF = csv("cat");
  const terrainF = csv("terrain");
  const kaiF = csv("kai");

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
      weapon: sorted(wep).filter(isMainWeapon).map((v) => ({ value: String(v), label: weaponLabel(meta, v) })),
      weaponOther: sorted(wep).some((w) => !isMainWeapon(w)),
      region: sorted(reg).map((v) => ({ value: String(v), label: regionLabel(meta, v) })),
      trait: sorted(tr).map((v) => ({ value: String(v), label: traitLabel(meta, v) })),
      category: sorted(cat).map((v) => ({ value: String(v), label: categoryLabel(meta, v) })),
      // terrain words that some playable castle girl has, in the game's order (平 平山 山 水 地獄 無)
      terrain: TERRAINS.filter((t) => (units || []).some((u) => !u.npc && terrainParts(meta, u.terrain).includes(t)))
        .map((t) => ({ value: t.slug, label: `${terrainWord(t.jp)} ${t.jp}` })),
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
      if (term) {
        const hay = `${u.id} ${u.name} ${u.name_en || ""} ${u.ruby || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    return newest ? out.reverse() : out;
  }, [units, meta, q, showNpc, showDup, newest, rarityF, weaponF, regionF, traitF, categoryF, terrainF, kaiF]);

  if (loading || error) return <div className="page"><LoadState loading={loading} error={error} /></div>;

  const activeCount = rarityF.length + weaponF.length + regionF.length + traitF.length + categoryF.length + terrainF.length + kaiF.length;
  const activeParams = [...new Set(params.keys())].filter((k) => k !== "page" && params.get(k)).length;
  const pages = Math.ceil(filtered.length / PAGE);
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const onPage = (p: number) => setParam("page", p > 1 ? String(p - 1) : null);

  return (
    <div className="page">
      <ListToolbar
        search={<SearchBox value={q} onChange={(v) => setParam("q", v || null)} placeholder="Search id / name / reading" />}
        count={`${filtered.length.toLocaleString()} castle girls`}
        activeFilters={activeParams}
        onClearFilters={() => setParams(new URLSearchParams(), { replace: true })}
        actions={(
          <>
            <FilterChip active={newest} onClick={() => setParam("sort", newest ? null : "new")}>Newest first</FilterChip>
            <FilterChip active={showDup} onClick={() => setParam("dup", showDup ? null : "1")}>Transformed / twin entries</FilterChip>
            <FilterChip active={showNpc} onClick={() => setParam("npc", showNpc ? null : "1")}>Tokens / NPC / fodder</FilterChip>
          </>
        )}
      />

      <FilterPanel open={showFilters} onToggle={() => setShowFilters(!showFilters)} activeCount={activeCount} phoneOnly={false}>
        <CheckboxGroup title="Rarity" options={opts.rarity} selected={rarityF} onToggle={(v) => toggleCsv("rarity", rarityF, v)} />
        <CheckboxGroup
          title="Weapon"
          options={opts.weaponOther ? [...opts.weapon, { value: "other", label: "Other (collab)" }] : opts.weapon}
          selected={weaponF}
          onToggle={(v) => toggleCsv("weapon", weaponF, v)}
        />
        <CheckboxGroup title="Terrain" options={opts.terrain} selected={terrainF} onToggle={(v) => toggleCsv("terrain", terrainF, v)} />
        <CheckboxGroup title="Renovation" options={RENOVATION_OPTS} selected={kaiF} onToggle={(v) => toggleCsv("kai", kaiF, v)} />
        <CheckboxGroup title="Region" options={opts.region} selected={regionF} onToggle={(v) => toggleCsv("region", regionF, v)} />
        <CheckboxGroup title="Trait" options={opts.trait} selected={traitF} onToggle={(v) => toggleCsv("trait", traitF, v)} />
        <CheckboxGroup title="Category" options={opts.category} selected={categoryF} onToggle={(v) => toggleCsv("cat", categoryF, v)} />
      </FilterPanel>

      {traitF.length === 1 && meta?.traits[traitF[0]] && !meta.traits[traitF[0]].label && (
        <p className="muted small">{traitTitle(meta, Number(traitF[0]))}</p>
      )}

      <Pager page={page + 1} pages={pages} onPage={onPage} />
      {shown.length === 0 && <EmptyState title="No castle girls match these filters." hint="Change the search or clear the filters." />}

      <div className="unit-grid">
        {shown.map((u) => (
          <EntityTile
            key={u.id}
            href={`/units/${u.id}`}
            renderLink={renderLink}
            className="unit-tile"
            icon={u.face ? <img src={iconUrl(u.face)} alt="" width={60} height={60} loading="lazy" /> : <span className="icon-missing" />}
            title={unitName(u) || "(unnamed)"}
            subtitle={`${u.name_en ? `${u.name} · ` : ""}#${u.id} · ${rarityLabel(meta, u.rarity)} · ${weaponLabel(meta, u.weapon)}${u.terrain ? ` · ${terrainLabel(meta, u.terrain)}` : ""}${u.region ? ` · ${regionLabel(meta, u.region)}` : ""}`}
            badges={(u.traits?.length || u.dup_of || u.transform_of || u.npc || u.renovation === 2) ? (
              <>
                {u.renovation === 2 && <span className="hub-badge hub-badge--accent" title="Has a 改弐 (Kai Ni) renovation">Kai Ni</span>}
                {u.traits?.map((t) => <span key={t} className="hub-badge" title={traitTitle(meta, t)}>{traitLabel(meta, t)}</span>)}
                {u.dup_of && <span className="hub-badge hub-badge--warning">twin of #{u.dup_of}</span>}
                {u.transform_of && <span className="hub-badge hub-badge--accent">transformed #{u.transform_of}</span>}
                {u.npc && <span className="hub-badge">type {u.card_type}</span>}
              </>
            ) : undefined}
          />
        ))}
      </div>

      <Pager page={page + 1} pages={pages} onPage={onPage} />
    </div>
  );
}
