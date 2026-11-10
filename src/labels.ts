// Hand-maintained English labels for game text. Missing entries fall back to the Japanese.

/** English for the game's own effect wording (the jp side of mined effect labels). */
export const JP_EN: Record<string, string> = {
  // stats: the game's own column names (StatusTypes bound to them in the exe)
  HealthMaximum: "Max HP",
  Health: "Current HP",
  Regeneration: "Regen",
  AttackPower: "ATK",
  AttackRange: "Range",
  AttackSpeed: "Attack speed",
  AttackTargetCount: "Targets",
  Defense: "DEF",
  BlockCount: "Block",
  GimmickPoint: "Stratagem cooldown",
  "GimmickPoint (current)": "Stratagem cooldown progress",
  GimmickStockCount: "Stratagem stock",
  Deposit: "Deposit",
  "DamageVs妖怪": "Damage vs yokai",
  AntiSpecterBonus: "Anti-yokai bonus",
  "DamageVs魔物": "Damage vs demons",
  SpreadReductionRate: "Splash damage rate",
  DirectHitBonus: "Direct-hit bonus",
  "DirectHitBonus (override)": "Direct-hit bonus (override)",
  AntiAirBonus: "Anti-air bonus",
  "DamageVsFlying (no missile)": "Damage vs flying (non-missile attacks)",
  IgnoreArmor: "ignores DEF",
  Missile: "missile attack",
  AntiDemonBonus: "anti-魔物 bonus",
  DamageDrain: "HP drain (% of damage dealt)",
  "HealthGauge (max)": "Max HP gauges",
  HealthGauge: "HP gauges",
  ImmuneToDamage: "Damage immunity",
  Undying: "Can't be destroyed (HP stays at 1)",
  "Undying blocked": "Blocks 'can't be destroyed'",
  IgnoreImmuneToDamage: "pierces damage immunity",
  "SpecialGauge (max)": "Special gauge per stock",
  SpecialGauge: "Special gauge",
  SpecialGaugeChargeByDamage: "Special gauge gain when hit",
  "SpecialGaugeChargeByDamage (flat cut)": "Special gauge gain when hit (flat cut)",
  SpecialStock: "Special attack stock",
  "DeployCost%": "Deploy Ki",
  "DeployCost (flat cut)": "Deploy Ki reduction",
  DeployCostReduction: "Deploy Ki reduction",
  CostReduction: "Cost reduction",
  "RetreatKiRefund%": "Ki refund on retreat (% of deploy Ki)",
  "GiantifyKiCost%": "Giantify Ki",
  "GiantifyKiCost (flat cut)": "Giantify Ki reduction",
  "DefenseIgnore%": "DEF ignore",
  "DefenseIgnore (flat)": "DEF ignore (flat)",
  "DamageReduction% (物理)": "Physical damage reduction",
  "Defense (魔法)": "Magic defense",
  "DamageReduction% (魔法)": "Magic damage reduction",
  "魔法 (MagicDamage / IgnoreArmor)": "magic (ignores DEF)",
  "固定ダメージ (TrueDamage)": "true damage",
  "遠距離 (RangedAttack)": "ranged",
  "飛行特攻 (AntiAir)": "anti-air",
  "直撃ボーナス (DirectHitBonus)": "direct-hit bonus",
  "妖怪特攻 (AntiSpecter)": "anti-yokai",
  "魔物特攻 (AntiDemon)": "anti-魔物",
  "与ダメ効果無視 (IgnoreGiveDamage)": "ignores damage-dealt modifiers",
  "被ダメ効果無視 (IgnoreTakeDamage)": "ignores damage-taken modifiers",
  "特定攻撃ボーナス効果無視 (IgnoreAttackBonus)": "ignores attack bonuses",
  "ダメージ無効(敵ギミック用)無視 (IgnoreImmuneToDamageForEnemyGimmick)": "pierces damage immunity",
  FallNotCounted: "Falling doesn't count toward the fallen-unit count",
  状態異常無効: "Crowd-control immunity",
  気回収量: "Ki gain",
  気回収時間: "Ki gain interval",
  回復量: "Healing amount",
  天候無効: "Weather immunity",
  "自動巨大化時間%": "Auto-giantify time",
  "自動巨大化時間 (flat ms)": "Auto-giantify time (flat)",
  気の自然増加量: "Natural Ki gain",
  "攻撃時自傷(最大耐久%)": "Recoil per attack (% of own max HP)",
  隙短縮: "Attack gap reduction",
  RegenInterval: "Regen interval",
  "反転化 (reversal)": "Reversal (反転化)",
  "Untargetable by allies in 「絶望」": "Can't be targeted by allies in Despair",
  麻痺: "Paralysis", 暗闇: "Darkness", 混乱: "Confusion", 火傷: "Burn", 猛毒: "Deadly Poison", 氷結: "Freeze", 絶望: "Despair", 服従: "Submission",
  獲得金: "Gold gain",
  獲得殿EXP: "Lord EXP gain",
  獲得金と蔵からの入手金: "Gold gain (incl. storehouses)",
  要石の入手数: "Keystone drops",
  "最大耐久の%回復": "Heal (% of max HP)",
  城娘合成時の獲得経験値: "EXP from fusion",
  暴雨: "Downpour", 豪雪: "Heavy Snow", 瘴気: "Miasma", 轟雷: "Thunder", 暴風: "Gale", 濃霧: "Dense Fog",
  虚夜: "Void Night", 幻霧: "Phantom Fog",
  Untargetable: "Can't be targeted",
  "Untargetable (non-flying)": "Can't be targeted except by flying enemies",
  SpecialGaugeChargeByAttack: "Special gauge gain on attack",
  "SpecialGaugeChargeByAttack (flat cut)": "Special gauge gain on attack (flat cut)",
  // stats
  耐久: "HP",
  現在耐久: "Current HP",
  攻撃: "ATK",
  防御: "DEF",
  防御無視: "DEF ignore",
  回復: "Regen",
  射程: "Range",
  攻撃速度: "Attack speed",
  隙: "Attack gap",
  攻撃対象: "Targets",
  攻撃対象数: "Target count",
  足止め数: "Block",
  移動速度: "Move speed",
  範囲: "Area",
  爆風範囲: "Blast radius",
  爆風ダメージ: "Blast damage",
  ダメージ: "Damage",
  与ダメージ: "Damage dealt",
  与えるダメージ: "Damage dealt",
  攻撃で与えるダメージ: "Attack damage dealt",
  範囲攻撃で与えるダメージ: "Area attack damage",
  被ダメージ: "Damage taken",
  被回復量: "Healing received",
  与回復量: "Healing given",
  飛行敵に対して攻撃: "ATK vs flying",
  妖怪に対して攻撃: "ATK vs yokai",
  特殊攻撃ゲージ蓄積量: "Special gauge gain",
  特殊攻撃ゲージ蓄積速度: "Special gauge speed",
  時間: "Time",
  再配置時間: "Redeploy time",
  計略使用までの時間: "Time until stratagem",
  初回計略使用までの時間: "Time until first stratagem",
  自動巨大化時間: "Auto-giantify time",
  計略再使用時間: "Stratagem cooldown",
  // ki
  配置気: "Deploy Ki",
  巨大化気: "Giantify Ki",
  計略消費気: "Stratagem Ki cost",
  獲得気: "Ki gain",
  撃破獲得気: "Ki per kill",
  撤退大破回復気: "Ki refund on retreat/defeat",
  // outside battle
  獲得経験値: "EXP gain",
  入手金: "Gold gain",
  所持しているだけで獲得金: "Gold gain (owned)",
  所持しているだけで獲得殿EXP: "Lord EXP gain (owned)",
  // when
  攻撃した敵: "on hit (the enemy it attacks)",
  大魔法: "Great Magic",
  特殊攻撃: "special attack",
  敵N体につき: "per enemy",
  飛行: "vs flying",
  水上: "water",
  攻撃する度に: "each attack",
  攻撃を受ける度に: "each time attacked",
  敵を撃破する度に: "each enemy defeated",
  巨大化する度に: "per giantification",
  N秒毎に: "every few seconds",
  // who / where
  自身: "self",
  自身と自身の伏兵: "self and own ambush units",
  兜娘: "kabuto girls",
  軍船城娘: "warship castle girls",
  伏兵: "ambush units",
  部隊: "formation",
  城娘: "castle girls",
  近接城娘: "melee castle girls",
  遠隔城娘: "ranged castle girls",
  盾城娘: "shield castle girls",
  双剣城娘: "dual-sword castle girls",
  味方: "allies",
  敵: "enemies",
  飛行敵: "flying enemies",
  妖怪: "yokai",
  海洋兜: "ocean kabuto",
  蔵: "storehouses",
  射程内: "in range",
  全て: "all",
  トークン: "tokens",
  自身のトークン: "own tokens",
  優先攻撃対象: "Priority target (taunt)",
  攻撃属性: "Attack attribute",
  "大魔法消費気%": "Great Magic Ki cost %", "大魔法再使用時間%": "Great Magic cooldown %", 優先して狙われる: "Draws enemy targeting",
  "気が増加(即時)": "Ki (instant, on deploy/activation)",
  "[能力者][魔術師]城娘": "Esper and Magician castle girls",
  "「絶望」状態の敵": "enemies in Despair", "「絶望」状態のユニット": "units in Despair", "「絶望」状態の城娘": "castle girls in Despair", "「絶望」状態のトークン": "tokens in Despair",
  "「氷結」状態の敵": "frozen enemies", "「氷結」状態のユニット": "frozen units", "「氷結」状態の城娘": "frozen castle girls", "「氷結」状態のトークン": "frozen tokens",
  無属性: "none", 炎属性: "fire", 氷属性: "ice", 水属性: "water", 雷属性: "thunder", 土属性: "earth",
  風属性: "wind", 光属性: "light", 闇属性: "dark", 毒属性: "poison", 属性1: "attribute 1", 属性2: "attribute 2", 属性3: "attribute 3",
  回復を受けられない: "Can't be healed",
  足止め対象にならない: "Can't be blocked",
  回復がダメージに変化: "Heals on it deal damage",
  攻撃しない: "Doesn't attack",
  "計略消費気%": "Stratagem Ki cost %",
  // TokenConfig.TokenUnitType 1 = every 伏兵 token (all 390), not only the owner's (that is 自身のトークン)
  "伏兵(種別1)": "ambush units (伏兵)",
  殿側: "your side",
  殿側ユニット: "castle girl side units (殿側ユニット)",
  敵城娘: "enemy castle girls (敵城娘)",
  // TokenConfig.TokenUnitType 4 = the 6 boats (筏, 小舟, 渡し舟, 砲撃舟, ボロ舟, 水蜘蛛)
  "舟(種別4)": "boats",
  トークンB: "test token B",
  トークンC: "test token C",
  飛行以外の敵: "non-flying enemies",
  "城娘(自身を除く)": "castle girls except self",
  "近接城娘(自身を除く)": "melee castle girls except self",
  "遠隔城娘(自身を除く)": "ranged castle girls except self",
  近接のみの城娘: "melee-only castle girls",
  遠隔のみの城娘: "ranged-only castle girls",
  "近接・遠隔両用の城娘": "castle girls that can be placed on melee and ranged tiles",
};

