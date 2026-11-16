// UI language (EN / 日本語). The game data is Japanese: in Japanese mode labels show the game's own words,
// in English the hand-made translations (labels.ts); decoded effect sentences are reworded by effectsJa.ts.
import { useSyncExternalStore } from "react";
import { clauseJa, effectJaCached, hasEnglish, receiverJa } from "./effectsJa";
import { createPersisted } from "@altterisk/game-hub/persist";
import type { HubBarLabels, HubFooterLabels, ErrorBoundaryLabels, PagerLabels, LoadStateLabels, ListToolbarLabels, FilterPanelLabels } from "@altterisk/game-hub";

export type Lang = "en" | "ja";

export const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "日本語" },
];

const stored = createPersisted<Lang>({
  key: "oshiro.lang", version: 1,
  // first visit: the browser's language
  empty: () => (typeof navigator !== "undefined" && /^ja\b/i.test(navigator.language || "") ? "ja" : "en"),
  sanitize: (raw) => (raw === "ja" ? "ja" : "en"),
});

let current: Lang = stored.load();
const listeners = new Set<() => void>();
if (typeof document !== "undefined") document.documentElement.lang = current;

export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  stored.save(lang);
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((f) => f());
}

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

/** The UI language; the calling component re-renders when it changes. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

/** English or the Japanese, by the current language. */
export const pick = (en: string, ja: string, lang: Lang = current): string => (lang === "ja" ? ja : en);

/** `{name}` placeholders, so a translated sentence can reorder its parts. */
export function fill(text: string, vars?: Record<string, string | number>): string {
  return vars ? text.replace(/\{(\w+)\}/g, (whole, k: string) => (k in vars ? String(vars[k]) : whole)) : text;
}

