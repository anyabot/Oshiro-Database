// Readable effect rows, built only from game data:
//   smt     StatusModifierType.atb: each modifier code = stat + increase/decrease/set + value type
//   labels  the game's own wording for each code, mined from ability descriptions
//           (tools/mine_effects.py): word, direction (上昇/低下…), unit (%/倍) and how
//           the printed number relates to the stored one. Mined words are marked "?".
import { createJsonLoader, useJson } from "@altterisk/game-hub/data";
import { JP_EN, tagEN } from "./labels";
import type { FieldLink, RawRow } from "./types";

export interface MinedLabel {
  jp: string; n: number; of: number; ex: string[];
  /** "exe": defined by the game's code + name tables, not mined from text. */
  src?: string;
  dir?: "+" | "-"; unit?: string; form?: "raw" | "add" | "mul" | "milli";
}
export interface EffectDefs {
  smt: Record<string, [number, number, number, number, number]>;
  attack_bonus: Record<string, RawRow>;
  unit_effect: Record<string, [number, number]>;
  /** DealDamageEffect / OnTakeDamageEffect / OnGiveDamageEffect / ImmunityEffect rows by id. */
  effect_tables: Record<string, Record<string, RawRow>>;
  /** Missile.atb status modifiers: [code, value, millis] per slot. */
  missiles: Record<string, [number, number, number][]>;
  /** Missile.atb DamageRepeatNum + RepeatDamageDelayMillis (repeat hits after the first). */
  missile_repeat?: Record<string, [number, number]>;
  /** Missile.atb CrowdControlType + DurationInMillis1. */
  missile_cc?: Record<string, [number, number]>;
  /** EnchantTargetSet.atb: set id -> its 発動対象 target codes. */
  target_sets?: Record<string, number[]>;
  /** Quest.atb Type -> example quest names. */
  quest_types?: Record<string, string[]>;
  /** AbilityText names of the abilities class ability 6/7 activates. */
  ability_names?: Record<string, string>;
  labels: Record<string, MinedLabel>;
}

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });
export const useEffectDefs = () => useJson<EffectDefs>(loader, "effects");

/** Which table a row came from; decides which code vocabulary its fields use. */
export type RowKind = "ability" | "organized" | "always" | "quest" | "potential" | "enchant" | "enchant_set" | "other";

export interface Sentence {
  /** Plain sentences, one per effect on the row. */
  text: string[];
  /** Evidence for every mined word used ("" when the row uses none). */
  evidence: string[];
  /** Fields the sentences did not use. */
  rest: RawRow;
  /** The stat changes in the sentences, for the buff ranking (scripts/buffs.ts). */
  facts: BuffFact[];
}

/** One stat change a row makes, as the sentence states it. */
export interface BuffFact {
  /** "status:<StatusType>", or "dmg:dealt" / "dmg:taken" (OnGiveDamage / OnTakeDamage %). */
  key: string;
  dir: "+" | "-";
  /** "%", "" (flat), "s" (seconds), "×" (the descriptions print it as a multiplier; v is then the multiplier) */
  unit: string;
  v: number;
  /** LimitValue of a growing or per-count row: the most it reaches. */
  max?: number;
  stack?: string;
  /** Who receives it ("Castle girls in range", "Self", "Enemies"…). */
  who: string;
  side: "ally" | "enemy";
  /** Index of the sentence in text. */
  line: number;
  /** Conditions, duration, chance… (the sentence's tail). */
  note?: string;
}

