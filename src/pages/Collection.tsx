import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BackupPanel, FallbackImage, FilterChip, FilterRow, ListToolbar, LoadState, PageHeader, ProgressBar, SearchBox } from "@altterisk/game-hub";
import { readFile, exportFile } from "@altterisk/game-hub/persist";
import { altName, iconUrl, nameOf, rarityLabel, tierName, useMeta, useUnits } from "../data";
import { collectible, decodeCollection, encodeCollection, useCollection, type Collection as Owned } from "../collection";
import { useUnitFilters } from "../unitFilters";
import { ScreenshotImport } from "../screenshotImport";
import { useHubLabels, useT } from "../i18n";
import type { UnitIndexEntry } from "../types";

const FILE_FORMAT = "oshiro-collection";

/** The viewer's castle girls: tap to mark owned, set the renovation reached; kept in this browser. */
export default function Collection() {
  const { data: index, loading, error } = useUnits();
  const { data: meta } = useMeta();
  const [coll, setColl] = useCollection();
  const [params, setParams] = useSearchParams();
  const t = useT();
  const hub = useHubLabels();
  const unitFilter = useUnitFilters(index ?? undefined, meta ?? undefined, params, setParams);

  const q = (params.get("q") || "").trim().toLowerCase();
  const show = params.get("show") || "";
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  // newest first within each rarity, highest rarity first
  const all = useMemo(() => (index || []).filter(collectible).sort((a, b) => b.rarity - a.rarity || b.id - a.id), [index]);
  const byId = useMemo(() => new Map(all.map((u) => [u.id, u])), [all]);
  const has = (u: UnitIndexEntry) => String(u.id) in coll;
  const visible = all.filter((u) =>
    unitFilter.matches(u)
    && (!q || [u.name, u.name_en ?? "", u.ruby ?? ""].some((x) => x.toLowerCase().includes(q)))
    && (show === "own" ? has(u) : show === "missing" ? !has(u) : true));

  const byRarity = useMemo(() => {
    const m = new Map<number, { n: number; own: number }>();
    for (const u of all) {
      const e = m.get(u.rarity) ?? { n: 0, own: 0 };
      e.n++;
      if (String(u.id) in coll) e.own++;
      m.set(u.rarity, e);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [all, coll]);

  if (!index) return <LoadState loading={loading} error={error} labels={hub.load} />;
  const ownedCount = all.filter(has).length;

  const toggle = (u: UnitIndexEntry) => setColl((c) => {
    const n = { ...c };
    // newly owned: at her highest renovation (most players renovate what they use); lower it on the tile
    if (String(u.id) in n) delete n[u.id]; else n[u.id] = u.renovation;
    return n;
  });
  const cycleTier = (u: UnitIndexEntry) => setColl((c) => ({ ...c, [u.id]: ((c[u.id] ?? 0) + 1) % (u.renovation + 1) }));
  const markShown = (own: boolean) => setColl((c) => {
    const n: Owned = { ...c };
    for (const u of visible) {
      if (own) n[u.id] = n[u.id] ?? u.renovation;
      else delete n[u.id];
    }
    return n;
  });
  const valid = new Set(all.map((u) => u.id));
  const load = (c: Owned | null) => {
    if (!c) return t("collBadCode");
    const kept = Object.fromEntries(Object.entries(c).filter(([id]) => valid.has(Number(id))));
    setColl(kept);
    return null;
  };

  return (
    <div className="page coll-page">
      <PageHeader title={t("collTitle")} subtitle={t("collSubtitle")} />
      <div className="coll-progress">
        <ProgressBar value={ownedCount} max={all.length} label={t("collOwned")} showCount />
        <div className="coll-rarities">
          {byRarity.map(([r, e]) => (
            <ProgressBar key={r} value={e.own} max={e.n} label={rarityLabel(meta ?? undefined, r)} showCount className="coll-rarity" />
          ))}
        </div>
      </div>
      <p className="small">{t("collUse")} <Link to="/team">{t("navTeam")}</Link></p>
      <ScreenshotImport byId={byId} coll={coll} setColl={setColl} />

      <ListToolbar
        search={<SearchBox value={params.get("q") || ""} onChange={(v) => set("q", v || null)} placeholder={t("searchUnits")} clearLabel={hub.clearSearch} />}
        count={t("collShown", { n: visible.length })}
      />
      <FilterRow label={t("collShow")}>
        <FilterChip active={!show} count={all.length} onClick={() => set("show", null)}>{t("all")}</FilterChip>
        <FilterChip active={show === "own"} count={ownedCount} onClick={() => set("show", "own")}>{t("collShowOwn")}</FilterChip>
        <FilterChip active={show === "missing"} count={all.length - ownedCount} onClick={() => set("show", "missing")}>{t("collShowMissing")}</FilterChip>
      </FilterRow>
      <div className="buff-unit-filters">{unitFilter.panel}</div>
      <div className="coll-bulk">
        <button className="hub-btn" onClick={() => markShown(true)}>{t("collMarkShown")}</button>
        <button className="hub-btn" onClick={() => { if (window.confirm(t("collUnmarkConfirm", { n: visible.filter(has).length }))) markShown(false); }}>{t("collUnmarkShown")}</button>
      </div>
      <p className="muted small">{t("collHint")}</p>

      <ul className="coll-grid">
        {visible.map((u) => {
          const own = has(u);
          const tier = coll[u.id] ?? 0;
          return (
            <li key={u.id} className={`coll-tile${own ? " is-own" : ""}`}>
              <button className="coll-tile__btn" onClick={() => toggle(u)} aria-pressed={own} title={`${nameOf(u)}${altName(u) ? ` · ${altName(u)}` : ""}`}>
                {u.face != null
                  ? <FallbackImage srcs={[iconUrl(u.face)]} alt="" width={64} height={64} loading="lazy" missingClassName="coll-noicon" />
                  : <span className="coll-noicon" />}
                <span className="coll-tile__name">{nameOf(u)}</span>
              </button>
              {own && u.renovation > 0 && (
                <button className={`coll-tier tier-${tier}`} onClick={() => cycleTier(u)} title={t("collTierHint")}>{tierName(tier)}</button>
              )}
            </li>
          );
        })}
      </ul>

      <BackupPanel
        code={encodeCollection(coll)}
        onImportCode={(code) => load(decodeCollection(code))}
        onExportFile={() => exportFile({ format: FILE_FORMAT, version: 1, data: { owned: coll }, fileName: "oshiro-collection.json" })}
        onImportFile={async (file) => {
          try {
            const { data } = await readFile(file, FILE_FORMAT, 1);
            const raw = data.owned;
            if (!raw || typeof raw !== "object") return t("collBadCode");
            return load(Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([k, v]) => /^\d+$/.test(k) && typeof v === "number").map(([k, v]) => [k, Math.max(0, Math.min(2, v as number))])));
          } catch {
            return t("collBadCode");
          }
        }}
        accept=".json"
        labels={{
          title: t("collBackup"), code: t("collCode"), copy: t("collCopy"), copied: t("collCopied"), pasteCode: t("collPaste"),
          importCode: t("collImportCode"), exportFile: t("collExportFile"), importFile: t("collImportFile"), imported: t("collImported"),
        }}
      />
    </div>
  );
}