/** CardCategoryName.atb, keyed by category id. */
export const CATEGORY_EN: Record<number, string> = {
  0: "Castle Girl",
  1: "Magical Girl",
  2: "Adventurer",
  3: "Knight",
  4: "Lab Member",
  5: "Kabuto Girl",
  6: "Ultimate",
  7: "Hope's Peak Academy",
  8: "Witch",
  9: "JFW Base",
  10: "Aigis Warrior",
  11: "Monster Girl",
  12: "Esper",
  13: "Magician",
  14: "Academy City",
  15: "Attack on Titan",
  16: "Jabberwock Island",
  17: "Castle Princess",
  18: "Weiss",
  19: "Girls und Panzer",
  20: "T.O.W.E.R.",
  100: "Castle Girl (☆1)",
  101: "Castle Girl (☆2)",
  102: "Castle Girl (☆3)",
  103: "Castle Girl (☆4)",
  104: "Castle Girl (☆5)",
  105: "Castle Girl (☆6)",
  106: "Castle Girl (☆7)",
};

/** WeaponType.atb names (the 24 standard types + generic token types). Collab weapons keep their names. */
export const WEAPON_EN: Record<string, string> = {
  刀: "Sword", 槍: "Spear", 槌: "Hammer", 弓: "Bow", 石弓: "Crossbow", 鉄砲: "Gun", 大砲: "Cannon",
  歌舞: "Song & Dance", 法術: "Magic", 盾: "Shield", 鈴: "Bell", 杖: "Staff", 拳: "Fist",
  投剣: "Throwing Blades", 祓串: "Purification Wand", 本: "Book", 鞭: "Whip", 鎌: "Scythe",
  戦棍: "Mace", 陣貝: "Conch Horn", 双剣: "Dual Swords", 軍船: "Warship", ランス: "Lance", 茶器: "Tea Set",
  "トークン汎用[近接]": "Token (melee)", "トークン汎用[遠隔]": "Token (ranged)", "トークン汎用[攻撃なし]": "Token (no attack)",
};

