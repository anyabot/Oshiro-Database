// Shapes of the JSON written by tools/export_units.py.

export interface UnitIndexEntry {
  id: number;
  name: string;
  ruby: string | null;
  rarity: number;
  weapon: number | null;
  region: number | null;
  category: number;
  traits: number[] | null;
  cost: number | null;
  face: number | null;
  npc: boolean | null;
  dup_of: number | null;
  /** This entry is the card #N turns into while its stratagem is active. */
  transform_of: number | null;
  card_type: number;
  /** Card.GrowUpID: castle (terrain) type, InstallationCastleTypeLimit numbering. */
  terrain: number | null;
  /** Card.MaxRenovationCount: 0 none, 1 改壱, 2 改弐. */
  renovation: number;
}

export interface TraitInfo {
  /** Shared [prefix] of the carriers' names; null when they share none. */
  label: string | null;
  count: number;
  examples: string[];
}

export interface Meta {
  generated: string;
  source_md5: string | null;
  weapons: Record<string, string>;
  regions: Record<string, string>;
  rarities: Record<string, string>;
  categories: Record<string, string>;
  traits: Record<string, TraitInfo>;
  /** types: single-type names (1 平城 ...); parts: terrain word -> every type that includes it. */
  terrain?: { types: Record<string, string>; parts: Record<string, number[]> };
}

export type RawRow = Record<string, string | number>;

/** An on-defeat row's DefeatedFieldEffect and the Missile it fires (its Param1). */
export interface FieldLink {
  field_id: number;
  field: RawRow;
  missile: RawRow;
}

export interface Ability {
  id: number;
  name?: string;
  description?: string;
  effects?: RawRow[];
  /** Keyed by index into effects. */
  field_links?: Record<string, FieldLink>;
  missing?: boolean;
}

export interface EnchantEffect {
  id: number;
  row: RawRow;
  AllyEffectSetID?: RawRow[];
  OpponentEffectSetID?: RawRow[];
}

export interface Stratagem {
  id: number;
  name?: string;
  description?: string;
  ki?: number;
  cooldown?: number;
  stock?: number | null;
  guide?: string | null;
  raw?: RawRow;
  effect?: EnchantEffect;
  set_member?: boolean;
  /** The stratagem turns the unit into its transformed card. */
  transform?: boolean;
  /** GimmickType 2: the 伏兵 unit it places. */
  token?: { token_id: number; card_id: number; name: string; config: RawRow; ability?: Ability; general_ability?: Ability };
  /** GimmickType 3: the area effect it creates. */
  field?: FieldLink;
  missing?: boolean;
}

export interface SpecialAttack {
  id: number;
  raw?: RawRow;
  ability?: Ability;
  missing?: boolean;
}

export interface Form {
  tier: number;
  label: string;
  ability?: Ability;
  organized?: Ability;
  possessed?: Ability;
  always?: Ability;
  quest?: Ability;
  defeated?: Ability;
  stratagems?: Stratagem[];
  special_attack?: SpecialAttack;
}

export interface Potential {
  name: string;
  limit_break: number;
  description: string;
  raw: RawRow;
}

export interface SpecialAbility {
  id: number;
  name?: string;
  description?: string;
  ki?: number | null;
  duration?: number | null;
  reuse?: number | null;
  deploy_wait?: number | null;
  raw?: RawRow;
  sub_ability?: Ability;
  /** SwitchSubClass specials: [main weapon, sub-class weapon]. */
  switch?: [string | null, string | null];
  missing?: boolean;
}

export interface ClassBlock {
  class_id: number;
  weapon: { type: number | null; name: string | null };
  class_ability: Ability | null;
  class: RawRow;
}

export interface Transformed {
  id: number;
  name: string;
  main_class: ClassBlock | null;
  sub_class?: ClassBlock | null;
  ability?: Ability | null;
  general_ability?: Ability | null;
  special_ability?: SpecialAbility | null;
}

export interface UnitDetail {
  id: number;
  name: string;
  ruby: string | null;
  rarity: number;
  card_type: number;
  npc: boolean;
  dup_of: number | null;
  depends_on: number | null;
  category: number;
  region: number | null;
  /** Card.GrowUpID: castle (terrain) type. */
  terrain: number | null;
  traits: number[];
  face: number | null;
  skins: number[];
  weapon: { type: number | null; name: string | null; description: string; battle_description: string };
  class: RawRow | null;
  corrections: { hp: number; atk: number; def: number; regen: number };
  class_ability: Ability | null;
  potential: Potential[];
  sub_class: ClassBlock | null;
  forms: Form[];
  special_ability: SpecialAbility | null;
  transform_of: number | null;
  transform_into: Transformed | null;
  general_ability: Ability | null;
  before_attack: Ability | null;
  moving_attack: { id: number; raw?: RawRow; ability?: Ability; missing?: boolean } | null;
  one_time_reactive: RawRow | null;
  dedicated_weapon: { id: number; name: string; description: string } | null;
  max_renovation: number;
  voice_actor: string | null;
  flavor: string[];
  introduction: string | null;
  welcome: string | null;
  raw: RawRow;
}