export const UI = {
  language: { en: "Language", ja: "言語" },
  navUnits: { en: "Units", ja: "城娘" },
  navBuffs: { en: "Buffs", ja: "バフ" },
  navStages: { en: "Stages", ja: "ステージ" },
  navEquipment: { en: "Equipment", ja: "武器" },

  // equipment
  equipTitle: { en: "Equipment", ja: "武器" },
  equipSubtitle: {
    en: "Every weapon (装備) in the game: stats, abilities, the castle girls it suits, and where it comes from.",
    ja: "ゲーム内の全武器: 性能・特技・相性の良い城娘・入手方法。",
  },
  searchWeapons: { en: "Search id / name", ja: "ID・名前で検索" },
  nWeapons: { en: "{n} weapons", ja: "武器 {n}種" },
  showGear: { en: "Initial gear / materials / placeholders", ja: "初期装備・素材・代替表示" },
  obtain: { en: "Source", ja: "入手" },
  srcGroupUnit: { en: "Dedicated (castle girl)", ja: "専用武器" },
  srcGroupStage: { en: "Stage reward", ja: "ステージ報酬" },
  srcGroupExchange: { en: "Exchange / event", ja: "交換・イベント" },
  srcGroupPack: { en: "Pack", ja: "パック" },
  srcGroupSummon: { en: "Summon bonus", ja: "召喚特典" },
  srcGroupLogin: { en: "Login / mission / campaign", ja: "ログイン・任務・キャンペーン" },
  srcGroupEvolution: { en: "Upgrade (改)", ja: "改" },
  srcGroupNone: { en: "Not in current data", ja: "現データになし" },
  noMatchWeapons: { en: "No weapons match these filters.", ja: "条件に合う武器はありません。" },
  noWeapon: { en: "No weapon #{id}.", ja: "武器 #{id} は見つかりません。" },
  weaponStats: { en: "Stats", ja: "性能" },
  weaponStatsNote: { en: "Added to the castle girl's stats when equipped (before strengthening).", ja: "装備時に城娘のステータスに加算 (強化前)。" },
  attackSpeedPct: { en: "Attack speed", ja: "攻撃速度" },
  weaponAbility: { en: "Ability", ja: "特技" },
  weaponSpecial: { en: "Bonus for specific castle girls", ja: "特定の城娘への追加効果" },
  weaponSpecialNote: { en: "Extra stats and effects when one of these castle girls equips it.", ja: "これらの城娘が装備すると追加される性能と効果。" },
  weaponSources: { en: "How to get it", ja: "入手方法" },
  weaponNoSource: {
    en: "The current game data names no source. Low-rarity gear is crafted (鍛冶); most others were rewards of past events, whose reward tables are no longer in the data.",
    ja: "現在のゲームデータに入手方法の記載がありません。低レアリティは鍛冶、その他の多くは過去イベントの報酬です (報酬データは削除済み)。",
  },
  upgradesTo: { en: "Upgrades to", ja: "改後" },
  kindInitial: { en: "Initial / dedicated gear", ja: "初期・専用装備" },
  kindMaterial: { en: "Upgrade material", ja: "強化素材" },
  kindPlaceholder: { en: "Reward placeholder (a random weapon of this kind)", ja: "報酬の代替表示 (この種類の武器からランダム)" },
  plusN: { en: "+{n}", ja: "+{n}" },
  timesN: { en: "×{n}", ja: "×{n}" },
  srcUnit: { en: "Dedicated weapon of {name}", ja: "{name}の専用武器" },
  srcDrop: { en: "Stage drop: {quest}", ja: "ドロップ: {quest}" },
  srcFirstClear: { en: "First clear: {quest}", ja: "初回クリア報酬: {quest}" },
  srcAchievement: { en: "戦功 reward: {quest}", ja: "戦功報酬: {quest}" },
  srcLogin: { en: "Login bonus {date}", ja: "ログインボーナス {date}" },
  srcLoginBeginner: { en: "Beginner login bonus, day {n}", ja: "初心者ログインボーナス {n}日目" },
  srcMission: { en: "Beginner mission: {text}", ja: "初心者任務: {text}" },
  srcCampaign: { en: "Campaign: {title} ({date})", ja: "キャンペーン: {title} ({date})" },
  srcExchange: { en: "ゆかり exchange for {cost} ({date} – {until})", ja: "ゆかり交換 {cost} ({date}〜{until})" },
  srcShop: { en: "Shop for {cost}", ja: "ショップ {cost}" },
  srcTower: { en: "Tower event reward (score {n})", ja: "塔イベント報酬 (スコア{n})" },
  srcVote: { en: "{title} reward ({votes} votes)", ja: "{title}報酬 ({votes}票)" },
  srcRental: { en: "Castle rental reward (level {n})", ja: "城娘レンタル報酬 (Lv{n})" },
  srcPack: { en: "Pack: {title} ({date})", ja: "パック: {title} ({date})" },
  srcSummon: { en: "Summon set: {title}", ja: "召喚セット: {title}" },
  srcSummonStep: { en: "Step-up summon bonus, step {n}", ja: "ステップアップ召喚特典 ステップ{n}" },
  srcBead: { en: "Spirit bead purchase bonus ({date})", ja: "霊珠購入特典 ({date})" },
  srcEvolution: { en: "Upgrade of {weapon}", ja: "{weapon}を改" },
  footerSource: { en: "Source on GitHub", ja: "GitHub のソース" },
  footerPortfolio: { en: "Portfolio", ja: "ポートフォリオ" },
  backToList: { en: "Back to the castle girl list", ja: "城娘一覧へ戻る" },
  pageNotFound: { en: "Page not found.", ja: "ページが見つかりません。" },
  unnamed: { en: "(unnamed)", ja: "(名前なし)" },
  notDecoded: { en: "(not decoded)", ja: "(未解析)" },
  noAbilities: { en: "No abilities.", ja: "特技なし。" },

  // castle girl list and filters
  searchUnits: { en: "Search id / name / reading", ja: "ID・名前・読みで検索" },
  nCastleGirls: { en: "{n} castle girls", ja: "城娘 {n}体" },
  newestFirst: { en: "Newest first", ja: "新しい順" },
  twinEntries: { en: "Transformed / twin entries", ja: "変身・別カード" },
  npcEntries: { en: "Tokens / NPC / fodder", ja: "トークン・NPC・素材" },
  rarity: { en: "Rarity", ja: "レアリティ" },
  weapon: { en: "Weapon", ja: "武器" },
  terrain: { en: "Terrain", ja: "属性" },
  renovation: { en: "Renovation", ja: "改築" },
  region: { en: "Region", ja: "地域" },
  trait: { en: "Trait", ja: "特性" },
  category: { en: "Category", ja: "カテゴリ" },
  otherCollab: { en: "Other (collab)", ja: "その他 (コラボ)" },
  kaiNiOpt: { en: "Kai Ni 改弐", ja: "改弐" },
  kaiOpt: { en: "Kai 改壱 (no Kai Ni)", ja: "改壱 (改弐なし)" },
  noRenovation: { en: "No renovation", ja: "改築なし" },
  noMatchUnits: { en: "No castle girls match these filters.", ja: "条件に合う城娘はいません。" },
  noMatchHint: { en: "Change the search or clear the filters.", ja: "検索を変えるか、絞り込みを解除してください。" },
  kaiNiBadge: { en: "Kai Ni", ja: "改弐" },
  kaiNiTitle: { en: "Has a 改弐 (Kai Ni) renovation", ja: "改弐あり" },
  twinOf: { en: "twin of #{id}", ja: "#{id} の別カード" },
  transformedOf: { en: "transformed #{id}", ja: "#{id} の変身" },
  cardType: { en: "type {n}", ja: "種別 {n}" },
  clearUnitFilters: { en: "Clear castle girl filters", ja: "城娘の絞り込みを解除" },

  // castle girl page
  castleGirls: { en: "Castle Girls", ja: "城娘" },
  noUnit: { en: "No castle girl #{id}.", ja: "城娘 #{id} は見つかりません。" },
  backShort: { en: "Back to the list", ja: "一覧へ戻る" },
  cv: { en: "CV", ja: "CV" },
  cardTypeLabel: { en: "Card type", ja: "カード種別" },
  twinNotice: { en: "Twin entry of {link} (same name, alternate card).", ja: "{link} の別カード (同名の別カード)。" },
  transformNotice: { en: "Transformed state of {link}: what that castle girl becomes while her stratagem is active.", ja: "{link} の変身後: 計略の発動中に変化する姿。" },
  abilities: { en: "Abilities", ja: "特技" },
  specialAbility: { en: "Special ability", ja: "特殊能力" },
  transformedState: { en: "Transformed state", ja: "変身後" },
  transformNote: { en: "Her {what} transforms her into {link}; these apply until it ends.", ja: "{what}で {link} に変身し、終了までこれらが適用されます。" },
  whatSpecial: { en: "special ability", ja: "特殊能力" },
  whatStratagem: { en: "stratagem", ja: "計略" },
  stratagemEffects: { en: "Stratagem effects", ja: "計略の効果" },
  switchWeapon: { en: "Switch weapon", ja: "武器切替" },
  switchWeaponSub: { en: "Switch weapon (sub-class)", ja: "武器切替 (サブクラス)" },
  otherAbilities: { en: "Other abilities", ja: "その他の能力" },
  generalAbility: { en: "General ability", ja: "汎用能力" },
  beforeAttack: { en: "Before attack", ja: "攻撃前" },
  movingAttack: { en: "Moving attack", ja: "移動攻撃" },
  classTitle: { en: "Class", ja: "クラス" },
  classAbility: { en: "Class ability", ja: "クラス特性" },
  potential: { en: "Potential 潜在", ja: "潜在" },
  stats: { en: "Stats", ja: "ステータス" },
  statsNote: {
    en: "Class base values (initial → max level). Card corrections are percentages the game applies on top; the final-stat formula is not decoded yet.",
    ja: "クラスの基礎値 (初期 → 最大レベル)。カード補正はその上にかかる割合です。最終ステータスの計算式は未解析です。",
  },
  cost: { en: "Cost", ja: "コスト" },
  maxLevel: { en: "Max level", ja: "最大レベル" },
  range: { en: "Range", ja: "射程" },
  hp: { en: "HP 耐久", ja: "耐久" },
  atk: { en: "ATK 攻撃", ja: "攻撃" },
  def: { en: "DEF 防御", ja: "防御" },
  regen: { en: "Regen 回復", ja: "回復" },
  targets: { en: "Targets", ja: "攻撃対象数" },
  block: { en: "Block", ja: "足止め数" },
  hpCorr: { en: "HP correction", ja: "耐久補正" },
  atkCorr: { en: "ATK correction", ja: "攻撃補正" },
  defCorr: { en: "DEF correction", ja: "防御補正" },
  regenCorr: { en: "Regen correction", ja: "回復補正" },
  weaponTitle: { en: "Weapon: {name}", ja: "武器: {name}" },
  dedicatedWeapon: { en: "Dedicated weapon", ja: "専用武器" },
  otherVersions: { en: "Other versions", ja: "他のバージョン" },
  profile: { en: "Profile", ja: "プロフィール" },
  rawCard: { en: "Raw card data", ja: "カードの生データ" },
  fromTier: { en: "from {tier}", ja: "{tier}から" },
  fromTierTitle: { en: "This renovation doesn't change this slot", ja: "この改築ではこの枠は変わりません" },
  specialty: { en: "Specialty 特技", ja: "特技" },
  formation: { en: "Formation specialty 編成特技", ja: "編成特技" },
  possession: { en: "Possession ability 所持", ja: "所持" },
  onDefeat: { en: "On defeat 撃破時", ja: "撃破時" },
  alwaysAbility: { en: "Always ability 常時能力 (built into her stats: see the stat simulator)", ja: "常時能力 (ステータスに加算: ステータス計算を参照)" },
  questAbility: { en: "Quest ability", ja: "クエスト能力" },
  stratagem: { en: "Stratagem 計略", ja: "計略" },
  stratagemMember: { en: "Stratagem (set member)", ja: "計略 (切替先)" },
  notInGimmick: { en: "(not in Gimmick.atb)", ja: "(Gimmick.atb にありません)" },
  notInAbility: { en: "(not in the ability tables)", ja: "(特技テーブルにありません)" },
  noText: { en: "(no text)", ja: "(テキストなし)" },
  ki: { en: "Ki {n}", ja: "気 {n}" },
  cooldown: { en: "Cooldown {n}s", ja: "再使用 {n}秒" },
  stock: { en: "Stock {n}", ja: "ストック {n}" },
  duration: { en: "Duration {n}s", ja: "効果時間 {n}秒" },
  reuse: { en: "Reuse {n}s", ja: "再使用 {n}秒" },
  deployWait: { en: "Usable {n}s after deploy", ja: "配置 {n}秒後から使用可能" },
  switchesWeapon: { en: "Switches weapon:", ja: "武器切替:" },
  places: { en: "Places", ja: "配置:" },
  upTo: { en: " (up to {n})", ja: " (最大{n}体)" },
  placedAbility: { en: "Placed unit's ability", ja: "伏兵の特技" },
  specialAttack: { en: "Special attack", ja: "特殊攻撃" },
  combined: { en: "Combined", ja: "合計" },
  evidence: { en: "Words taken from the game's ability descriptions:", ja: "ゲームの特技説明文から取った語:" },
  rawFields: { en: "raw fields", ja: "生データ" },
  rawFieldsN: { en: "raw fields ({n} rows)", ja: "生データ ({n}行)" },
  allZero: { en: "(all zero)", ja: "(すべて0)" },
  rows: { en: "{n} rows", ja: "{n}行" },
  row: { en: "1 row", ja: "1行" },
  lb: { en: "LB {n}", ja: "限界突破 {n}" },
  classId: { en: "class #{id}", ja: "クラス #{id}" },

  // buffs
  buffTitle: { en: "Buff ranking", ja: "バフランキング" },
  buffSubtitle: {
    en: "Who gives the biggest effect, by stat, source and receiver. One row per castle girl and receiver (her best for it), ranked within each source.",
    ja: "ステータス・効果元・対象ごとに、最も大きい効果を与える城娘。城娘と対象ごとに1行 (その対象への最大値)、効果元ごとの順位。",
  },
  stackHelp: { en: "How effects stack", ja: "効果の重複について" },
  stackStrongest: {
    en: "<b>Strongest only</b>: plain % changes of one stat keep only the biggest increase and the biggest decrease (and some flat stats, like DEF ignore and Ki refund, do the same).",
    ja: "<b>最大値のみ</b>: 同じステータスの通常の%変化は、最大の上昇と最大の低下だけが適用されます (防御無視や気の返還など一部の固定値も同様)。",
  },
  stackAdds: { en: "<b>Stacks</b>: flat values and the stacking % kind are added together.", ja: "<b>重複</b>: 固定値と重複する種類の%は合算されます。" },
  stackGrow: {
    en: "Growing and per-count effects are ranked by the most they reach (their cap); switch <i>Rank by</i> to compare the base step instead. Effects that grow with no cap are ranked by their step.",
    ja: "上昇していく効果や数に応じた効果は到達する最大値 (上限) で順位付けします。<i>並び替え</i>で基礎値の比較に切り替えられます。上限のない効果は1段階の値で順位付けします。",
  },
  stackScale: { en: "Values are the stored amounts before giantification scaling.", ja: "値は巨大化による補正前のデータ上の値です。" },
  type: { en: "Type", ja: "種類" },
  effect: { en: "Effect", ja: "効果" },
  receiver: { en: "Receiver", ja: "対象" },
  source: { en: "Source", ja: "効果元" },
  any: { en: "Any", ja: "すべて" },
  all: { en: "All", ja: "すべて" },
  nothingMatches: { en: "Nothing matches these filters.", ja: "条件に合うものはありません。" },
  highest: { en: "Highest", ja: "最大改築" },
  unrenovated: { en: "Unrenovated", ja: "未改築" },
  rankBy: { en: "Rank by", ja: "並び替え" },
  maxReached: { en: "Max reached", ja: "最大到達値" },
  baseValue: { en: "Base value", ja: "基礎値" },
  value: { en: "Value", ja: "値" },
  castleGirl: { en: "Castle girl", ja: "城娘" },
  conditions: { en: "Conditions", ja: "条件" },
  max: { en: "max {v}", ja: "最大 {v}" },
  noCap: { en: "no cap", ja: "上限なし" },
  stacks: { en: "stacks", ja: "重複" },
  strongestOnly: { en: "strongest only", ja: "最大値のみ" },
  showTop: { en: "Show top {n}", ja: "上位{n}件を表示" },
  showAll: { en: "Show all {n}", ja: "全{n}件を表示" },
  buffFooter: {
    en: "Built from the same decoded effect rows the castle girl pages show. Effects still shown as raw fields there (undecoded codes, % of another stat, crowd control, damage over time) are not ranked here.",
    ja: "城娘ページと同じ解析済みの効果行から作成しています。そこで生データのまま表示される効果 (未解析のコード、他ステータスの%、状態異常、継続ダメージ) はここでは順位付けしません。",
  },
  catOffense: { en: "Offense", ja: "攻撃" },
  catDefense: { en: "Defense & healing", ja: "防御・回復" },
  catKi: { en: "Ki & cooldowns", ja: "気・再使用" },
  catOther: { en: "Other", ja: "その他" },
  catDebuff: { en: "Enemy debuffs", ja: "敵へのデバフ" },
  catUtility: { en: "Utility", ja: "補助" },
  permanent: { en: "Permanent", ja: "永続" },
  seconds: { en: "{n}s", ja: "{n}秒" },
  reachSelf: { en: "Self", ja: "自身" },
  reachSingle: { en: "Single target", ja: "単体" },
  reachRange: { en: "In range / area", ja: "射程内・範囲" },
  reachWide: { en: "All / formation", ja: "全体・編成" },
  reachGroup: { en: "Tokens & others", ja: "伏兵・その他" },
  srcSkill: { en: "Specialty 特技", ja: "特技" },
  srcFormation: { en: "Formation 編成特技", ja: "編成特技" },
  srcStratagem: { en: "Stratagem 計略", ja: "計略" },
  srcSpecialAttack: { en: "Special attack", ja: "特殊攻撃" },
  srcClass: { en: "Class ability", ja: "クラス特性" },
  srcWeapon: { en: "Weapon", ja: "武器" },
  srcSpecial: { en: "Special ability", ja: "特殊能力" },
  srcPossession: { en: "Possession 所持", ja: "所持" },
  srcDefeat: { en: "On defeat 撃破時", ja: "撃破時" },
  srcToken: { en: "Ambush unit 伏兵", ja: "伏兵" },
  noteSkill: { en: "The castle girl's own specialty: always on while deployed, or on its trigger.", ja: "城娘自身の特技: 配置中は常時、または条件を満たした時に発動。" },
  noteFormation: { en: "Applies to the formation from the start of the battle.", ja: "戦闘開始時から編成に適用されます。" },
  noteStratagem: { en: "Active while the stratagem lasts.", ja: "計略の効果時間中に有効。" },
  noteSpecialAttack: { en: "Applied by the special attack.", ja: "特殊攻撃で適用されます。" },
  noteClass: { en: "Every castle girl of the class has it.", ja: "そのクラスの城娘すべてが持っています。" },
  noteWeapon: { en: "The weapon type's own attack (its description).", ja: "武器種そのものの攻撃 (武器の説明文より)。" },
  noteSpecial: { en: "Special ability (sub-ability) effects.", ja: "特殊能力 (サブ能力) の効果。" },
  notePossession: { en: "Applies while the castle girl is owned / in the formation.", ja: "所持中・編成中に適用されます。" },
  noteDefeat: { en: "When the castle girl is defeated.", ja: "城娘の撃破時。" },
  noteToken: { en: "Abilities of the ambush unit (伏兵) her stratagem places.", ja: "計略で配置する伏兵の特技。" },

  // stages
  stagesTitle: { en: "Stages", ja: "ステージ" },
  stagesSubtitle: {
    en: "Stages with their enemies, stats and, for Hell, Hades and Bushin, the deliberations (審議) you can toggle. Grouped by event; past events are rebuilt from maps still in the game client's cache, and stages the game removes stay here.",
    ja: "ステージの敵とステータス。地獄・ハデス・武神は審議を切り替えられます。イベントごとにまとめ、過去のイベントはクライアントのキャッシュに残るマップから復元しています。ゲームから削除されたステージも残ります。",
  },
  searchStages: { en: "Search stage, event or Bushin", ja: "ステージ・イベント・武神で検索" },
  series: { en: "Series", ja: "シリーズ" },
  show: { en: "Show", ja: "表示" },
  currentAndPast: { en: "Current and past", ja: "開催中と過去" },
  currentOnly: { en: "Current only", ja: "開催中のみ" },
  noStage: { en: "No stage matches.", ja: "条件に合うステージはありません。" },
  withoutEvent: { en: "Without an event", ja: "イベントなし" },
  since: { en: "since {d}", ja: "{d}〜" },
  past: { en: "past", ja: "終了" },
  pastTitle: { en: "No stage of this event is in the game's current quest list", ja: "このイベントのステージは現在のクエスト一覧にありません" },
  nStages: { en: "{n} stages", ja: "{n}ステージ" },
  cache: { en: "cache", ja: "キャッシュ" },
  cacheTitle: { en: "Rebuilt from the cached map: no stage multipliers or names in the data", ja: "キャッシュのマップから復元: 補正値や名前はデータにありません" },
  removed: { en: "removed", ja: "削除済み" },
  enemiesSpawns: { en: "{e} enemies · {s} spawns", ja: "敵{e}種 · 出現{s}回" },
  quest: { en: "Quest #{id}", ja: "クエスト #{id}" },
  mapN: { en: "map {n}", ja: "マップ {n}" },
  mapAlt: { en: "{name} map", ja: "{name} のマップ" },
  recovered: {
    en: "This stage is from a past event and no longer in the game's quest list: it was rebuilt from the map still in the client cache, so its own name, stage multipliers and Ki aren't in the data.",
    ja: "過去のイベントのステージで、現在のクエスト一覧にはありません。クライアントのキャッシュに残るマップから復元したため、名前・補正値・気はデータにありません。",
  },
  recoveredEst: { en: " The multipliers below are estimated from the live Bushin of the same rank.", ja: " 下の補正値は同じランクの現行の武神から推定しています。" },
  recoveredBase: { en: " Enemy stats below are their base values.", ja: " 下の敵ステータスは基礎値です。" },
  removedStage: { en: "Removed from the game's quest list; kept from an earlier export.", ja: "クエスト一覧から削除済み。以前のデータから残しています。" },
  initialKi: { en: "Initial Ki {n}", ja: "初期気 {n}" },
  coreLife: { en: "Core life {n}", ja: "耐久 {n}" },
  difficulty: { en: "Difficulty", ja: "難易度" },
  normal: { en: "Normal", ja: "通常" },
  hard: { en: "Hard", ja: "難" },
  hardVery: { en: "Hard / 超難", ja: "超難" },
  multipliers: { en: "Multipliers", ja: "補正" },
  estimated: { en: "Estimated", ja: "推定" },
  noneBase: { en: "None (base stats)", ja: "なし (基礎値)" },
  stageMult: { en: "Stage multipliers (攻撃/耐久/防御補正): ATK ×{a}, HP ×{h}, DEF ×{d}", ja: "攻撃/耐久/防御補正: 攻撃 ×{a}、耐久 ×{h}、防御 ×{d}" },
  estFrom: { en: " — estimated: the live Bushin of this rank ({from}) use {values} (ATK/HP/DEF); {n} of {of} use these", ja: " — 推定: このランクの現行の武神 ({from}) は {values} (攻撃/耐久/防御)。{of}件中{n}件がこの値" },
  or: { en: " or ", ja: " または " },
  mapEffects: { en: "Map effects マップ効果", ja: "マップ効果" },
  mapEffectsNote: { en: "Active for the whole stage.", ja: "ステージ全体で有効。" },
  simAtkSpeed: { en: "Attack speed (潜在)", ja: "攻撃速度 (潜在)" },
  simTitle: { en: "Stat simulator", ja: "ステータス計算" },
  simNote: { en: "The game's own formula: level, 改 / 改壱, limit breaks (with their 潜在 bonuses) and giantification, with the always ability. Equipment, skills and buffs are not included.", ja: "ゲーム内の計算式 (レベル・改/改壱・限界突破と潜在・巨大化・常時能力)。武器・特技・バフは含みません。" },
  simBase: { en: "Base", ja: "通常" },
  simReno: { en: "Renovation", ja: "改築" },
  simLevel: { en: "Level", ja: "レベル" },
  simLimitBreak: { en: "Limit breaks", ja: "限界突破" },
  simLimitBreakNote: { en: "+10 level cap each (max 150)", ja: "1回につきレベル上限+10 (最大150)" },
  simGiant: { en: "Giantification 巨大化", ja: "巨大化" },
  simCorr: { en: "Corrections HP/ATK/DEF/Regen", ja: "補正 耐久/攻撃/防御/回復" },
  simGrowth: { en: "Giant bonus HP/ATK/DEF/Regen/Range", ja: "巨大化補正 耐久/攻撃/防御/回復/射程" },
  simKi: { en: "Ki to giantify into each stage:", ja: "巨大化消費気 (各段階):" },
  simAlways: { en: "Includes the always ability (常時能力) stat bonus.", ja: "常時能力のステータス補正を含みます。" },
  simAlwaysNone: { en: "Its always ability (常時能力) changes no base stat.", ja: "常時能力は基礎ステータスを変えません。" },
  mapTitle: { en: "Deployment map 配置マップ", ja: "配置マップ" },
  mapNote: { en: "Spots and markers from the game's map data. Labels are numbered by the game's spot ID; share them with Copy image or Download PNG.", ja: "マス・マーカーはゲームのマップデータから。番号はゲーム内のマスID順です。画像のコピー・PNG保存で共有できます。" },
  mapK4: { en: "Melee 近接 (red)", ja: "近接 (赤)" },
  mapK5: { en: "Ranged 遠隔 (blue)", ja: "遠隔 (青)" },
  mapK1: { en: "Either 赤/青 (any castle girl)", ja: "赤/青 (どの城娘も配置可)" },
  mapK9: { en: "Water 水上マス (軍船, some ambushers)", ja: "水上マス (軍船・一部の伏兵)" },
  mapK0: { en: "本陣 (the lord's camp)", ja: "本陣" },
  mapK2: { en: "Storehouse 蔵", ja: "蔵" },
  mapK3: { en: "Buildings", ja: "建造物" },
  mapK7: { en: "Pre-placed units", ja: "配置済みの味方" },
  mapK8: { en: "Hazard tiles 配置効果", ja: "配置効果マス" },
  mapKx: { en: "Other points (not decoded)", ja: "その他 (未解読)" },
  mapPhases: { en: "The map changes during this battle:", ja: "合戦中にマップが変化します:" },
  mapStart: { en: "Start", ja: "開始" },
  mapLayout: { en: "layout {n}", ja: "配置{n}" },
  mapLayout0: { en: "start layout", ja: "初期配置" },
  mapDownload: { en: "Download PNG", ja: "PNG保存" },
  mapCopyImage: { en: "Copy image", ja: "画像をコピー" },
  mapCopyLink: { en: "Copy link", ja: "リンクをコピー" },
  mapCopied: { en: "Copied", ja: "コピーしました" },
  mapCopyFailed: { en: "Copy failed", ja: "コピーできませんでした" },
  mapUnavailable: { en: "Map image unavailable.", ja: "マップ画像がありません。" },
  mapLoading: { en: "Loading map…", ja: "マップを読み込み中…" },
  mapRemoved: { en: "{name} removes {spots} (crossed out on the map).", ja: "{name}: {spots} が消失 (マップ上で✕)。" },
  singiRemoves: { en: "Removes {spots}", ja: "消失: {spots}" },
  mapPe: { en: "Spot effect 配置効果 on {spots}", ja: "配置効果: {spots}" },
  mapOffMap: { en: "not on the map", ja: "マップ外" },
  mapBuildingRow: { en: "Building #{id}: HP {hp}, DEF {def}", ja: "建造物 #{id}: 耐久 {hp}、防御 {def}" },
  mapBlocker: { en: " · blocks every enemy", ja: " · 全ての敵を足止め" },
  mapCapturable: { en: " · has an ability", ja: " · 効果あり" },
  mapLv: { en: "Lv{n}", ja: "Lv{n}" },
  mapAria: { en: "Map of {name}: {m} melee, {r} ranged, {a} either and {w} water spots", ja: "{name} のマップ: 近接{m}、遠隔{r}、赤/青{a}、水上{w}" },
  deliberations: { en: "Deliberations 審議 · {n} points", ja: "審議 · {n}ポイント" },
  goldSilver: { en: "Gold at {g}, silver at {s} points.", ja: "{g}ポイントで金、{s}ポイントで銀。" },
  sameGroup: { en: "Options in the same group can't be chosen together.", ja: "同じグループの項目は同時に設定できません。" },
  clearDelib: { en: "Clear deliberations", ja: "審議を解除" },
  enemies: { en: "Enemies", ja: "敵" },
  enemiesNote: { en: "Stats ×stage multiplier{then}. Hover a number for the base value.", ja: "ステータス ×ステージ補正{then}。数値にカーソルを合わせると基礎値を表示します。" },
  thenDelib: { en: ", then the chosen deliberations", ja: "、さらに選んだ審議" },
  ownAbility: { en: "■ the enemy's own ability", ja: "■ 敵自身の特技" },
  fromDelib: { en: "■ from deliberations", ja: "■ 審議による変化" },
  enemy: { en: "Enemy", ja: "敵" },
  thHp: { en: "HP", ja: "耐久" },
  thAtk: { en: "ATK", ja: "攻撃" },
  thDef: { en: "DEF", ja: "防御" },
  thMdef: { en: "Magic DEF", ja: "術防御" },
  thRange: { en: "Range", ja: "射程" },
  thMove: { en: "Move", ja: "移動" },
  thAbilities: { en: "Abilities & changes", ja: "特技と変化" },
  groupN: { en: "group {n}", ja: "グループ {n}" },
  groupTitle: { en: "同時設定不可: only one option of this group", ja: "同時設定不可" },
  changesEnemies: { en: "changes enemies", ja: "敵に影響" },
  decodedRows: { en: "decoded effect rows", ja: "解析済みの効果行" },
  textOnly: { en: "No effect rows in the data (text only).", ja: "データに効果行がありません (テキストのみ)。" },
  formAt: { en: "↳ form ({form})", ja: "↳ 変化 ({form})" },
  atRoutePoint: { en: "at a point of its route", ja: "経路上の地点で" },
  afterSec: { en: "after {n}s", ja: "{n}秒後" },
  transformTrigger: { en: "transform trigger {n}", ja: "変化条件 {n}" },
  mapHelper: { en: "{name} (map helper, no name)", ja: "{name} (マップ用、名前なし)" },
  girlPage: { en: "castle girl page", ja: "城娘ページ" },
  flying: { en: "flying", ja: "飛行" },
  magicAttack: { en: "magic attack", ja: "術攻撃" },
  boss: { en: "boss", ja: "ボス" },
  attackWait: { en: "Attack wait {n}", ja: "攻撃間隔 {n}" },
  targetsN: { en: "Targets {n}", ja: "攻撃対象 {n}" },
  needsBlockers: { en: "Needs {n} blockers", ja: "足止めに{n}必要" },
  coreDamage: { en: "Core damage {n}", ja: "耐久へのダメージ {n}" },
  hpStock: { en: "HP stock {n}", ja: "耐久ストック {n}" },
  enemyN: { en: "Enemy #{id}", ja: "敵 #{id}" },
  ability: { en: "Ability", ja: "特技" },
  noName: { en: "(no name)", ja: "(名前なし)" },
  attack: { en: "Attack", ja: "攻撃" },
  onDeath: { en: "On death", ja: "撃破時" },
  transformsInto: { en: "Transforms into enemy {ids} (trigger {t}).", ja: "敵 {ids} に変化 (条件 {t})。" },
  spawnOrder: { en: "Spawn order · {n} enemies", ja: "出現順 · {n}体" },
  spawnNote: { en: "Time from the start of the stage (30 frames per second); loops and waits for events are not simulated.", ja: "ステージ開始からの時間 (30フレーム/秒)。ループやイベント待ちは再現していません。" },
  showSpawns: { en: "Show spawn list", ja: "出現リストを表示" },
  hideSpawns: { en: "Hide spawn list", ja: "出現リストを隠す" },
  time: { en: "Time", ja: "時間" },
  route: { en: "Route", ja: "経路" },
  hidden: { en: " (hidden)", ja: " (隠れ)" },
  strength: { en: " · strength {n}", ja: " · 強さ {n}" },

  // home
  navHome: { en: "Home", ja: "ホーム" },
  homeTitle: { en: "Shiro Project:RE Database", ja: "城プロRE データベース" },
  homeSubtitle: {
    en: "Fan-made database of castle girls, equipment, stages and buffs, read from the game's own data.",
    ja: "ゲームデータから作った非公式データベース: 城娘・武器・ステージ・バフ。",
  },
  homeBanners: { en: "Banners", ja: "バナー" },
  homeBannersHint: {
    en: "The home-screen banners of the current game data, in the game's order.",
    ja: "現在のゲームデータのホーム画面バナー (ゲーム内の順)。",
  },
  bannerSummon: { en: "Summon", ja: "招城" },
  bannerEvent: { en: "Event", ja: "イベント" },
  bannerShop: { en: "Shop", ja: "売店" },
  bannerFixed: { en: "Permanent", ja: "常設" },
  bannerEtc: { en: "Other", ja: "その他" },
  bannerArena: { en: "Hell", ja: "地獄" },
  untilMaint: { en: "until the {d} maintenance", ja: "{d} メンテナンスまで" },
  untilTime: { en: "until {d}", ja: "{d}まで" },
  homeEvents: { en: "Current events", ja: "開催中のイベント" },
  noEvents: { en: "No limited-time event is running right now.", ja: "現在開催中の期間限定イベントはありません。" },
  endsIn: { en: "ends in {t}", ja: "残り {t}" },
  daysHours: { en: "{d}d {h}h", ja: "{d}日{h}時間" },
  hoursMins: { en: "{h}h {m}m", ja: "{h}時間{m}分" },
  allStages: { en: "All stages ›", ja: "すべてのステージ ›" },
  homeNewUnits: { en: "New castle girls", ja: "新しい城娘" },
  homeNewUnitsHint: {
    en: "Dated by when each girl's files reached the game's CDN, usually about a week before her release.",
    ja: "城娘のファイルがゲームのCDNに追加された日付 (実装の約1週間前)。",
  },
  homeNewEquip: { en: "New equipment", ja: "新しい武器" },
  homeNewEquipHint: {
    en: "Dated by the earliest source in the data: pack or exchange date, the event of the stage that drops it, or the weapon it upgrades from. Equipment with no dated source isn't listed.",
    ja: "データ内の最も早い入手元の日付: パック・交換所の日付、ドロップするステージのイベント、改築元の武器。日付の分からない武器は表示しません。",
  },
  addedOn: { en: "added {d}", ja: "{d} 追加" },
  addedAfter: { en: "added {d} or later", ja: "{d} 以降に追加" },
  allUnits: { en: "All castle girls ›", ja: "すべての城娘 ›" },
  allEquipment: { en: "All equipment ›", ja: "すべての武器 ›" },
  homeLinkUnits: { en: "Stats, abilities, stratagems and renovation tiers of every castle girl", ja: "全城娘のステータス・特技・計略・改築" },
  homeLinkBuffs: { en: "Castle girls ranked by the buffs and debuffs they give", ja: "バフ・デバフで城娘をランキング" },
  homeLinkEquipment: { en: "Every weapon: stats, abilities and where it comes from", ja: "全武器の性能・特技・入手方法" },
  homeLinkStages: { en: "Enemies, deliberations and maps of every stage", ja: "全ステージの敵・審議・マップ" },
} satisfies Record<string, { en: string; ja: string }>;

