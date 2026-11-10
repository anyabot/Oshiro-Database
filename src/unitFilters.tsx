// The castle girl list's filters (rarity, weapon, region, trait, category, terrain, renovation) as a
// reusable piece: options, a match test and the panel. State lives in URL params under a prefix.
import { useMemo, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { CheckboxGroup, FilterPanel } from "@altterisk/game-hub";
import {
  TERRAINS, categoryLabel, isMainWeapon, rarityLabel, regionLabel, terrainParts, terrainWord, traitLabel,
  weaponLabel,
} from "./data";
import type { Meta, UnitIndexEntry } from "./types";

const RENOVATION_OPTS = [
  { value: "2", label: "Kai Ni 改弐" },
  { value: "1", label: "Kai 改壱 (no Kai Ni)" },
  { value: "0", label: "No renovation" },
];

const KEYS = ["rarity", "weapon", "region", "trait", "cat", "terrain", "kai"] as const;

export function useUnitFilters(units: UnitIndexEntry[] | undefined, meta: Meta | undefined,
  params: URLSearchParams, setParams: SetURLSearchParams, prefix = "f") {
  const [open, setOpen] = useState(false);
  const csv = (k: string) => (params.get(prefix + k) || "").split(",").filter(Boolean);
  const sel = Object.fromEntries(KEYS.map((k) => [k, csv(k)])) as Record<(typeof KEYS)[number], string[]>;
  const toggle = (k: (typeof KEYS)[number], v: string) => {
    const list = sel[k];
    const next = new URLSearchParams(params);
    const val = (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",");
    if (val) next.set(prefix + k, val); else next.delete(prefix + k);
    setParams(next, { replace: true });
  };
  const clear = () => {
    const next = new URLSearchParams(params);
    for (const k of KEYS) next.delete(prefix + k);
    setParams(next, { replace: true });
  };

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
      weapon: [...sorted(wep).filter(isMainWeapon).map((v) => ({ value: String(v), label: weaponLabel(meta, v) })),
        ...(sorted(wep).some((w) => !isMainWeapon(w)) ? [{ value: "other", label: "Other (collab)" }] : [])],
      region: sorted(reg).map((v) => ({ value: String(v), label: regionLabel(meta, v) })),
      trait: sorted(tr).map((v) => ({ value: String(v), label: traitLabel(meta, v) })),
      cat: sorted(cat).map((v) => ({ value: String(v), label: categoryLabel(meta, v) })),
      terrain: TERRAINS.filter((t) => (units || []).some((u) => !u.npc && terrainParts(meta, u.terrain).includes(t)))
        .map((t) => ({ value: t.slug, label: `${terrainWord(t.jp)} ${t.jp}` })),
    };
  }, [units, meta]);

  const key = KEYS.map((k) => sel[k].join(",")).join("|");
  const matches = useMemo(() => {
    const has = (list: string[], v: number | null | undefined) => v != null && list.includes(String(v));
    return (u: UnitIndexEntry | undefined): boolean => {
      if (!u) return !key.replace(/\|/g, "");
      if (sel.rarity.length && !has(sel.rarity, u.rarity)) return false;
      if (sel.weapon.length) {
        const other = sel.weapon.includes("other") && u.weapon != null && !isMainWeapon(u.weapon);
        if (!other && !has(sel.weapon, u.weapon)) return false;
      }
      if (sel.region.length && !has(sel.region, u.region)) return false;
      if (sel.trait.length && !(u.traits || []).some((t) => sel.trait.includes(String(t)))) return false;
      if (sel.cat.length && !has(sel.cat, u.category)) return false;
      // a dual-terrain castle (平/水城) matches each of its terrains, like the game's "平を含む城"
      if (sel.terrain.length && !terrainParts(meta, u.terrain).some((t) => sel.terrain.includes(t.slug))) return false;
      if (sel.kai.length && !has(sel.kai, u.renovation)) return false;
      return true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, meta]);

  const activeCount = KEYS.reduce((n, k) => n + sel[k].length, 0);
  const panel = (
    <FilterPanel open={open || activeCount > 0} onToggle={() => setOpen(!open)} activeCount={activeCount} phoneOnly={false}>
      <CheckboxGroup title="Rarity" options={opts.rarity} selected={sel.rarity} onToggle={(v) => toggle("rarity", v)} />
      <CheckboxGroup title="Weapon" options={opts.weapon} selected={sel.weapon} onToggle={(v) => toggle("weapon", v)} />
      <CheckboxGroup title="Terrain" options={opts.terrain} selected={sel.terrain} onToggle={(v) => toggle("terrain", v)} />
      <CheckboxGroup title="Region" options={opts.region} selected={sel.region} onToggle={(v) => toggle("region", v)} />
      <CheckboxGroup title="Category" options={opts.cat} selected={sel.cat} onToggle={(v) => toggle("cat", v)} />
      <CheckboxGroup title="Renovation" options={RENOVATION_OPTS} selected={sel.kai} onToggle={(v) => toggle("kai", v)} />
      <CheckboxGroup title="Trait" options={opts.trait} selected={sel.trait} onToggle={(v) => toggle("trait", v)} />
      {activeCount > 0 && <button className="hub-btn" onClick={clear}>Clear castle girl filters</button>}
    </FilterPanel>
  );
  return { matches, panel, activeCount };
}