/** Card.AreaType names (MenuText 1703+N). */
export const REGION_EN: Record<string, string> = {
  北海道: "Hokkaido", 東北: "Tohoku", 関東: "Kanto", 甲信越: "Koshinetsu", 北陸: "Hokuriku", 東海: "Tokai",
  近畿: "Kinki", 中国: "Chugoku", 四国: "Shikoku", 九州: "Kyushu", 沖縄: "Okinawa", 海外: "Overseas",
  その他: "Other", 異界: "Otherworld",
};

/** Card.Tokusei names (MenuText 4300+N): seasonal and group tags. */
export const TRAIT_EN: Record<string, string> = {
  夏: "Summer", ﾊﾛｳｨﾝ: "Halloween", 正月: "New Year", 節分: "Setsubun", 端午: "Boys' Day",
  花嫁衣装: "Bridal", 聖夜: "Christmas", ﾊﾞﾚﾝﾀｲﾝ: "Valentine's", 肝試し: "Test of Courage",
  絢爛: "Splendor", お月見: "Moon Viewing", 学園: "School", 大宰府と古代山城: "Dazaifu & Ancient Mountain Castles",
  ロワール渓谷: "Loire Valley", アイアンリング: "Iron Ring", 古代城柵: "Ancient Stockades", 架空城: "Fictional Castle",
  水上配置: "Water Placement", 城塞都市: "Fortified City", 関東七名城: "Seven Famous Castles of Kanto",
  伊東四十八城: "Ito's 48 Castles", 中国都城: "Chinese Capitals", 宮殿: "Palace", 異伝: "Alternate Legend",
  アイドル: "Idol", 幼き: "Young", 温泉: "Hot Spring", 港: "Port",
};

