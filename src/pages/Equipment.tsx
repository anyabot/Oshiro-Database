import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckboxGroup, EmptyState, EntityTile, FilterChip, FilterPanel, ListToolbar, LoadState, Pager, SearchBox, routerLinks } from "@altterisk/game-hub";
import { useHubLabels, useT, type UiKey } from "../i18n";
import { SOURCE_GROUPS, sourceGroups, useWeapons, weaponIconUrl } from "../weapons";
import { useStatText, weaponTypeName } from "../weaponParts";

const PAGE = 60;
const renderLink = routerLinks(Link, "to");
const GROUP_LABEL: Record<string, UiKey> = {
  unit: "srcGroupUnit", stage: "srcGroupStage", exchange: "srcGroupExchange", pack: "srcGroupPack",
  summon: "srcGroupSummon", login: "srcGroupLogin", evolution: "srcGroupEvolution", none: "srcGroupNone",
};

/** Every weapon: search, filter by type / rarity / source, newest-first option. */
export default function Equipment() {
  const { data, loading, error } = useWeapons();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(true);
  const t = useT();
  const hub = useHubLabels();
  const statText = useStatText();

  const q = params.get("q") || "";
  const gear = params.get("gear") === "1";
  const newest = params.get("sort") === "new";
  const page = Number(params.get("page") || "0");
  const csv = (k: string) => (params.get(k) || "").split(",").filter(Boolean);
  const typeF = csv("type"), rarityF = csv("rarity"), srcF = csv("src");
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next, { replace: true });
  };
  const toggle = (k: string, list: string[], v: string) => setParam(k, (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(","));

  const opts = useMemo(() => {
    const ws = data?.weapons ?? [];
    const types = [...new Set(ws.filter((w) => w.kind === 0).map((w) => w.type))].sort((a, b) => a - b);
    return {
      type: [
        ...types.filter((x) => x <= 24).map((x) => ({
          value: String(x),
          label: <span className="opt-icon"><img src={weaponIconUrl(x)} alt="" width={24} height={24} loading="lazy" />{weaponTypeName(data, x)}</span>,
        })),
        ...(types.some((x) => x > 24) ? [{ value: "other", label: t("otherCollab") }] : []),
      ],
      rarity: [...new Set(ws.map((w) => w.rarity))].sort().map((r) => ({ value: String(r), label: `★${r}` })),
      src: SOURCE_GROUPS.map((g) => ({ value: g.value, label: t(GROUP_LABEL[g.value]) })),
    };
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = (data?.weapons ?? []).filter((w) => {
      if (!gear && w.kind !== 0 && !term) return false;
      if (typeF.length && !typeF.includes(String(w.type)) && !(typeF.includes("other") && w.type > 24)) return false;
      if (rarityF.length && !rarityF.includes(String(w.rarity))) return false;
      if (srcF.length && !sourceGroups(w).some((g) => srcF.includes(g))) return false;
      if (term && !`${w.id} ${w.name}`.toLowerCase().includes(term)) return false;
      return true;
    });
    return newest ? [...out].sort((a, b) => b.id - a.id) : out;
  }, [data, q, gear, newest, typeF.join(), rarityF.join(), srcF.join()]);

  if (!data) return <div className="page"><LoadState loading={loading} error={error} labels={hub.load} /></div>;
  const pages = Math.ceil(filtered.length / PAGE);
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const onPage = (p: number) => setParam("page", p > 1 ? String(p - 1) : null);
  const active = typeF.length + rarityF.length + srcF.length;

  return (
    <div className="page">
      <ListToolbar
        search={<SearchBox value={q} onChange={(v) => setParam("q", v || null)} placeholder={t("searchWeapons")} clearLabel={hub.clearSearch} />}
        count={t("nWeapons", { n: filtered.length.toLocaleString() })}
        activeFilters={[...new Set(params.keys())].filter((k) => k !== "page" && params.get(k)).length}
        onClearFilters={() => setParams(new URLSearchParams(), { replace: true })}
        labels={hub.toolbar}
        actions={(
          <>
            <FilterChip active={newest} onClick={() => setParam("sort", newest ? null : "new")}>{t("newestFirst")}</FilterChip>
            <FilterChip active={gear} onClick={() => setParam("gear", gear ? null : "1")}>{t("showGear")}</FilterChip>
          </>
        )}
      />
      <FilterPanel open={open} onToggle={() => setOpen(!open)} activeCount={active} phoneOnly={false} labels={hub.filters}>
        <CheckboxGroup title={t("weapon")} options={opts.type} selected={typeF} onToggle={(v) => toggle("type", typeF, v)} />
        <CheckboxGroup title={t("rarity")} options={opts.rarity} selected={rarityF} onToggle={(v) => toggle("rarity", rarityF, v)} />
        <CheckboxGroup title={t("obtain")} options={opts.src} selected={srcF} onToggle={(v) => toggle("src", srcF, v)} />
      </FilterPanel>
      <Pager page={page + 1} pages={pages} onPage={onPage} labels={hub.pager} />
      {shown.length === 0 && <EmptyState title={t("noMatchWeapons")} hint={t("noMatchHint")} />}
      <div className="unit-grid">
        {shown.map((w) => (
          <EntityTile
            key={w.id}
            href={`/equipment/${w.id}`}
            renderLink={renderLink}
            className="unit-tile"
            icon={<img src={weaponIconUrl(w.type)} alt="" width={52} height={52} loading="lazy" />}
            title={w.name || `#${w.id}`}
            subtitle={[`#${w.id}`, `★${w.rarity}`, weaponTypeName(data, w.type), ...statText(w.stats).slice(0, 3)].join(" · ")}
            badges={(
              <>
                {sourceGroups(w).map((g) => <span key={g} className={`hub-badge${g === "none" ? "" : " hub-badge--accent"}`}>{t(GROUP_LABEL[g])}</span>)}
                {w.special && <span className="hub-badge">{t("weaponSpecial")}</span>}
              </>
            )}
          />
        ))}
      </div>
      <Pager page={page + 1} pages={pages} onPage={onPage} labels={hub.pager} />
    </div>
  );
}