// Which side a target name is on: the game's own target names (ability / formation target labels).
// Ally names say 城娘 / 味方 / 自身 / 伏兵 / トークン / 舟 / 蔵 or name a castle type (…城); the rest
// are enemy types (敵, 兜, 妖怪, 魔物, enemy sets).
export function sideOfTarget(jp: string | undefined): "ally" | "enemy" {
  if (!jp) return "ally";
  if (/敵/.test(jp)) return "enemy";
  return /城娘|味方|自身|伏兵|トークン|舟|蔵|城$|^\[/.test(jp) ? "ally" : "enemy";
}

// StatusModifierType.ValueType: 4 = % that stacks with same-kind effects (its descriptions say
// 効果重複 / 同種効果と重複; the plain % type 2 almost never does), 2 = plain %, 1 = flat.
// The game's own item texts print ValueType 4/5 modifiers with "(重複可)" (stackable) and plain
// % modifiers (2/3) without it (Artifact/Supply effect descriptions).
// Proven in the exe (FUN_00549240 sorts entries, FUN_00547bc0 applies them): plain % (ValueType 2)
// increases/decreases of one status keep only the strongest increase and the strongest decrease;
// ValueType 3/4/5 entries are summed. Flat values (1) are summed too, except for the statuses in
// FLAT_MAX_STATUS, which also keep only the strongest.
const STACKING: Record<number, string> = { 4: "stacks", 5: "stacks", 3: "stacks", 2: "doesn't stack" };
const FLAT_MAX_STATUS = new Set([105, 106, 108, 111, 113, 203, 210, 211, 212, 213, 214, 215, 216, 219, 220, 223,
  10107, 10201, 10206, 10405, 10452, 10454]);


// switches in those rows, worded from the game's own column names
const EFFECT_FLAGS: Record<string, string> = {
  PhysicalDamage: "physical", MagicDamage: "magic", TrueDamage: "true damage",
  MeleeAttack: "melee", RangedAttack: "ranged", AmbushAttack: "ambush units",
  AntiAir: "vs air", AntiSpecter: "vs specters", AntiDemon: "vs demons",
  IgnoreGiveDamage: "ignores damage-dealt modifiers", IgnoreTakeDamage: "ignores damage-taken modifiers",
  IgnoreAttackBonus: "ignores attack bonuses", IgnoreImmuneToDamageForEnemyGimmick: "ignores enemy damage immunity",
  MinDamage: "min damage",
};

// a row that lists every damage kind (物理/術/貫通) and both melee and ranged applies to all damage
const DAMAGE_KINDS = ["PhysicalDamage", "MagicDamage", "TrueDamage"];
const ATTACK_KINDS = ["MeleeAttack", "RangedAttack"];
/** The row's switches as words, leaving out complete sets (= no restriction). */
function restriction(row: RawRow): string[] {
  const all = (ks: string[]) => ks.every((k) => row[k]);
  return Object.keys(EFFECT_FLAGS).filter((k) => row[k])
    .filter((k) => !(DAMAGE_KINDS.includes(k) && all(DAMAGE_KINDS)) && !(ATTACK_KINDS.includes(k) && all(ATTACK_KINDS)))
    .map((k) => EFFECT_FLAGS[k]);
}

/** One DealDamage / OnTakeDamage / OnGiveDamage / Immunity row as text. */
function effectRow(table: string, row: RawRow, v: number, modifierText: (code: number, val: number) => string,
  ccName: (cc: number) => string = (cc) => `crowd control ${cc}`): string {
  const on = restriction(row);
  const ms = (k: string) => (typeof row[k] === "number" ? (row[k] as number) / 1000 : 0);
  const extra: string[] = [];
  if (ms("IntervalInMillis")) extra.push(`every ${ms("IntervalInMillis")}s`);
  if (row.CrowdControl) extra.push(`inflicts ${ccName(Number(row.CrowdControl))}${ms("CrowdControlDurationInMillis") ? ` for ${ms("CrowdControlDurationInMillis")}s` : ""}`);
  if (row.MissileID) extra.push(`missile #${row.MissileID}`);
  if (row.WeaponTypeTrigger) extra.push(`weapon type ${row.WeaponTypeTrigger}`);
  const tags = [...on, ...extra].join(", ");
  switch (table) {
    case "DealDamageEffect": {
      // FUN_00564cb0 registers type 1 -> FUN_00563700 (hit kind 11: independent damage, ATK clamped to the
      // global limits) and type 2 -> FUN_005638c0 (hit kind 4: an attack carrying the source's status set).
      // FUN_00564f20 picks the base by ValueType (1 ATK, 2 flat, 3 current HP, 4 max HP); FUN_00aedf40:
      // damage = value x base / 100, at least MinDamage. Type 1 reads HP from the unit hit, type 2 from the source.
      const own = row.DealDamageEffectType === 2;
      const base: Record<number, string> = {
        1: "ATK", 3: own ? "own current HP" : "the target's current HP", 4: own ? "own max HP" : "the target's max HP",
      };
      const vt = Number(row.ValueType);
      const amount = vt === 2 ? `${v}` : base[vt] ? `${fmt(v / 100)}× ${base[vt]}` : `${v} (value type ${vt})`;
      const kind = own ? "damage" : "independent damage";
      return `${kind} ${amount}${tags ? ` (${tags})` : ""}`;
    }
    case "OnTakeDamageEffect": {
      // OTD handlers FUN_00aee7f0..00aeea80 (struct[0] = type, [1] = ValueType: 2 flat, else %)
      const flat = row.ValueType === 2;
      const from = tags ? ` (from ${tags})` : "";
      switch (row.OTDEffectType) {
        case 1: return `when attacked${from}: counter for ${flat ? v : `${v}% of own ATK`}`;
        case 2: return `when attacked${from}: ${flat ? v : `${v}% of the damage taken`}`;
        // the game's items call this 障壁 (barrier): Supply 800 '殿障壁+3000'
        case 3: return `barrier${from}: blocks ${flat ? `up to ${v}` : `${v}%`} of the damage`;
        case 5: return `when attacked${from}: damage split into hits of ${v}`;
        case 6: return `damage taken${from} ${flat ? `−${v}` : `−${v}%`}`;
        case 7: return `damage taken${from} ${flat ? `+${v}` : `+${v}%`}`;
        // 8-11 named from the AbilityType 3 rows that build them (FUN_00af72f0 -> FUN_00aee620(type, VT)):
        // 8 殿/蔵へのダメージを代わりに受ける, 9 攻撃を受ける度に耐久が1のみ減少, 10 攻撃を回避, 11 N以下のダメージを無効化
        case 8: return `damage aimed at them is taken by this unit instead${from}`;
        case 9: return `each hit${from} takes only 1 HP (value ${v})`;
        case 10: return `evades attacks${from}`;
        case 11: return `hits${from} of ${v} damage or less are nullified`;
      }
      return `when taking damage: effect type ${row.OTDEffectType} ${v} (value type ${row.ValueType}${tags ? `; from ${tags}` : ""})`;
    }
    case "OnGiveDamageEffect": {
      // OGD handlers FUN_00af2370 (type 1: +) / FUN_00af23b0 (type 2: −); ValueType 2 flat, else %
      const unit = row.ValueType === 2 ? "" : "%";
      const on = tags ? ` (${tags})` : "";
      if (row.OGDEffectType === 1) return `damage dealt${on} +${v}${unit}`;
      if (row.OGDEffectType === 2) return `damage dealt${on} −${v}${unit}`;
      return `when dealing damage: effect type ${row.OGDEffectType} ${v} (value type ${row.ValueType}${tags ? `; ${tags}` : ""})`;
    }
    case "ImmunityEffect":
      return `immune to ${modifierText(Number(row.StatusModifierID ?? 0), Number(row.ImmunityValue ?? 0))}`
        + (row.ConditionOperator ? ` (condition op${row.ConditionOperator} ${row.ConditionValue ?? 0})` : "");
  }
  return `${table} ${v}`;
}

// UnitEffect.UnitEffectType -> the table its ActualEffectID is always found in
// Type 8 ids are OnGiveDamageEffect rows: their texts give the OGD row's amount and direction
// (5001 -> OGD 11 type 1, v 50 = 与ダメージ1.5倍; 5002 -> OGD 13 type 2, v 60 = 与ダメージ60%低下).
// Type 22 ids are AttackBonusStatusEffect rows (209 of 209; see attackBonus in describeRow).
const UNIT_EFFECT_TABLE: Record<number, string> = {
  3: "OnTakeDamageEffect",
  7: "ImmunityEffect",
  8: "OnGiveDamageEffect",
  9: "DealDamageEffect",
};

// Ability condition kinds (AbilityTypeDetail of types 1, 2, 10-19, 23): FUN_00548d20 turns EffectValue v
// into the amount from counters FUN_0054a110 keeps; d = AbilityEffectDetail. "×count" kinds are capped
// at LimitValue. Counters: 2 = units in range whose side is in the hostile-side list (FUN_00551bd0),
// 6 = castle girls in range other than self, 7 = same-side non-building units in range (FUN_00551c00),
// 5 = the unit's own counter +0x88c0, 9 = stage from FUN_004fab60 (rows 1..9 under one head),
// 10 = units in range by Tokusei id d, 11/12 = BlockCount (status 303), 14 = counter +0x7c,
// 17/18 = the unit's own ambush (伏兵) map. Kinds with no rows in the data stay unworded.
const per = (what: string, d: number) => (d > 1 ? `per ${d} ${what}` : `per ${what}`);
const CONDITION: Record<number, (d: number, trait: (id: number) => string) => string> = {
  2: () => "per enemy in range",
  5: (d) => per("times this unit was knocked out (大破)", d),
  6: () => "per other castle girl in range",
  7: () => "per ally in range",
  9: (d) => `at giantification stage ${d}`,
  10: (d, trait) => `per ${trait(d)} unit in range`,
  11: (d) => `while blocking ≥ ${d}`,
  12: (d) => `while blocking ≤ ${d}`,
  14: (d) => per("knockouts (大破) in the formation", d),
  17: (d) => per("own ambush unit (伏兵) deployed", d),
  18: (d) => per("own ambush unit (伏兵) deployed", d),
};

// Class abilities (AbilityType 6): FUN_00af82e0 -> registry FUN_0056d460, detail N -> handler object
// 0xd437e0 - 8N (vtable 0xc641d0 + 0x10(N-1); slot 2 applies, slot 3 removes). v = EffectValue,
// d = AbilityEffectDetail. Movement handlers set one bit of the unit flag word +0x88ac, the move
// mode +0x88d0 = d, and FUN_00511340(v) the move speed (100 airships, 1500 "高速", 99999 teleport).
// FUN_004afcd0 gates tiles per bit: bit 0 -> tiles {4, 1}, bit 1 -> {5, 1}, bit 2 -> {4, 5, 1},
// bit 3 -> tile 9 only, bit 4 -> all but 10. Tile 9 = 水上 (AbilityLocationType 9), 4 = 近接マス
// (bit 0's only users carry 近接武器種 weapons: 戦棍, 刀), 5 = 遠隔マス; bit 2 = "遠近マス移動可能".
const moveSpeed = (v: number) => (v >= 99999 ? "instant (teleport)" : String(v));
// Motion slots (FUN_004305c0 keys): 1 attack, 2 stand, 3 walk. Move mode (+0x88d0, FUN_005124b0): 3/4/7 move
// with the walk slot (FUN_004fc130), 2/6/9 with the stand slot (FUN_004fc0a0); mode 4 takes 歩き2 and mode 9
// 立ち2 when the weapon has that flag (Weapon.atb bytes +0x9d / +0x9c via FUN_0057daa0 / FUN_0057da20).
const MOVE_MODE: Record<number, string> = {
  2: "moves in its stand pose", 3: "walks", 4: "walks with its 歩き2 (walk2) motion", 6: "moves in its stand pose",
  7: "walks", 9: "moves in its 立ち2 (stand2) pose",
};
const moveMode = (d: number) => (d ? `, ${MOVE_MODE[d] ?? `move mode ${d}`}` : "");
const CLASS_ABILITY: Record<number, (v: number, d: number) => string> = {
  // the registry FUN_0056d460 holds details 1-23 only: a detail-0 row matches no handler
  0: (v) => `no effect (class-ability detail 0 has no handler; value ${v})`,
  // FUN_0056c3c0 -> weapon attack strategy; values are the AttackStrategyID (攻撃方法) set: 101-106, 1101
  3: (v) => `attack method (攻撃方法) → #${v}`,
  // FUN_00507960 -> visitor slot 0x58; values are BattleCharaTextureInfo ids ("…クラス特技モーション")
  6: (v) => `battle motion set → #${v} (its attack animation sets the hit count)`,
  // bit 3 of +0x88ac (FUN_00511250)
  9: (v, d) => `can move on water tiles (水上), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // bit 4 (FUN_00511190)
  12: (v, d) => `can move on all tiles, move speed ${moveSpeed(v)}${moveMode(d)}`,
  // FUN_0050fa90 -> command (1, v, d) skipped for unit kinds 1/5/6/7/8; every v in the data is an AbilityID
  // (2102 気還元率上昇【全城娘】・弐 on 陣貝クラス特技, 99165 雷槍斉射, ...); d = 1 or 2 (meaning not traced)
  7: (v, d) => `activates ability #${v}${d ? ` (mode ${d})` : ""}`,
  // the ability named 戦車搭乗ボイス再生用 ("for playing the tank-boarding voice") is a single 6/8 row
  8: (v, d) => `plays voice (ボイス再生) #${v}${d ? ` (mode ${d})` : ""}`,
  // FUN_0056c560: stand-motion slot 2 from motion variant v; v 9 = 立ち2 when the weapon has 立ち2モーションフラグ
  10: (v) => `stand motion → variant ${v}${v === 9 ? " (立ち2 / stand2)" : ""}`,
  // FUN_0056c330: attack-motion slot 1 from variant v; v 8 = 攻撃2 when the weapon has 攻撃2モーションフラグ
  11: (v) => `attack motion → variant ${v}${v === 8 ? " (攻撃2 / attack2)" : ""}`,
  // bit 12 (FUN_00511480), tested with bit 3 by the placement checks FUN_00559d80 / FUN_00579d50
  13: () => "can be deployed on boat tiles (舟マス配置可能)",
  // FUN_0050fbd0 / FUN_0050fd20: attaches effect id v to the unit's sprite
  14: (v) => `visual effect #${v}`,
  15: (v) => `visual effect #${v}`,
  // bit 0 (FUN_005111f0)
  16: (v, d) => `can move on melee tiles (近接マス), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // bit 1 (FUN_00511220)
  17: (v, d) => `can move on ranged tiles (遠隔マス), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // bit 2 (FUN_005111c0)
  18: (v, d) => `can move on melee and ranged tiles (遠近マス), move speed ${moveSpeed(v)}${moveMode(d)}`,
  // +0x8918 / +0x891c / +0x8920; values n+1 / n / n+2 follow MovingAttack's 移動中 / 移動前 / 移動後 ids
  19: (v) => `walking motion (移動中モーション) → #${v}`,
  20: (v) => `walk-start motion (移動前モーション) → #${v}`,
  21: (v) => `walk-end motion (移動後モーション) → #${v}`,
};

// EnchantTargetSet (発動対象) codes -> the ability target registry code with the same meaning. Fitted to
// every set's own "(…が対象)" text: 100/200 = 近接/遠隔城娘 (ability 12/13); 101-113 = melee weapons in
// ability 301-313 order (111 = 軍船: "軍船と大砲城娘が対象"); 201-211 = ranged weapons in ability 400-410
// order (202 = 石弓, 204 = 大砲); 401-414 = regions (set 601 skips 412/413 = "海外・その他以外");
// 1100-1106 = ★1-★7 (set 504 = 1100-1103 = "元が★4以下"); 2, 31 and 8xx are the ability codes.
function enchantTarget(t: number): number {
  if (t === 100) return 12;
  if (t === 200) return 13;
  if (t > 100 && t < 200) return t + 200;
  if (t > 200 && t < 300) return t + 199;
  if (t > 400 && t < 500) return t + 200;
  if (t >= 1100 && t < 1110) return t + 4000;
  return t;
}

// what one trigger of a growing (kind 3) row is, per AbilityType: the event each handler re-applies on
// (2 攻撃した敵, 11 攻撃する度に, 12 攻撃を受ける度に, 13 敵を撃破する度に)
const STEP_NOUN: Record<number, [string, string]> = {
  2: ["hit", "hits"], 11: ["attack", "attacks"], 12: ["time it is attacked", "times it is attacked"], 13: ["kill", "kills"],
};

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Ability.atb continuation rows (AbilityID 0) carry AbilityType 0: they belong to the row above and run
// under its AbilityType/AbilityTypeDetail (e.g. kind 9 rows 1..9 under one head row, one per giant stage)
// A row with its own AbilityType but no AbilityTargetType / AbilityAreaType continues the clause above
// it too: 「射程内の敵の攻撃が50、防御が20、射程と攻撃速度と与ダメージが5%低下」 is one targeted row
// followed by four untargeted ones (51 such rows; each one's text gives the subject of the row above).
/** For each row of one ability, the row(s) it continues (undefined when it needs nothing): the head
 *  row's AbilityType/AbilityTypeDetail, and the last targeted row's target/area. */
export function rowBases(rows: RawRow[]): (RawRow | undefined)[] {
  let head: RawRow | undefined;
  let aim: RawRow | undefined;
  return rows.map((r) => {
    const targeted = !!(r.AbilityTargetType || r.AbilityAreaType);
    let base: RawRow | undefined;
    if (r.AbilityType) head = r;
    else if (head) base = { ...head };
    if (!targeted && aim) {
      base = { ...(base ?? {}), AbilityTargetType: aim.AbilityTargetType ?? 0, AbilityAreaType: aim.AbilityAreaType ?? 0 };
    }
    if (targeted) aim = r;
    return base;
  });
}

/** Where a row sits: selfOnly = a stratagem whose EnchantEffect.TargetType is 自分のみ (its target is its user). */
export interface RowContext { selfOnly?: boolean }

export function describeRow(r0: RawRow, kind: RowKind, defs: EffectDefs, link?: FieldLink, base?: RawRow, ctx: RowContext = {}): Sentence {
  const used = new Set<string>();
  // a continuation row takes its type/kind from the head row, and target/area too when it has none
  const r: RawRow = { ...r0 };
  if (base) {
    if (!r0.AbilityType && base.AbilityType) {
      r.AbilityType = base.AbilityType;
      if (base.AbilityTypeDetail) r.AbilityTypeDetail = base.AbilityTypeDetail;
    }
    if (!r0.AbilityTargetType && !r0.AbilityAreaType) {
      if (base.AbilityTargetType) r.AbilityTargetType = base.AbilityTargetType;
      if (base.AbilityAreaType) r.AbilityAreaType = base.AbilityAreaType;
    }
  }
  const num = (k: string) => { used.add(k); return typeof r[k] === "number" ? (r[k] as number) : 0; };
  const evidence: string[] = [];
  const facts: BuffFact[] = [];
  // the last stat change modifier() worded; take() files it under the sentence about to be pushed
  let last: Omit<BuffFact, "who" | "side" | "line"> | null = null;
  const take = (who: string, side: "ally" | "enemy", note = "") => {
    // a change can carry its own condition (attack bonus: "while own ATK ≥ 10000"); it leads the note
    const n = [last?.note, note.replace(/^, /, "")].filter(Boolean).join(", ");
    if (last) facts.push({ ...last, who, side, line: text.length, ...(rowMax ? { max: rowMax } : {}), ...(n ? { note: n } : { note: undefined }) });
    last = null;
  };
  const damageFact = (which: "dealt" | "taken", dir: "+" | "-", unit: string, v: number) => {
    last = { key: `dmg:${which}`, dir, unit, v };
  };
  /** A change worded only by a mined label (effect / ability type codes): ranked under that label. */
  const labelFact = (key: string, v: number) => {
    const l = defs.labels[key];
    last = l ? { key, dir: l.dir ?? "+", unit: l.unit === "%" ? "%" : l.unit === "秒" ? "s" : l.unit === "倍" ? "×" : "",
      v: l.unit === "秒" && l.form === "milli" ? v / 1000
        : l.unit === "倍" ? (l.form === "mul" ? v / 100 : l.dir === "-" ? 1 - v / 100 : 1 + v / 100) : v } : null;
  };

  /** English for a mined code, or the raw code when there is no label. */
  const word = (key: string, fallback: string): string => {
    const l = defs.labels[key];
    if (!l) return fallback;
    if (l.src !== "exe" && l.src !== "item") evidence.push(`${key} = 「${l.jp}」 (${l.n}/${l.of} clauses${l.ex[0] ? `, e.g. ${l.ex[0]}` : ""})`);
    return JP_EN[l.jp] ?? tagEN(l.jp) ?? l.jp;
  };

  /** Amount printed the way the game's descriptions print this code. */
  const amountFor = (key: string, v: number): string => {
    const l = defs.labels[key];
    const sign = l?.dir === "-" ? "−" : l?.dir === "+" ? "+" : "";
    if (l?.unit === "倍" && l.form === "add") return `×${fmt(1 + v / 100)}`;
    if (l?.unit === "倍" && l.form === "mul") return `×${fmt(v / 100)}`;
    if (l?.unit === "%") return `${sign}${v}%`;
    if (l?.unit === "秒") return `${sign}${l.form === "milli" ? fmt(v / 1000) : v}s`;
    return `${sign}${v}`;
  };

  /** "ATK +20%, doesn't stack" from a StatusModifierType code. */
  const modifier = (code: number, v: number): string => {
    last = null;
    const d = defs.smt[code];
    if (!d) return `modifier ${code} ${v}`;
    const [status, expr, vt, ref, refSender] = d;
    if (status === 201) {
      // StatusType 201 holds bit flags in the value; bits are named only where their texts agree
      const names: string[] = [];
      for (let b = 1; b <= v; b <<= 1) if (v & b) names.push(defs.labels[`flag:${b}`] ? word(`flag:${b}`, "") : `flag ${b}`);
      const how = expr === 4 ? "add" : expr === 5 ? "remove" : expr === 3 ? "set" : `expr${expr}`;
      return `attack properties (${how}): ${names.join(", ")}`;
    }
    const stat = word(`status:${status}`, `stat ${status}`);
    // value kinds the exe defines: on/off states and bitmasks (data/status_types_exe.json)
    const kind = defs.labels[`statuskind:${status}`]?.jp;
    if (kind === "bool") return expr === 3 ? `${stat}: ${v > 0 ? "on" : "off"}` : `${stat} ${expr === 2 ? "−" : "+"}${v}`;
    if (kind === "bitmask") {
      // bits that the exe maps to crowd-control (状態異常) types (FUN_00acea70)
      const types: string[] = [];
      let rest = v;
      for (let b = 1; b <= v; b <<= 1) {
        const l = defs.labels[`ccbit:${b}`];
        if (v & b && l) { types.push(l.jp); rest &= ~b; }
      }
      // status 319: bits are Weather.atb ids (bit = 1 << (id-1))
      const weathers: string[] = [];
      let wrest = v;
      for (let b = 1; b <= v; b <<= 1) {
        const l = defs.labels[`weatherbit:${b}`];
        if (v & b && l && status === 319) { weathers.push(l.jp); wrest &= ~b; }
      }
      // status 225: attack-attribute bits = EnemyWeakAttribute.atb column order (炎 2, 雷 16, ...)
      if (status === 225) {
        const attrs: string[] = [];
        for (let b = 1; b <= v; b <<= 1) if (v & b) attrs.push(defs.labels[`attrbit:${b}`] ? word(`attrbit:${b}`, "") : `bit ${b}`);
        return `${stat}${expr === 5 ? " removed" : expr === 3 ? " set to" : ""}: ${attrs.join(", ")}`;
      }
      if (status === 319 && v === 0xffff) return `${stat}: all weather`;
      if (weathers.length && !wrest) return `${stat}${expr === 5 ? " removed" : ""}: ${weathers.join(", ")}`;
      if (types.length && !rest) {
        // ExpressionType 4 = OR (gains), 5 = AND-NOT (loses), 3 = set (FUN_00ae7c20)
        const how = expr === 5 || expr === 2 ? "loses" : expr === 3 ? "set to" : "gains";
        return `${stat}: ${how} ${types.map((t) => JP_EN[t] ?? t).join(", ")}`;
      }
      return `${stat} ${expr === 3 ? "=" : expr === 5 || expr === 2 ? "clear" : "set"} bits 0x${v.toString(16)}`;
    }
    // how this code's descriptions word the change, when they agree (短縮 = down, 秒 = seconds, 1.2倍)
    const w = defs.labels[`smt:${code}`];
    const dir = expr === 1 || expr === 2 ? (w?.dir ?? (expr === 1 ? "+" : "-")) : "";
    const sign = dir === "+" ? "+" : dir === "-" ? "−" : "";
    let amount: string;
    if (expr === 3) amount = `set to ${v}`;
    else if (w?.unit === "倍" && w.form === "add") amount = `×${fmt(dir === "-" ? 1 - v / 100 : 1 + v / 100)}`;
    else if (w?.unit === "倍" && w.form === "mul") amount = `×${fmt(v / 100)}`;
    else if (w?.unit === "秒") amount = `${sign}${w.form === "milli" ? fmt(v / 1000) : v}s`;
    else if (vt === 1) amount = `${sign}${v}`;
    else if (vt === 2 || vt === 4) amount = `${sign}${v}%`;
    else if (vt === 6) amount = `${sign}${v}% of ${refSender ? "the giver's " : ""}${word(`status:${ref}`, `stat ${ref}`)}`;
    else amount = `${sign}${v} (value type ${vt})`;
    const stack = vt === 1 && (expr === 1 || expr === 2) ? (FLAT_MAX_STATUS.has(status) ? "doesn't stack" : "stacks")
      : expr === 1 || expr === 2 ? STACKING[vt] : undefined;
    // only amounts the sentence states plainly (not "% of another stat" or an unnamed value type)
    if (dir && (vt === 1 || vt === 2 || vt === 4 || (w?.unit && vt !== 6))) {
      const unit = w?.unit === "倍" ? "×" : w?.unit === "秒" ? "s" : vt === 2 || vt === 4 ? "%" : "";
      const val = w?.unit === "秒" && w.form === "milli" ? v / 1000
        : w?.unit === "倍" ? (w.form === "mul" ? v / 100 : dir === "-" ? 1 - v / 100 : 1 + v / 100) : v;
      last = { key: `status:${status}`, dir: dir as "+" | "-", unit, v: val, ...(stack ? { stack } : {}) };
    }
    return `${stat} ${amount}${stack ? `, ${stack}` : ""}`;
  };

  /** 状態異常 name of a CrowdControlType (Gimmick guide links), else its number. */
  const ccName = (cc: number): string =>
    defs.labels[`cc:${cc}`] ? word(`cc:${cc}`, "") : `crowd control ${cc}`;

  /** AttackBonusStatusEffect: damage × v% while a status passes a test. ReferenceSenderUnit 1 tests the
   *  attacker's own status (its texts: 攻撃が10000以上の時, 耐久が高い程), else the enemy hit (攻撃が300以下の敵,
   *  防御0の敵); ValueType 2 = % of the maximum (耐久50%以上の敵), 1 = the value itself. */
  const attackBonus = (b: RawRow, v: number): string => {
    const stat = word(`status:${b.StatusType}`, `stat ${b.StatusType}`);
    const op = defs.labels[`op:${b.ConditionOperator}`] ? word(`op:${b.ConditionOperator}`, "") : `op${b.ConditionOperator}`;
    const val = `${b.ConditionValue ?? 0}${b.ValueType === 2 ? "%" : ""}`;
    // ≤ 100% of the maximum always holds: the bonus applies to every hit (e.g. 雷光王撃 「攻撃が0.5倍の術ダメージ」)
    const always = b.ValueType === 2 && defs.labels[`op:${b.ConditionOperator}`]?.jp === "≤" && Number(b.ConditionValue) >= 100;
    const cond = always ? "" : b.ReferenceSenderUnit ? `while own ${stat} ${op} ${val}` : `against enemies with ${stat} ${op} ${val}`;
    last = { key: always ? "dmg:dealt" : "dmg:bonus", dir: v >= 100 ? "+" : "-", unit: always ? "%" : "×",
      v: always ? Math.abs(v - 100) : v / 100, ...(cond ? { note: cond } : {}) };
    return `damage ×${fmt(v / 100)}${cond ? ` ${cond}` : ""}`;
  };
  /** The fact an OnGiveDamage / OnTakeDamage row makes, when it applies to all damage. */
  const damageRowFact = (table: string, row: RawRow, v: number) => {
    if (restriction(row).length) return;
    const unit = row.ValueType === 2 ? "" : "%";
    if (table === "OnGiveDamageEffect" && (row.OGDEffectType === 1 || row.OGDEffectType === 2)) damageFact("dealt", row.OGDEffectType === 1 ? "+" : "-", unit, v);
    if (table === "OnTakeDamageEffect" && (row.OTDEffectType === 6 || row.OTDEffectType === 7)) damageFact("taken", row.OTDEffectType === 7 ? "+" : "-", unit, v);
  };

  /** Any EffectType / EnchantEffectType / UnitEffectID: a UnitEffect row (every such column in the
   *  game points into UnitEffect.atb); type 1 = a StatusModifierType, 3/7/9 = effect tables. */
  const unitEffect = (id: number, v: number): string | null => {
    const ue = defs.unit_effect[id];
    if (!ue) return null;
    const [type, actual] = ue;
    if (type === 1) return modifier(actual, v);
    if (type === 22 && defs.attack_bonus[actual]) return attackBonus(defs.attack_bonus[actual], v);
    const table = UNIT_EFFECT_TABLE[type];
    const row = table ? defs.effect_tables?.[table]?.[actual] : undefined;
    last = null;
    if (row) {
      const s = effectRow(table, row, v, modifier, ccName);
      // an ImmunityEffect words a modifier it blocks: not a change of its own
      last = null;
      damageRowFact(table, row, v);
      return s;
    }
    return `unit effect type ${type} #${actual} ${v}`;
  };

  /** "Castle girls in range", "All melee castle girls", "Self". */
  const who = (tg: number, ar: number): string => {
    // target 51: every carrier's description names one specific castle girl (the token's or item's castle)
    if (tg === 51) return "The castle girl named in the text";
    const t = tg ? word(`target:${tg}`, `target ${tg}`) : "";
    const aJp = ar ? defs.labels[`area:${ar}`]?.jp : undefined;
    if (aJp === "自身" || defs.labels[`target:${tg}`]?.jp === "自身") {
      if (aJp) word(`area:${ar}`, "");
      return "Self";
    }
    if (aJp) word(`area:${ar}`, "");
    if (defs.labels[`target:${tg}`]?.jp.startsWith("自身")) return cap(t);
    if (aJp === "射程内") return cap(`${t} in range`);
    if (aJp === "全て") return cap(`all ${t}`);
    return cap(t || (ar ? `area ${ar}` : ""));
  };

  /** "Missile #4357: DEF −25%, for 15s" from a Missile.atb id. */
  const missile = (id: number): string => {
    const mods = defs.missiles[id] ?? [];
    const cc = defs.missile_cc?.[id];
    const rep = defs.missile_repeat?.[id];
    const parts = mods.map(([code, v, ms]) => `${modifier(code, v)}${ms ? `, for ${fmt(ms / 1000)}s` : ""}`);
    if (rep) parts.unshift(`hits ${rep[0] + 1} times${rep[1] ? `, ${fmt(rep[1] / 1000)}s apart` : ""}`);
    if (cc) parts.unshift(`inflicts ${ccName(cc[0])}${cc[1] ? ` (${fmt(cc[1] / 1000)}s)` : ""}`);
    if (!parts.length) return `missile #${id}`;
    return `missile #${id}: ${parts.join("; ")}`;
  };

  // the most a growing or per-count row reaches (its LimitValue), for the ranking
  let rowMax = 0;
  const PER_COUNT = new Set([2, 5, 6, 7, 10, 14, 17, 18]);
  const tail = (): string => {
    const parts: string[] = [];
    // AbilityTypeDetail 3 = a growing effect (FUN_00ae8ae0): each trigger counts, and once the count
    // reaches AbilityEffectDetail (0 = every trigger) EffectValue is added again, capped at LimitValue;
    // with EnableReverseEffect (反転化有効) it subtracts instead while the unit's status 315 反転化 is on
    // (FUN_00546780 passes 315 as FUN_00ae8ae0's 3rd argument). AbilityType 19 triggers on a 1 s timer (FUN_005090b0,
    // 30 frames at DAT_00c6d97c = 30 fps), so its AbilityEffectDetail is seconds per step.
    // only ability types whose handler reads AbilityTypeDetail as a condition kind (FUN_00af8580 is
    // called for types 1, 2, 11-19, 23; type 10 runs the same kind loop in FUN_00af7830)
    const KIND_TYPES = new Set([1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23]);
    // FUN_00ae8ae0 runs only when the same source re-applies a still-active status set, and clamps the
    // grown value to LimitValue (min(value, limit); limit 0 clamps to 0), so rows without a LimitValue
    // never grow: all 281 such rows (type 10 Great Magic, type 1 auras) describe a fixed amount, all
    // 572 with one describe ずつ/上限 growth
    const growing = kind === "ability" && r.AbilityTypeDetail === 3 && KIND_TYPES.has(Number(r.AbilityType))
      && typeof r.LimitValue === "number" && r.LimitValue !== 0;
    if (growing) {
      const n = num("AbilityEffectDetail");
      const rev = num("EnableReverseEffect");
      const step = r.AbilityType === 19
        ? (n > 1 ? `every ${n}s` : "every second")
        : (n > 1 ? `every ${n} ${STEP_NOUN[Number(r.AbilityType)]?.[1] ?? "triggers"}` : `each ${STEP_NOUN[Number(r.AbilityType)]?.[0] ?? "trigger"}`);
      parts.push(`grows by that amount ${step}${rev ? ` (shrinks instead while ${word("status:315", "status 315")} is on)` : ""}`);
    } else if (kind === "ability" && KIND_TYPES.has(Number(r.AbilityType)) && CONDITION[num("AbilityTypeDetail")]) {
      const c = CONDITION[num("AbilityTypeDetail")](num("AbilityEffectDetail"), (id) => word(`trait:${id}`, `trait ${id}`));
      if (c) parts.push(c);
    } else {
      // AbilityEffectDetail >= 1000 is the "N秒毎" interval of the clause (27 of 34 descriptions)
      const every = num("AbilityEffectDetail");
      if (every >= 1000) parts.push(`every ${fmt(every / 1000)}s`);
      else if (every && !(r.AbilityType === 6 && CLASS_ABILITY[Number(r.AbilityTypeDetail)])
        && !(r.AbilityType === 21 && r.AbilityTypeDetail === 2 && defs.labels["fieldpulse:2"])) used.delete("AbilityEffectDetail");
    }
    const loc = num("AbilityLocationType");
    if (loc && defs.labels[`location:${loc}`]) parts.push(`when on ${word(`location:${loc}`, "")} tiles`);
    else if (loc) used.delete("AbilityLocationType");
    const ms = num("DurationInMillis") || num("EffectDuration");
    // values under 0.1s never match a duration in the descriptions; they stay in the raw fields
    // under 0.1s: a status that lasts a few frames (e.g. the 0.035s Move speed −1000 of 後退させる knockback)
    if (ms >= 100) parts.push(`for ${fmt(ms / 1000)}s`);
    else if (ms) parts.push(`for ${ms}ms`);
    const p = num("ProbabilityOfActivation");
    if (p) parts.push(`${p}% chance`);
    const lim = num("LimitValue");
    if (lim) parts.push(`up to ${lim}`);
    if (lim > 0 && (growing || (kind === "ability" && KIND_TYPES.has(Number(r.AbilityType)) && PER_COUNT.has(Number(r.AbilityTypeDetail))))) rowMax = lim;
    // Ability.atb bool columns, worded from their own header names (tools/data/column_names.json)
    if (num("GrowUpLimitOnly")) parts.push("only at max giantification (最大化)");
    if (num("Growup")) parts.push("activates on giantification (巨大化時発動)");
    if (num("InvalidEachGrowUpCorrection")) parts.push("no giantification scaling (変位補正無効)");
    if (!growing && num("EnableReverseEffect")) parts.push("reversible (反転化有効)");
    num("Passive");
    return parts.length ? `, ${parts.join(", ")}` : "";
  };

  const text: string[] = [];

  if (kind === "ability") {
    const at = num("AbilityType"), atd = num("AbilityTypeDetail"), v = num("EffectValue");
    const smt = num("StatusModifierType");
    const subject = who(num("AbilityTargetType"), num("AbilityAreaType"));
    const trigKey = `trigger:${at}`;
    const typeKey = `abtype:${at}`;
    // type 19 runs on the 1 s timer; its step interval is worded in tail() from the exe, not from text
    const trigger = at === 19 && atd === 3 ? ""
      : defs.labels[trigKey] ? word(trigKey, "") : defs.labels[typeKey] ? word(typeKey, "") : "";
    // type 2 (攻撃した敵): its 自身 rows land on the enemy hit (their descriptions: 自身が攻撃した敵の…低下)
    const lead = at === 2 && trigger && subject === "Self" ? "On hit, the enemy it attacks: "
      : at === 16 && trigger ? "Enemies it blocks: "
      : trigger
      ? `${cap(trigger)}${subject ? `, ${subject.charAt(0).toLowerCase()}${subject.slice(1)}` : ""}: `
      : subject ? `${subject}: ` : "";
    const perGrowUp = num("EachGrowUp") ? `, ${word("field:EachGrowUp", "per giantification")}` : "";
    // receiver and side of the row's stat changes, for the ranking
    const tgJp = defs.labels[`target:${num("AbilityTargetType")}`]?.jp;
    const hitEnemy = at === 2 && trigger && subject === "Self";
    const factWho = hitEnemy ? "Enemy hit" : at === 16 && trigger ? "Enemies it blocks" : subject || "—";
    const factSide = hitEnemy || (at === 16 && trigger) ? "enemy" : subject === "Self" ? "ally" : sideOfTarget(tgJp);
    /** File the last worded change; the note is the trigger + the sentence's tail. */
    const file = (tl: string, extra = "") => take(factWho, factSide, [trigger && !hitEnemy && !(at === 16) ? cap(trigger) : "", extra, tl.replace(/^, /, "")].filter(Boolean).join(", "));
    if (at === 21 && link) {
      // on-defeat field effect: Param3 = damage as % of ATK (its descriptions print Param3/100 倍
      // in 63 of 64 cases); the missile's modifiers are what the field applies
      const f = link.field, m = link.missile;
      const parts: string[] = [];
      const dmg = typeof f.Param3 === "number" ? f.Param3 : 0;
      if (dmg) parts.push(`damage ×${fmt(dmg / 100)} ATK`);
      // the field's missile (Param1) may carry a crowd control: CrowdControlType + DurationInMillis1
      const mcc = Number(m.CrowdControlType ?? 0);
      if (mcc) parts.push(`inflicts ${ccName(mcc)}${m.DurationInMillis1 ? ` (${fmt(Number(m.DurationInMillis1) / 1000)}s)` : ""}`);
      // Missile.DealDamageEffectID (ダメージ発生効果) + DealDamageEffectValue
      const dde = Number(m.DealDamageEffectID ?? 0);
      const ddeRow = dde ? defs.effect_tables?.DealDamageEffect?.[dde] : undefined;
      if (ddeRow) parts.push(effectRow("DealDamageEffect", ddeRow, Number(m.DealDamageEffectValue ?? 0), modifier, ccName)
        + (m.DealDamageEffectDurationInMillis ? `, for ${fmt(Number(m.DealDamageEffectDurationInMillis) / 1000)}s` : ""));
      for (const i of [1, 2]) {
        const code = Number(m[`StatusModifierType${i}`] ?? 0), val = Number(m[`StatusEffectValue${i}`] ?? 0);
        const ms = Number(m[`DurationInMillis${i}`] ?? 0);
        if (code) parts.push(`${modifier(code, val)}${ms ? `, for ${fmt(ms / 1000)}s` : ""}`);
      }
      // 21/2 (while deployed): AbilityEffectDetail = re-apply interval in ms (text-supported, see fieldpulse:2)
      const pulse = num("AbilityTypeDetail") === 2 ? num("AbilityEffectDetail") : 0;
      const every = pulse && defs.labels["fieldpulse:2"] ? (word("fieldpulse:2", ""), `, re-applied every ${fmt(pulse / 1000)}s`) : "";
      if (pulse && !every) used.delete("AbilityEffectDetail");
      text.push(`Field effect #${link.field_id}: ${parts.join("; ") || "(no decoded effect)"}${every}${tail()}`);
    } else if (num("UnitEffectID") && defs.unit_effect[num("UnitEffectID")]) {
      // UnitEffect.atb dispatch: ActualEffectID is in exactly one table for these types (every row)
      const id = num("UnitEffectID");
      const [type, actual] = defs.unit_effect[id];
      if (type === 1) {
        const m = modifier(actual, v), tl = tail();
        file(tl, perGrowUp.slice(2));
        text.push(`${lead}${m}${perGrowUp}${tl}`);
      } else {
        const known = (type === 22 && defs.attack_bonus[actual]) || (UNIT_EFFECT_TABLE[type] && defs.effect_tables?.[UNIT_EFFECT_TABLE[type]]?.[actual]);
        if (!known) used.delete("UnitEffectID");
        const body = unitEffect(id, v) ?? `unit effect ${id} ${v}`;
        const tl = tail();
        file(tl);
        text.push(`${lead}${body}${tl}`);
      }
    } else if (at === 6 && (atd === 2 || atd === 4)) {
      // class-ability types 6/2 and 6/4: EffectValue is a Missile.atb id (every such row)
      text.push(`${lead}${cap(missile(v))}${tail()}`);
    } else if (at === 9 && defs.effect_tables?.DealDamageEffect?.[atd]) {
      // AbilityType 9 handler FUN_00af5150: AbilityTypeDetail looked up by FUN_00aa9b40 = DealDamageEffectID
      // (all 35 ids in the data are DealDamageEffect rows; e.g. 1028 = magic, ATK, every 2s = 2秒毎に攻撃の
      // 0.5倍の術ダメージ with EffectValue 50), EffectValue = amount (FUN_00aedeb0)
      const row = defs.effect_tables.DealDamageEffect[atd];
      text.push(`${lead}${effectRow("DealDamageEffect", row, v, modifier, ccName)}${tail()}`);
    } else if (at === 8 && (atd === 1 || atd === 2)) {
      // AbilityType 8 handler FUN_00af5bb0: OnGiveDamage of type = AbilityTypeDetail with ValueType 1 (%)
      // (FUN_00af2310(type, 1, ...)); it never reads StatusModifierType
      num("StatusModifierType");
      const tl = tail();
      damageFact("dealt", atd === 1 ? "+" : "-", "%", v);
      file(tl, perGrowUp.slice(2));
      text.push(`${lead}${effectRow("OnGiveDamageEffect", { OGDEffectType: atd, ValueType: 1 }, v, modifier, ccName)}${perGrowUp}${tl}`);
    } else if (at === 3 && atd >= 1 && atd <= 11) {
      // FUN_00af72f0 never reads StatusModifierType (2 rows set it; their texts say 被ダメージ上昇)
      num("StatusModifierType");
      // AbilityType 3 handler FUN_00af72f0: OnTakeDamage effect of type = AbilityTypeDetail, ValueType per
      // type (FUN_00aee620 2nd arg: 2 = flat for 4, 5, 9, 10, 11; 1 = % otherwise); Effect = hit visual id
      num("Effect");
      const vt = [4, 5, 9, 10, 11].includes(atd) ? 2 : 1;
      const tl = tail();
      if (atd === 6 || atd === 7) { damageFact("taken", atd === 7 ? "+" : "-", "%", v); file(tl); }
      text.push(`${lead}${effectRow("OnTakeDamageEffect", { OTDEffectType: atd, ValueType: vt }, v, modifier, ccName)}${tl}`);
    } else if (at === 6 && CLASS_ABILITY[atd]) {
      const name = atd === 7 ? defs.ability_names?.[v] : undefined;
      text.push(`${lead}${CLASS_ABILITY[atd](v, num("AbilityEffectDetail"))}${name ? ` 「${name}」` : ""}${tail()}`);
    } else if (at === 5 && atd === 1) {
      // natural Ki tick FUN_0042ce10: 1 Ki (100 units) per tick + EffectValue units; a 2nd/3rd unit with
      // the same effect counts 1/2, 1/4 (BattleSystemConfig 205 = 2)
      word("abilitytype:5/1", "");
      const tl = tail();
      last = { key: "ki:natural", dir: "+", unit: "%", v, stack: "a 2nd/3rd such unit counts ½/¼" };
      file(tl);
      text.push(`${lead}Natural Ki gain +${v}% (+${fmt(v / 100)} Ki per tick; a 2nd/3rd such unit counts ½/¼)${tl}`);
    } else if (at === 5 && atd === 3) {
      // periodic Ki generation: EffectValue Ki every DurationInMillis
      const ms = num("DurationInMillis");
      text.push(`Ki +${v} every ${fmt(ms / 1000)}s`);
    } else if (at === 22 && atd && defs.attack_bonus[atd]) {
      // AbilityTypeDetail = AttackBonusStatusEffectID (operators as the descriptions word them: 以下 ≤, 以上 ≥)
      const body = attackBonus(defs.attack_bonus[atd], v), tl = tail();
      file(tl);
      text.push(`${lead}${body}${tl}`);
    } else if (smt) {
      const how = at > 1 && !trigger && at !== 22 && !(at === 19 && atd === 3) ? ` (ability type ${at}${atd ? `/${atd}` : ""})` : "";
      const m = modifier(smt, v), tl = tail();
      // an unnamed ability type: its trigger is unknown, so it isn't ranked
      if (how) last = null;
      file(tl, perGrowUp.slice(2));
      text.push(`${lead}${m}${perGrowUp}${tl}${how}`);
    } else {
      const key = `abilitytype:${at}/${atd}`;
      const body = `${word(key, `ability type ${at}/${atd}`)} ${amountFor(key, v)}`, tl = tail();
      labelFact(key, v);
      file(tl, perGrowUp.slice(2));
      text.push(`${lead}${body}${perGrowUp}${tl}`);
    }
  } else if (kind === "organized" || kind === "always" || kind === "quest" || kind === "potential") {
    const et = num("EffectType"), v = num("EffectValue"), key = `effecttype:${et}`;
    let lead = "";
    // potential / always rows have no target columns: they change the card itself
    let factWho = kind === "potential" ? "Self" : "—";
    let factSide: "ally" | "enemy" = "ally";
    if (kind === "organized") {
      // formation TargetType / AreaType: own vocabulary, named from formation descriptions only
      const tg = num("TargetType"), ar = num("AreaType");
      const t = tg ? word(`otarget:${tg}`, `target ${tg}`) : "";
      const aJp = ar ? defs.labels[`oarea:${ar}`]?.jp : undefined;
      if (aJp) word(`oarea:${ar}`, "");
      const subject = aJp === "部隊" ? `${t} in the formation` : aJp === "全て" ? `all ${t}` : t || (ar ? `area ${ar}` : "");
      if (subject) lead = `${cap(subject)}: `;
      factWho = subject ? cap(subject) : "—";
      factSide = sideOfTarget(defs.labels[`otarget:${tg}`]?.jp);
      // a formation row with no EffectType: the ability's effects are its quest rows (QuestType)
      if (!et && !v) { text.push("No formation effect of its own (its effects are the quest-only rows)"); return finish(); }
    }
    if (kind === "quest") {
      const qt = num("QuestType");
      const ex = defs.quest_types?.[qt];
      const subject = who(num("AbilityTargetType"), num("AbilityAreaType"));
      lead = `In quest type ${qt}${ex?.length ? ` (${ex.join(", ")}…)` : ""}${subject ? `, ${subject.charAt(0).toLowerCase()}${subject.slice(1)}` : ""}: `;
      num("Passive");
    }
    let resolved = unitEffect(et, v);
    if (resolved == null) { resolved = `${word(key, `effect ${et}`)} ${amountFor(key, v)}`; labelFact(key, v); }
    const tl = tail();
    // quest-only rows apply in one quest type only: not ranked
    if (kind === "quest") last = null;
    take(factWho, factSide, tl);
    text.push(`${lead}${resolved}${tl}`);
  } else if (kind === "enchant") {
    const secs = num("DurationInSeconds");
    const dur = secs ? `, for ${fmt(secs)}s` : "";
    // TargetType 2: the stratagem only targets its user (its texts say 自分のみ)
    const tt = num("TargetType");
    const ally = defs.labels[`etarget:${tt}`]?.jp === "自分のみ" ? (word(`etarget:${tt}`, ""), "Self") : "Target";
    for (const i of [1, 2, 3]) {
      const code = num(`AllyModifierType${i}`), v = num(`AllyEffectValue${i}`);
      if (code) { const m = modifier(code, v); take(ally, "ally", dur); text.push(`${ally}: ${m}${dur}`); }
    }
    for (const f of ["MissileID", "SpreadMissileID", "ShotMissileID"]) {
      const id = num(f);
      if (id) text.push(`${ally}: ${missile(id)}`);
    }
    // EnchantEffect columns worded from their own header names (tools/data/column_names.json)
    const bq = num("BarrierQuantity");
    if (bq) text.push(`${ally}: barrier (バリア) blocks up to ${bq} damage${dur}`);
    if (num("DistributeDamage")) text.push(`${ally}: damage taken is split among all deployed castle girls (ダメージ分散)${dur}`);
    if (num("ActivateAbility")) text.push(`${ally}: its skill (特技) activates (特技発動)`);
    if (num("TransformDisabled")) text.push(`${ally}: unit change disabled (ユニット変更無効)`);
    const sa = num("SpecialAttackID");
    if (sa) text.push(`${ally}: uses special attack #${sa} (特殊攻撃ID)`);
    const ohd = num("OnHitEffectDuration");
    if (ohd) text.push(`on-hit effects last ${fmt(ohd / 1000)}s (着弾効果時間)`);
    const ts = num("TargetSet");
    if (ts) {
      const codes = defs.target_sets?.[ts] ?? [];
      const names = codes.map((t) => word(`target:${enchantTarget(t)}`, `target ${t}`));
      text.push(`Can target (発動対象): ${names.length ? names.join(", ") : `set #${ts}`}`);
    }
    // named by the game's own field: the stratagem can't be used while a special attack is running
    if (num("SpecialAttackingInvalidActivate")) text.push("Can't be used during a special attack");
    // the effect-set rows listed below this one
    num("AllyEffectSetID");
    num("OpponentEffectSetID");
    // the unit becomes its transformed card (shown in "During stratagem")
    if (num("TransformEnabled") || num("TransformEnabledCT")) text.push(`${ally}: transforms${dur}`);
    const oa = num("OpponentAreaType");
    const enemies = defs.labels[`oparea:${oa}`] ? `Enemies ${word(`oparea:${oa}`, "")}` : "Enemies";
    if (oa && !defs.labels[`oparea:${oa}`]) used.delete("OpponentAreaType");
    for (const i of [1, 2, 3]) {
      const code = num(`OpponentModifierType${i}`), v = num(`OpponentEffectValue${i}`);
      if (code) { const m = modifier(code, v); take(enemies, "enemy", dur); text.push(`${enemies}: ${m}${dur}`); }
    }
    const red = num("TakeDamageReductionRate");
    if (red) { damageFact("taken", "-", "%", red); take(ally, "ally", dur); text.push(`${ally}: damage taken −${red}%${dur}`); }
    if (!text.length && secs && (r.AllyEffectSetID || r.OpponentEffectSetID)) text.push(`Lasts ${fmt(secs)}s; effects listed below`);
  } else if (kind === "enchant_set") {
    const et = num("EnchantEffectType"), v = num("EffectValue"), key = `enchanttype:${et}`;
    // who: EffectAreaType (対象 = the target itself, 対象の射程内 = inside its range) + EffectTargetType
    const st = num("EffectTargetType"), sa = num("EffectAreaType");
    const area = defs.labels[`sarea:${sa}`]?.jp;
    if (area) word(`sarea:${sa}`, "");
    const t = defs.labels[`starget:${st}`] ? word(`starget:${st}`, "") : "";
    let subject = "";
    if (area === "対象" && (!t || t === "対象")) subject = "Target";
    else if (area === "対象の射程内") subject = `${t && t !== "対象" ? t : "units"} in ${ctx.selfOnly ? "range" : "the target's range"}`;
    else if (t) subject = t;
    else subject = `target ${st}${sa ? `, area ${sa}` : ""}`;
    // a 自分のみ stratagem's target is its user
    if (ctx.selfOnly && subject === "Target") subject = "Self";
    // EffectDetailType (ユニット効果詳細) / EffectDetailValue are the ability condition kind and its
    // parameter d (FUN_00548d20): rows agree with their stratagem texts (2 敵1体につき, 5 大破数に応じて,
    // 6 城娘1体につき, 7 味方1体につき, 9 d=5 最大化時, 10 d=2 [夏]城娘1体につき, 3 ずつ上昇/N秒毎)
    const dt = num("EffectDetailType"), dv = num("EffectDetailValue");
    let per = "";
    if (dt === 3 && num("LimitValue")) {
      per = `, grows by that amount ${dv > 1 ? `every ${dv} triggers (seconds when timed)` : "each trigger"}`;
    } else if (CONDITION[dt]) {
      const c = CONDITION[dt](dv, (id) => word(`trait:${id}`, `trait ${id}`));
      per = c ? `, ${c}` : "";
    } else if (dt && defs.labels[`setdetail:${dt}`]) per = `, ${word(`setdetail:${dt}`, "")}`;
    else if (dt) { used.delete("EffectDetailType"); used.delete("EffectDetailValue"); }
    let resolved = unitEffect(et, v);
    if (resolved == null) { resolved = `${word(key, `effect ${et}`)} ${amountFor(key, v)}`; labelFact(key, v); }
    const lim = typeof r.LimitValue === "number" ? r.LimitValue : 0;
    if (lim > 0 && ((dt === 3) || PER_COUNT.has(dt))) rowMax = lim;
    const tl = tail();
    // the side is the set's (ally / opponent set): the caller knows it, the row doesn't
    take(cap(subject), "ally", `${per}${tl}`);
    text.push(`${cap(subject)}: ${resolved}${per}${tl}`);
  }

  return finish();

  function finish(): Sentence {
    const rest: RawRow = {};
    for (const [k, v] of Object.entries(r0)) if (!used.has(k)) rest[k] = v;
    return { text, evidence, rest, facts };
  }
}