/** Terrain (地形 / castle type) words, as InstallationCastleTypeLimit.atb spells them. */
export const CASTLE_EN: Record<string, string> = {
  平: "Plain", 平山: "Hill", 山: "Mountain", 水: "Water", 地獄: "Hell", 無属性: "No-terrain", 無: "No-terrain",
};

/** EnemyType.atb names. */
export const ENEMY_EN: Record<string, string> = {
  兜: "Kabuto", 妖怪: "Yokai", 赤備え兜: "Red-Armor Kabuto", 動物兜: "Animal Kabuto", 海洋兜: "Ocean Kabuto",
  西洋兜: "Western Kabuto", 魔物: "Demon", 敵城娘: "Enemy Castle Girl", 大将兜: "Commander Kabuto",
  敵兜娘: "Enemy Kabuto Girl", 武神: "War God enemies", 焦熱地獄: "Scorching Hell", 極寒地獄: "Freezing Hell",
  等活地獄: "Reviving Hell", 針山地獄: "Needle Mountain Hell", 無間地獄: "Avici Hell",
  // the rest of EnemyType.atb (Hel's realms, Osiris's lands, event sets), translated literally
  武神用: "War God stage enemies", 飛行兜: "Flying Kabuto", 幻想: "Fantasy enemies", 群雄割拠: "Warring States enemies",
  ムスペルヘイム: "Muspelheim enemies", ニヴルヘイム: "Niflheim enemies", ニザヴェッリル: "Nidavellir enemies",
  ヴァルハラ: "Valhalla enemies", ヘルヘイム: "Helheim enemies", マアト: "Maat enemies", ヘリオポリス: "Heliopolis enemies",
  ヌン: "Nun enemies", オンボス: "Ombos enemies", アアル: "Aaru enemies", マジムン: "Majimun", ハデス: "Hades enemies",
  夏: "Summer enemies", 聖夜: "Christmas enemies", 正月: "New Year enemies", バレンタイン: "Valentine's enemies",
  肝試し: "Test of Courage enemies", ハロウィン: "Halloween enemies", 花嫁: "Bridal enemies", 学園: "School enemies",
};

