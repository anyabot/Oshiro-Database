// Equipment (武器): public/data/weapons.json from tools/export_weapons.py.
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import type { EffectDefs } from "./effects";
import type { RawRow } from "./types";

export interface WeaponSource {
  /** unit · drop · first_clear · achievement · login · login_beginner · mission · campaign · exchange · shop ·
   *  tower · vote · rental · pack · summon · summon_step · bead · evolution */
  kind: string;
  /** a date, title, condition text, score or level, by kind */
  detail?: string | number;
  quest?: number;
  card?: number;
  weapon?: number;
  /** strengthening level it comes with (+n) */
  plus?: number;
  count?: number;
  cost?: number;
  date?: string;
  until?: string;
  votes?: number;
}

export interface Weapon {
  id: number;
  name: string;
  /** English name (tools/translate_weapons.py), null where none */
  name_en?: string | null;
  type: number;
  rarity: number;
  /** its pixel-art sprite (public/weapon-dot/<dot>.webp) */
  dot?: number;
  /** Weapon.Type: 0 equipment, 1 initial / dedicated gear, 2 upgrade material (霊鋼石); 3 reward placeholder */
  kind: number;
  stats: Partial<Record<StatKey, number>>;
  text?: string | null;
  ability: RawRow[];
  evolution?: number;
  evolved_from?: number;
  special?: { castles: number[]; stats: Partial<Record<StatKey, number>>; ability: RawRow[] };
  sources: WeaponSource[];
  raw: RawRow;
}

export interface WeaponData { types: Record<string, string>; weapons: Weapon[] }

export type StatKey = "atk" | "speed" | "range" | "targets" | "def" | "block" | "hp" | "regen";
/** Stat corrections in display order; attack speed is a percentage (「攻撃速度+30%」 = 30). */
export const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "regen", "range", "speed", "targets", "block"];

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });
export const useWeapons = () => useJson<WeaponData>(loader, "weapons");

/** Source kinds grouped for the filter. */
export const SOURCE_GROUPS: { value: string; kinds: string[] }[] = [
  { value: "unit", kinds: ["unit"] },
  { value: "stage", kinds: ["drop", "first_clear", "achievement"] },
  { value: "exchange", kinds: ["exchange", "shop", "tower", "vote", "rental"] },
  { value: "pack", kinds: ["pack"] },
  { value: "summon", kinds: ["summon", "summon_step", "bead"] },
  { value: "login", kinds: ["login", "login_beginner", "mission", "campaign"] },
  { value: "evolution", kinds: ["evolution"] },
  { value: "none", kinds: [] },
];

export function sourceGroups(w: Weapon): string[] {
  if (!w.sources.length) return ["none"];
  return SOURCE_GROUPS.filter((g) => w.sources.some((s) => g.kinds.includes(s.kind))).map((g) => g.value);
}

/** WeaponAbility rows in Ability.atb's shape (like EnemyAbility rows, but each row keeps its AbilityType).
 *  A row whose UnitEffect is itself a trigger of the same kind (AbilityType 12 + UnitEffect type 12 =
 *  「被攻撃時」) is said once: the outer AbilityType becomes a plain passive. */
export function weaponAbilityRows(rows: RawRow[], defs: EffectDefs): RawRow[] {
  return rows.map((r) => {
    const ue = r.AbilityEffectType ? defs.unit_effect[String(r.AbilityEffectType)] : undefined;
    const at = Number(r.AbilityType ?? 1);
    const o: RawRow = { AbilityType: ue && ue[0] === at ? 1 : at };
    if (r.AbilityTargetType) o.AbilityTargetType = r.AbilityTargetType;
    if (r.AbilityAreaType) o.AbilityAreaType = r.AbilityAreaType;
    if (r.AbilityEffectType) o.UnitEffectID = r.AbilityEffectType;
    if (r.AbilityDetailType) o.AbilityTypeDetail = r.AbilityDetailType;
    if (r.AbilityDetailValue) o.AbilityEffectDetail = r.AbilityDetailValue;
    for (const k of ["EffectValue", "LimitValue", "EachGrowUp", "Passive", "DurationInMillis"]) if (r[k]) o[k] = r[k];
    return o;
  });
}

export const weaponDotUrl = (dot: number) => `${import.meta.env.BASE_URL}weapon-dot/${dot}.webp`;
export const weaponIconUrl = (type: number) => `${import.meta.env.BASE_URL}ui-icon/weapon/${type}.webp`;