export type UiKey = keyof typeof UI;

export function text(lang: Lang, key: UiKey, vars?: Record<string, string | number>): string {
  return fill(UI[key][lang], vars);
}

/** t(key, vars) in the current language; the component re-renders when the language changes. */
export function useT(): (key: UiKey, vars?: Record<string, string | number>) => string {
  const lang = useLang();
  return (key, vars) => text(lang, key, vars);
}

// labels for the shared game-hub parts
export function hubLabels(lang: Lang) {
  const ja = lang === "ja";
  const bar: Partial<HubBarLabels> | undefined = ja
    ? { switchGame: "ゲームを切り替え", allGames: "すべてのゲーム", here: "表示中", menu: "メニュー", closeMenu: "メニューを閉じる" } : undefined;
  const footer: Partial<HubFooterLabels> | undefined = ja ? {
    source: "ソース", portfolio: "ポートフォリオ", donate: "Ko-fi", allGames: "すべてのゲーム",
    rights: (owner, title) => `非公式のファンサイトです。${title}の画像・データ・その他のゲーム素材は${owner}に帰属します。`,
    unowned: "非公式のファンサイトです。ゲームの画像・音声・テキストは各権利者に帰属します。",
    license: "サイトのコード: AGPL-3.0",
  } : undefined;
  const error: Partial<ErrorBoundaryLabels> | undefined = ja
    ? { title: "このページで問題が発生しました。", hint: "もう一度試すか、ページを再読み込みしてください。", retry: "再試行" } : undefined;
  const pager: Partial<PagerLabels> | undefined = ja
    ? { first: "« 最初", prev: "‹ 前", next: "次 ›", last: "最後 »", page: (p, n) => `${p} / ${n} ページ`, jump: "ページへ移動" } : undefined;
  const load: Partial<LoadStateLabels> | undefined = ja ? { loading: "読み込み中…", error: "データを読み込めませんでした。", retry: "再試行" } : undefined;
  const toolbar: Partial<ListToolbarLabels> | undefined = ja ? { clearFilters: "絞り込みを解除" } : undefined;
  const filters: Partial<FilterPanelLabels> | undefined = ja ? { filters: "絞り込み", show: "絞り込みを表示", hide: "絞り込みを隠す" } : undefined;
  return { bar, footer, error, pager, load, toolbar, filters, skip: ja ? "本文へ移動" : undefined, clearSearch: ja ? "検索をクリア" : undefined };
}

export const useHubLabels = () => hubLabels(useLang());

const whole = (s: string, ja: string) => (hasEnglish(ja) ? s : ja);
/** Decoded effect text in the current language: a sentence, a receiver ("Castle girls in range") or a note
 *  ("for 30s"). Japanese comes from src/effectsJa.ts; a line it can't fully word stays English. */
export function useFx() {
  const ja = useLang() === "ja";
  return {
    line: (s: string) => (ja && s ? effectJaCached(s) ?? s : s),
    who: (s: string) => (ja && s ? whole(s, receiverJa(s)) : s),
    note: (s: string) => (ja && s ? whole(s, clauseJa(s)) : s),
  };
}