/** English for a tag-style game name: "[夏]城娘", "関東城娘", "鉄砲城娘", "平を含む城", "水城", enemy types. */
export function tagEN(jp: string): string | undefined {
  const tr = (x: string) => TRAIT_EN[x] ?? CATEGORY_JP_EN[x] ?? REGION_EN[x] ?? WEAPON_EN[x] ?? ENEMY_EN[x];
  // a group plus the owner's own ambush units: "[夏]城娘と自身の伏兵"
  let m = /^(.+)と自身の伏兵$/.exec(jp);
  if (m) return `${tagEN(m[1]) ?? m[1]} and own ambush units`;
  m = /^\[(.+)\]城娘(.*)$/.exec(jp);
  if (m && tr(m[1])) return `${tr(m[1])} castle girls${suffixEN(m[2])}`;
  m = /^(.+?)城娘(.*)$/.exec(jp);
  if (m && (REGION_EN[m[1]] || WEAPON_EN[m[1]])) return `${REGION_EN[m[1]] ?? WEAPON_EN[m[1]]} castle girls${suffixEN(m[2])}`;
  m = /^★(\d)城娘(.*)$/.exec(jp);
  if (m) return `★${m[1]} castle girls${suffixEN(m[2])}`;
  // "平を含む城" = every castle type that has Plain (dual-terrain ones too); "平城" = exactly Plain
  m = /^(.+)を含む城?$/.exec(jp);
  if (m && CASTLE_EN[m[1]]) return `${CASTLE_EN[m[1]]} castle girls`;
  m = /^(.+)城$/.exec(jp);
  if (m && m[1].split("/").every((x) => CASTLE_EN[x])) {
    const parts = m[1].split("/").map((x) => CASTLE_EN[x]);
    return parts.length > 1 ? `${parts.join("/")} castle girls` : `${parts[0]}-only castle girls`;
  }
  if (jp.includes("・")) {
    const parts = jp.split("・").map((p) => tagEN(p) ?? p);
    return parts.join(", ");
  }
  // several tags at once: "[魔女][JFW基地]城娘"
  m = /^((?:\[[^\]]+\])+)城娘(.*)$/.exec(jp);
  if (m) {
    const tags = [...m[1].matchAll(/\[([^\]]+)\]/g)].map((t) => tr(t[1]) ?? setName(t[1]) ?? t[1]);
    return `${tags.join(" / ")} castle girls${suffixEN(m[2])}`;
  }
  // units in a crowd-control state: "「絶望」状態の敵"
  m = /^「(.+)」状態(?:の(.+))?$/.exec(jp);
  if (m) return `${m[2] ? (tagEN(m[2]) ?? JP_EN[m[2]] ?? m[2]) : "units"} in ${JP_EN[m[1]] ?? m[1]}`;
  if (setName(jp)) return setName(jp);
  // the game's internal enemy categories, translated literally: 特殊2 = Special 2, イベント3 = Event 3
  m = /^(特殊|イベント|エネミーセット)(\d*)$/.exec(jp);
  if (m) return `${{ 特殊: "Special", イベント: "Event", エネミーセット: "Enemy set" }[m[1]]}${m[2] ? ` ${m[2]}` : ""} enemies`;
  return ENEMY_EN[jp] ?? TRAIT_EN[jp];
}
const suffixEN = (s: string) => (s === "(自身を除く)" ? " except self" : s);
/** 城娘セット18..50: trait sets the game never names. */
const setName = (jp: string) => (/^城娘セット(\d+)$/.exec(jp) ? `unnamed trait set ${/\d+/.exec(jp)![0]}` : undefined);

/** CardCategoryName.atb Japanese -> English (keyed by name, for composite tags). */
const CATEGORY_JP_EN: Record<string, string> = {
  魔法少女: "Magical Girl", 冒険者: "Adventurer", 騎士: "Knight", ラボメン: "Lab Member", 兜娘: "Kabuto Girl",
  超高校級: "Ultimate", 希望ヶ峰学園: "Hope's Peak Academy", 魔女: "Witch", JFW基地: "JFW Base",
  アイギス戦士: "Aigis Warrior", モンスター娘: "Monster Girl", 能力者: "Esper", 魔術師: "Magician",
  学園都市: "Academy City", 進撃の巨人: "Attack on Titan", ｼﾞｬﾊﾞｳｫｯｸ島: "Jabberwock Island", 城姫: "Castle Princess",
  ヴァイス: "Weiss", GuP: "Girls und Panzer", "T．O．W．E．R．": "T.O.W.E.R.",
};

/** A castle girl's display name: English when translated, else the game's Japanese. */
export function unitName(u: { name: string; name_en?: string | null } | undefined | null): string {
  return u ? u.name_en || u.name : "";
}
