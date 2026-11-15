// Japanese wording of the decoded effect sentences. effects.tsx writes English; this rewrites its output:
// receivers ("Castle girls in range") by their grammar, the notes after an amount ("for 30s", "up to 100%")
// by rules, and every other word from the phrase table. A sentence with any English left returns null so
// the page shows it in English rather than half translated. Coverage: npm run ja.
import { CASTLE_EN, ENEMY_EN, REGION_EN, TRAIT_EN, WEAPON_EN } from "./labels";

/** Proper nouns: the game's own Japanese, from the English tables. */
const NOUNS: Record<string, string> = {};
for (const table of [REGION_EN, WEAPON_EN, TRAIT_EN, CASTLE_EN]) {
  for (const [jp, en] of Object.entries(table)) if (!(en.toLowerCase() in NOUNS)) NOUNS[en.toLowerCase()] = jp;
}
for (const [jp, en] of Object.entries(ENEMY_EN)) {
  NOUNS[en.toLowerCase()] = jp;
  // "Fantasy enemies" also appears as "Fantasy and Special 2 enemies"
  if (/ enemies$/.test(en)) NOUNS[en.toLowerCase().replace(/ enemies$/, "")] = jp;
}
Object.assign(NOUNS, {
  "magical girl": "魔法少女", adventurer: "冒険者", knight: "騎士", "lab member": "ラボメン", "kabuto girl": "兜娘",
  ultimate: "超高校級", "hope's peak academy": "希望ヶ峰学園", witch: "魔女", "jfw base": "JFW基地",
  "aigis warrior": "アイギス戦士", "monster girl": "モンスター娘", esper: "能力者", magician: "魔術師",
  "academy city": "学園都市", "attack on titan": "進撃の巨人", "jabberwock island": "ジャバウォック島",
  "castle princess": "城姫", weiss: "ヴァイス", "girls und panzer": "GuP", "t.o.w.e.r.": "T.O.W.E.R.",
  "dual-sword": "双剣", "dual swords": "双剣", "magic castle girls": "法術城娘",
});

/** Words and phrases (lower case keys), longest match first. */
const PHRASES: Record<string, string> = {
  // receivers
  "castle girl side units": "殿側ユニット", "enemy army units": "敵軍ユニット", "castle girls": "城娘", "castle girl": "城娘",
  "enemy castle girls": "敵城娘", "own ambush units": "自身の伏兵", "own ambush unit": "自身の伏兵", "ambush units": "伏兵",
  "ambush unit": "伏兵", "own tokens": "自身のトークン", tokens: "トークン", "the lord": "殿", lord: "殿", storehouses: "蔵",
  boats: "舟", enemies: "敵", enemy: "敵", units: "ユニット", unit: "ユニット", allies: "味方", ally: "味方",
  "your side": "殿側", self: "自身", target: "対象", all: "全ての", "flying enemies": "飛行敵",
  "non-flying enemies": "飛行以外の敵", yokai: "妖怪", melee: "近接", ranged: "遠隔", "field effect": "フィールド効果",
  flying: "飛行",
  // stats
  "max hp": "最大耐久", "current hp": "現在耐久", hp: "耐久", atk: "攻撃", def: "防御", "magic def": "術防御",
  regen: "回復", "regen interval": "回復間隔", range: "射程", "attack speed": "攻撃速度", "attack gap": "攻撃後の隙",
  targets: "攻撃対象数", "target count": "攻撃対象数", block: "足止め数", "move speed": "移動速度",
  "move and attack speed": "移動速度・攻撃速度", area: "範囲", "blast radius": "爆風範囲", "blast damage": "爆風ダメージ",
  "damage dealt": "与ダメージ", "damage taken": "被ダメージ", "damage dealt and taken": "与ダメージ・被ダメージ",
  "healing received": "被回復量", "healing given": "与回復量", "healing amount": "回復量", "atk vs flying": "飛行敵への攻撃",
  "atk vs yokai": "妖怪への攻撃", "special gauge gain": "特殊攻撃ゲージ蓄積量", "special gauge speed": "特殊攻撃ゲージ蓄積速度",
  "special gauge gain when hit": "被攻撃時の特殊攻撃ゲージ蓄積量", "special gauge gain on attack": "攻撃時の特殊攻撃ゲージ蓄積量",
  "special gauge per stock": "ストック当たりの特殊攻撃ゲージ", "special attack stock": "特殊攻撃ストック",
  "redeploy time": "再配置時間", "time until stratagem": "計略使用までの時間", "time until first stratagem": "初回計略使用までの時間",
  "auto-giantify time": "自動巨大化時間", "auto-giantify time (flat)": "自動巨大化時間(固定値)", "stratagem cooldown": "計略再使用時間",
  "stratagem cooldown progress": "計略再使用の経過", "stratagem stock": "計略ストック", "deploy ki": "配置気",
  "giantify ki": "巨大化気", "stratagem ki cost": "計略消費気", "ki cost": "消費気", "ki gain": "獲得気",
  "ki gain interval": "気回収時間", "ki per kill": "撃破獲得気", "ki refund on retreat/defeat": "撤退大破時の回復気",
  "ki refund on retreat (% of deploy ki)": "撤退時の気返還(配置気の%)", "natural ki gain": "気の自然増加量",
  "exp gain": "獲得経験値", "gold gain": "獲得金", "gold gain (incl. storehouses)": "獲得金と蔵からの入手金",
  "lord exp gain": "獲得殿EXP", "keystone drops": "要石の入手数", "exp from fusion": "城娘合成時の獲得経験値",
  "direct-hit bonus": "直撃ボーナス", "direct-hit bonus (override)": "直撃ボーナス(上書き)", "anti-air bonus": "対空ボーナス",
  "anti-yokai bonus": "妖怪特攻ボーナス", "anti-demon bonus": "魔物特攻ボーナス", "splash damage rate": "範囲ダメージ率",
  "hp drain (% of damage dealt)": "耐久吸収(与ダメージの%)", "hp drain": "耐久吸収", "def ignore": "防御無視",
  "def ignore (flat)": "防御無視(固定値)", "damage multiplier": "与ダメージ倍率", "attack bonus": "特定攻撃ボーナス",
  "damage vs yokai": "妖怪へのダメージ", "damage vs demons": "魔物へのダメージ", "damage vs flying": "飛行敵へのダメージ",
  "damage vs flying (non-missile attacks)": "飛行敵へのダメージ(ミサイル以外の攻撃)",
  "physical damage reduction": "物理ダメージ軽減", "magic damage reduction": "術ダメージ軽減", "magic defense": "術防御",
  "damage reduction": "ダメージ軽減", physical: "物理", magic: "術", "special attack": "特殊攻撃",
  "special gauge": "特殊攻撃ゲージ", "deploy ki reduction": "配置気軽減", "cost reduction": "コスト軽減",
  "giantify ki reduction": "巨大化気軽減", "great magic": "大魔法", "great magic cooldown": "大魔法再使用時間",
  "great magic ki cost": "大魔法消費気", stratagem: "計略", giantification: "巨大化", ki: "気", damage: "ダメージ",
  attack: "攻撃", attacks: "攻撃", "attack attribute": "攻撃属性", cooldown: "再使用時間", cost: "コスト",
  barrier: "バリア", "priority target (taunt)": "優先攻撃対象", "draws enemy targeting": "優先して狙われる",
  "recoil per attack (% of own max hp)": "攻撃時自傷(最大耐久%)", "heal (% of max hp)": "最大耐久の%回復",
  "max hp gauges": "最大耐久ゲージ", "hp gauges": "耐久ゲージ", "special gauge gain when hit (flat cut)": "被攻撃時の特殊攻撃ゲージ蓄積量(固定値)",
  "deploy ki (flat)": "配置気(固定値)", "ki over time": "時間経過の気", "per second": "毎秒", "weather immunity": "天候無効",
  "all weather": "全天候", "crowd-control immunity": "状態異常無効", "damage immunity": "ダメージ無効",
  // states and attributes
  paralysis: "麻痺", darkness: "暗闇", confusion: "混乱", burn: "火傷", "deadly poison": "猛毒", freeze: "氷結",
  despair: "絶望", submission: "服従", silence: "沈黙", hope: "希望", downpour: "暴雨", "heavy snow": "豪雪",
  miasma: "瘴気", gale: "暴風", "dense fog": "濃霧", "void night": "虚夜", "phantom fog": "幻霧",
  fire: "炎", ice: "氷", earth: "土", wind: "風", light: "光", dark: "闇", poison: "毒",
  // attack properties
  "true damage": "固定ダメージ", "anti-yokai": "妖怪特攻", "anti-air": "対空", "anti-demon": "魔物特攻",
  "vs flying": "飛行特攻", "magic (ignores def)": "術 (防御無視)", "ignores def": "防御無視",
  "ignores damage-dealt and damage-taken modifiers": "与ダメ・被ダメ効果無視", "ignores damage-dealt modifiers": "与ダメ効果無視",
  "ignores damage-taken modifiers": "被ダメ効果無視", "ignores attack bonuses": "特定攻撃ボーナス無視",
  "ignores all damage modifiers and attack bonuses": "全てのダメージ補正・特定攻撃ボーナス無視",
  "ignores enemy damage immunity": "敵のダメージ無効を無視", "pierces damage immunity": "ダメージ無効を貫通",
  "min damage": "最低ダメージ", "no damage": "ダメージなし", "every hit": "毎ヒット",
  // states the effect sets
  "can't be targeted": "攻撃対象にならない", "can't be targeted except by flying enemies": "飛行敵以外の攻撃対象にならない",
  "can't be blocked": "足止め対象にならない", "can't be healed": "回復を受けられない", "doesn't attack": "攻撃しない",
  "healing it deals damage instead": "回復がダメージに変化", "evades attacks": "攻撃を回避", transforms: "変身",
  "can be targeted again": "再び攻撃対象になる", "can be blocked again": "再び足止め可能",
  "blocks 'can't be destroyed'": "「耐久が0にならない」を無効化",
  "falling doesn't count toward the fallen-unit count": "落下が大破数に数えられない",
  "damage aimed at them is taken by this unit instead": "受けるダメージをこのユニットが肩代わり",
  "can't be used during a special attack": "特殊攻撃中は使用不可",
  "can't be targeted by allies in despair": "「絶望」状態の味方の攻撃対象にならない",
  "special gauge gain when hit and on attack": "被攻撃時・攻撃時の特殊攻撃ゲージ蓄積量",
  "ki (instant, on deploy/activation)": "気(即時、配置/発動時)", "exp from fusion and gain": "城娘合成時の獲得経験値・獲得経験値", thunder: "轟雷", "redeploy time extension": "再配置時間延長",
  // connectors
  and: "・", or: "または", of: "の", with: "",
};

// one table, longest key first; nouns win a tie in receivers, phrases in effect text
const NOUN_FIRST = { ...PHRASES, ...NOUNS };
const PHRASE_FIRST = { ...NOUNS, ...PHRASES };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (keys: string[]) =>
  new RegExp(`(?<![A-Za-z])(${keys.sort((a, b) => b.length - a.length).map(esc).join("|")})(?![A-Za-z])`, "gi");
const RE_NOUN = wordRe(Object.keys(NOUN_FIRST));
const RE_PHRASE = wordRe(Object.keys(PHRASE_FIRST));

function words(s: string, nounFirst = false): string {
  const table = nounFirst ? NOUN_FIRST : PHRASE_FIRST;
  return tidy(s.replace(nounFirst ? RE_NOUN : RE_PHRASE, (m) => table[m.toLowerCase()]));
}

const JA = "[\\u3000-\\u30ff\\u3400-\\u9fff\\uff00-\\uffef・★☆]";
function tidy(s: string): string {
  return s
    .replace(new RegExp(`(${JA}|[)」])\\s+(?=${JA}|[(「])`, "gu"), "$1")
    .replace(/\s*・\s*/g, "・")
    .replace(/、\s+/g, "、")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Split on ", " / " and " outside brackets. */
function splitList(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "「") depth++;
    if (c === ")" || c === "」") depth--;
    if (!depth) {
      const m = /^(, and |, | and )/.exec(s.slice(i));
      if (m) { out.push(cur); cur = ""; i += m[0].length - 1; continue; }
    }
    cur += c;
  }
  out.push(cur);
  return out.filter((x) => x.trim());
}

// --- receivers ---------------------------------------------------------------------------------

const PLACE: [RegExp, string][] = [
  [/ in the target's range$/i, "対象の射程内の"],
  [/ in range$/i, "射程内の"],
  [/ in the formation$/i, "編成内の"],
  [/ in the area$/i, "範囲内の"],
  [/ placed on the spot$/i, "そのマスに配置した"],
  [/ in Despair$/i, "「絶望」状態の"],
];
const LEADS: [RegExp, string][] = [
  [/^Great Magic, /, "大魔法: "],
  [/^Special attack, /, "特殊攻撃: "],
  [/^Each attack, /, "攻撃毎に "],
  [/^Each enemy defeated, /, "敵撃破毎に "],
  [/^Each time (?:it is )?attacked, /, "被攻撃毎に "],
  [/^Per giantification, /, "巨大化毎に "],
  [/^Every second, /, "毎秒 "],
];
const WHOLE: Record<string, string> = {
  "On hit, the enemy it attacks": "攻撃した敵", "Enemy hit": "攻撃した敵", "Enemies it blocks": "足止め中の敵",
  "The castle girl named in the text": "テキストで指定された城娘", "Your side": "殿側",
  "Can be used on (発動対象)": "発動対象", "Area effect": "範囲効果",
};

function atom(a: string): string {
  let s = a.trim();
  let all = "";
  if (/^all /i.test(s)) { all = "全ての"; s = s.slice(4); }
  let state = "";
  if (/^frozen /i.test(s)) { state = "「氷結」状態の"; s = s.slice(7); }
  if (/ in Despair$/i.test(s)) { state = "「絶望」状態の"; s = s.replace(/ in Despair$/i, ""); }
  let except = "";
  if (/ except self$/i.test(s)) { except = "(自身を除く)"; s = s.replace(/ except self$/i, ""); }
  const quest = /^\u0002(\d+)\u0003(.*)\u0004(.*)$/.exec(s);
  if (quest) return `クエスト種別${quest[1]} (${tidy(quest[2])})の${atom(quest[3])}`;
  const set = /^unnamed trait set (\d+) castle girls$/i.exec(s);
  if (set) return `${all}${state}城娘セット${set[1]}${except}`;
  const grp = /^(Special|Event|Enemy set)(?: (\d+))? enemies$/i.exec(s);
  if (grp) return `${all}${state}${{ special: "特殊", event: "イベント", "enemy set": "エネミーセット" }[grp[1].toLowerCase()]}${grp[2] ?? ""}の敵${except}`;
  const stageGroup = /^enemies in the stage-specific group \(code (\d+)\)$/i.exec(s);
  if (stageGroup) return `${all}ステージ固有グループ(${stageGroup[1]})の敵`;
  // "Water-only castle girls" = exactly that castle type
  const only = /^([A-Za-z]+(?:\/[A-Za-z]+)*)-only castle girls$/.exec(s);
  if (only && only[1].split("/").every((x) => NOUNS[x.toLowerCase()])) {
    return `${all}${only[1].split("/").map((x) => NOUNS[x.toLowerCase()]).join("/")}城の城娘${except}`;
  }
  if (/^dual-tile castle girls$/i.test(s)) return `${all}近接・遠隔両用の城娘${except}`;
  const side = /^(melee|ranged)-only castle girls$/i.exec(s);
  if (side) return `${all}${side[1].toLowerCase() === "melee" ? "近接" : "遠隔"}のみの城娘${except}`;
  return `${all}${state}${words(s, true)}${except}`;
}

/** A receiver ("Castle girls, the lord (殿) and ambush units (伏兵) in range") in Japanese. */
export function receiverJa(subject: string): string {
  let s = subject.trim();
  if (WHOLE[s]) return WHOLE[s];
  const onHit = /^On hit \(the enemy it attacks\), (.+)$/.exec(s);
  if (onHit) return `${receiverJa(onHit[1])}が攻撃した敵`;
  const area = /^Area effect, radius (\d+)$/.exec(s);
  if (area) return `範囲効果 (半径${area[1]})`;
  let lead = "";
  for (const [re, ja] of LEADS) if (re.test(s)) { lead = ja; s = s.replace(re, ""); break; }
  // "In quest type 6 (賽の河原 一層, …), self" is one receiver: the stage list stays with it
  s = s.replace(/In quest type (\d+) \(([^()]*)\), /g, (_m, n, list) => `\u0002${n}\u0003${list.replace(/, /g, "、")}\u0004`);
  // the bracketed originals repeat the English words before them, which the table translates
  s = s.replace(/ \([^()]*[぀-ヿ一-鿿][^()]*\)/g, "")
    .replace(/^castle girls that can be placed on melee and ranged tiles/i, "Dual-tile castle girls");
  const atoms = splitList(s);
  const placeOf = (x: string) => PLACE.find(([re]) => re.test(x));
  const last = placeOf(atoms[atoms.length - 1]);
  let out: string;
  if (last && atoms.slice(0, -1).every((x) => !placeOf(x))) {
    atoms[atoms.length - 1] = atoms[atoms.length - 1].replace(last[0], "");
    out = last[1] + atoms.map(atom).join("・");
  } else {
    out = atoms.map((x) => { const p = placeOf(x); return p ? p[1] + atom(x.replace(p[0], "")) : atom(x); }).join("・");
  }
  return tidy(lead + out);
}

// --- clauses -----------------------------------------------------------------------------------

const N = "[+−-]?\\d+(?:\\.\\d+)?";
const CMP: Record<string, string> = { "≥": "以上", "≤": "以下", ">": "超", "<": "未満", "=": "" };
const STAT = "[A-Za-z][A-Za-z' -]*?";

/** How often a growing effect steps. */
function stepJa(t: string): string {
  const m = /^every (\d+(?:\.\d+)?)(?:s| seconds?)$/.exec(t);
  if (m) return `${m[1]}秒毎`;
  const k = /^every (\d+) (triggers|attacks|hits|kills)$/.exec(t);
  if (k) return `${k[1]}回${{ triggers: "発動", attacks: "攻撃", hits: "攻撃", kills: "撃破" }[k[2]]}毎`;
  return ({
    "each trigger": "発動毎", "each hit taken": "被攻撃毎", "each time it is attacked": "被攻撃毎", "each attack": "攻撃毎",
    "each kill": "撃破毎", "each hit": "攻撃毎", "every second": "1秒毎", "each second": "1秒毎",
  } as Record<string, string>)[t] ?? t;
}

/** "per enemy in range" and the other per-count notes. */
function perJa(t: string): string {
  const m = /^(?:(\d+) )?(.+)$/.exec(t)!;
  const n = m[1] ?? "1";
  const x = m[2];
  const table: [RegExp, (n: string) => string][] = [
    [/^enemy in range$|^enemies in range$/, (n) => `射程内の敵${n}体につき`],
    [/^ally in range$|^allies in range$/, (n) => `射程内の味方${n}体につき`],
    [/^other castle girls? in range$/, (n) => `射程内の他の城娘${n}体につき`],
    [/^castle girls? in range$/, (n) => `射程内の城娘${n}体につき`],
    [/^knockouts? \(大破\) it has taken$/, (n) => `被大破${n}回につき`],
    [/^knockouts? \(大破\) in the formation$/, (n) => `編成内の大破${n}回につき`],
    [/^own ambush units? \(伏兵\) deployed$/, (n) => `配置中の自身の伏兵${n}体につき`],
    [/^own tokens? deployed$/, (n) => `配置中の自身のトークン${n}体につき`],
    [/^special-attack stock$/, (n) => `特殊攻撃ストック${n}につき`],
    [/^unnamed trait set (\d+) units? in range$/i, (n) => `射程内の城娘セット${/\d+/.exec(x)![0]}のユニット${n}体につき`],
    [/^(.+) units? in range$/, (n) => `射程内の${words(x.replace(/ units? in range$/, ""), true)}ユニット${n}体につき`],
    [/^giantification$/, () => "巨大化毎"],
  ];
  for (const [re, f] of table) if (re.test(x)) return f(n);
  return `${words(x)}${n}につき`;
}

/** Notes and fixed phrases with their own Japanese order, applied in order before the word pass. */
const RULES: [RegExp, string | ((...m: string[]) => string)][] = [
  // lines of their own
  [/^total with the "(.+)" row \((.+)\)$/, (_m, who, sum) => `「${receiverJa(who)}」の行との合計 (${sum})`],
  [/^Lasts (\S+)s$/, "$1秒間持続"],
  [/^effects listed below$/, "効果は下記"],
  [/^No formation effect of its own \(its effects are the quest-only rows\)$/, "編成特技の効果なし (効果はクエスト限定の行)"],
  [/^Ki over time \(per second\)$/, "時間経過の気 (毎秒)"],
  [/^Turns the chosen placement spot into a melee\/ranged spot \(近接\/遠隔マス\)$/, "指定した配置マスを近接/遠隔マスに変更"],
  [/^Strengthens the chosen placement spot$/, "指定した配置マスを強化"],
  [/^Can be used on: (.+?) \(([^()]+)\)$/, "使用対象: $2"],
  [/^Can be used on spot type (\d+)$/, "使用対象: マス種別$1"],
  [/^Whoever is placed there gets the effects below$/, "配置した城娘に下記の効果"],
  [/^Placement spot effect type (\d+)$/, "配置マス効果 種別$1"],
  [/\bthat "can't be knocked out" time\b/g, "「大破しない」時間"],
  [/^no effect \(class-ability detail (\d+) has no handler; value (\d+)\)$/, "効果なし (クラス特性の詳細$1に処理なし、値$2)"],
  // whole phrases that hold words the later rules would take apart
  [/\bbarrier \(バリア\) blocks up to (\d+) damage/g, "バリア: $1ダメージまで防ぐ"],
  [/\bbarrier \(from (.+?)\): blocks (\S+) of the damage/g, (_m, who, n) => `バリア (${receiverJa(who)}から): ダメージの${n}を防ぐ`],
  [/\bbarrier: blocks (\S+) of the damage/g, "バリア: ダメージの$1を防ぐ"],
  [/\bdamage shield: blocks up to (\d+) damage in total/g, "ダメージシールド: 合計$1ダメージまで防ぐ"],
  [/\bcan't be stopped \(immune to move speed being set to 0\)/g, "停止しない (移動速度0化無効)"],
  [/\bimmune to (.+?) being set to 0\b/g, (_m, x) => `${words(x)}の0化無効`],
  [/ \(1 stock = a full gauge\)/g, " (1ストック=ゲージ満タン)"],
  [/\bper special-attack stock\b/g, "特殊攻撃ストック1につき"],
  [/\bstat (\d+) \(the game client never reads it\)/g, "ステータス$1 (クライアント未使用)"],
  [/\b(stand|attack) motion → variant (\d+) \(([^/()]+) \/ [a-z0-9]+\)/g, (_m, _w, v, jp) => `モーション → ${jp} (#${v})`],
  [/\bwalking motion \(移動中モーション\)/g, "移動中モーション"],
  [/\bwalk-start motion \(移動前モーション\)/g, "移動前モーション"],
  [/\bwalk-end motion \(移動後モーション\)/g, "移動後モーション"],
  [/\bstat (\d+)/g, "ステータス$1"],
  [/\bAttack attribute: (\w+)/g, (_m, a) => `攻撃属性: ${({ fire: "炎", ice: "氷", water: "水", thunder: "雷", earth: "土", wind: "風", light: "光", dark: "闇", poison: "毒", none: "無" } as Record<string, string>)[a] ?? a}`],
  // growth and per-count notes, before the trigger leads they contain
  [/\bgrows by that amount ((?:each|every) [a-z0-9. ]+?)(?= \(|,|$|\))/g, (_m, t) => `${stepJa(t)}に同量上昇`],
  [/ \(shrinks instead while Reversal \(反転化\) is on\)/g, " (反転化中は減少)"],
  [new RegExp(`, \\+(${N}%?) more ((?:each|every) [a-z ]+?)(?=,|$)`, "g"), (_m, n, t) => `、${stepJa(t)}に+${n}ずつ上昇`],
  [/(?<=^|, |\d%? )per ((?:\d+ )?[A-Za-z][a-zA-Z' -]*?(?: \([^)]*\))?(?: it has taken| in the formation| deployed| in range)?)(?=,|$)/g, (_m, t) => perJa(t)],
  // leads
  [/^Each enemy defeated$/, "敵撃破毎"],
  [/^Each time attacked$/, "被攻撃毎"],
  [/^Each attack$/, "攻撃毎"],
  [/^Each enemy defeated, /, "敵撃破毎に、"],
  [/^Each time attacked, /, "被攻撃毎に、"],
  [/^Each attack, /, "攻撃毎に、"],
  [/^Great Magic, /, "大魔法、"],
  [/^On hit \(the enemy it attacks\), /, "攻撃した敵、"],
  [/^On hit, /, "攻撃時、"],
  [/\bwhen attacked \(from ([^()]+)\): /g, (_m, x) => `被攻撃時 (${splitList(x).map((y) => words(y, true)).join("・")}から): `],
  [/\bwhen attacked: /g, "被攻撃時: "],
  [/\bon the unit it hits: /g, "攻撃した相手: "],
  [/\bthe enemies it blocks: /g, "足止め中の敵: "],
  [/\battacks gain: /g, "攻撃に付与: "],
  [/\battacks lose: /g, "攻撃から除去: "],
  [/\battacks gain ([^,]+)/g, (_m, x) => `攻撃に${words(x)}を付与`],
  [/\battacks lose ([^,]+)/g, (_m, x) => `攻撃の${words(x)}を除去`],
  [/\battack properties set to: /g, "攻撃属性を変更: "],
  [/\beach attack it makes, /g, "攻撃毎に\u0005"],
  [/\beach time it is attacked, /g, "被攻撃毎に\u0005"],
  [/\beach enemy it defeats, /g, "敵撃破毎に\u0005"],
  [/\bwith its special attack, /g, "特殊攻撃時\u0005"],
  [/\bevery second, /g, "毎秒\u0005"],
  [/\bwhile blocked \(足止め時\), /g, "足止め時\u0005"],
  // notes
  [/(^|, )doesn't stack\b/g, "$1重複不可"],
  [/(^|, )stacks\b/g, "$1重複可"],
  [/\bfor the rest of the battle\b|\(the rest of the battle\)/g, "戦闘終了まで"],
  [new RegExp(`\\bfor (${N})ms\\b`, "g"), "$1ミリ秒間"],
  [new RegExp(`\\bfor (${N})s\\b`, "g"), "$1秒間"],
  [new RegExp(`\\bre-applied every (${N})s\\b`, "g"), "$1秒毎に再適用"],
  [new RegExp(`\\bevery (${N})s\\b`, "g"), "$1秒毎"],
  [new RegExp(`\\bup to ×?(${N}%?)`, "g"), (m, n) => (m.includes("×") ? `最大×${n}` : `最大${n}`)],
  [new RegExp(`\\bdown to (${N}%?)`, "g"), "最小$1"],
  [/\bonly at max giantification \(最大化\)/g, "最大化時のみ"],
  [/\bactivates on giantification \(巨大化時発動\)/g, "巨大化時発動"],
  [/\bno giantification scaling \(変位補正無効\)/g, "変位補正無効"],
  [/\bper giantification\b/g, "巨大化毎"],
  [new RegExp(`\\bat giantification stage (\\d+)`, "g"), "巨大化段階$1"],
  [/\bwhen on water tiles\b/g, "水上マス配置時"],
  [new RegExp(`\\bwhile blocking (≥|≤|>|<) (${N})`, "g"), (_m, op, n) => `足止め数${n}${CMP[op]}の間`],
  [new RegExp(`(?:, | )?\\bwhile own (ステータス\\d+|${STAT}) (≥|≤|>|<|=) (${N}%?)`, "g"), (_m, stat, op, n) => `、自身の${words(stat)}が${n}${CMP[op]}の間`],
  [new RegExp(` ?\\bagainst enemies with (${STAT}(?: \\([a-z]+\\))?) (≥|≤|>|<|=) (${N}%?)`, "g"), (_m, stat, op, n) => `、${words(stat)}が${n}${CMP[op]}の敵に対して`],
  [/(?:, | )?\bwhile it can't be targeted\b/g, "、攻撃対象にならない間"],
  [new RegExp(` \\(only while the value is (≥|≤|>|<) (${N})\\)`, "g"), (_m, op, n) => ` (値が${n}${CMP[op]}の間のみ)`],
  [new RegExp(`, (${N})% chance`, "g"), "、確率$1%"],
  // amounts based on another stat
  [new RegExp(`([+−-]${N}%?) of the giver's (${STAT})(?=,|$|;|\\))`, "g"), (_m, n, stat) => `${n}（付与者の${words(stat)}基準）`],
  [new RegExp(`([+−-]${N}%?) of own (${STAT})(?=,|$|;|\\))`, "g"), (_m, n, stat) => `${n}（自身の${words(stat)}基準）`],
  [/\(\+% of the giver's (.+?)\)/g, (_m, stat) => `（付与者の${words(stat)}の%）`],
  [/\(\+% of own (.+?)\)/g, (_m, stat) => `（自身の${words(stat)}の%）`],
  [new RegExp(`\\bcounter damage (${N}%) of the attacker's (${STAT})(?: \\(反射\\))?(?= \\(|,|$)`, "g"), (_m, n, stat) => `反射ダメージ (攻撃者の${words(stat)}の${n})`],
  [new RegExp(`\\bcounter for (${N}%) of own (${STAT})(?= \\(|,|$)`, "g"), (_m, n, stat) => `反撃 (自身の${words(stat)}の${n})`],
  [new RegExp(`\\b(independent )?damage (${N})× the target's (max|current) HP`, "g"), (_m, ind, n, which) => `${ind ? "独立" : ""}ダメージ (対象の${which === "max" ? "最大" : "現在"}耐久の${n}倍)`],
  [new RegExp(`\\b(independent )?damage (${N})× (${STAT})(?= \\(|,|$|;)`, "g"), (_m, ind, n, stat) => `${ind ? "独立" : ""}ダメージ (${words(stat)}の${n}倍)`],
  [new RegExp(`\\b(independent )?damage ×(${N}) (${STAT})(?= \\(|,|$|;)`, "g"), (_m, ind, n, stat) => `${ind ? "独立" : ""}ダメージ (${words(stat)}の${n}倍)`],
  [new RegExp(`\\bindependent damage (${N})\\b`, "g"), "独立ダメージ $1"],
  [/\(attack bonus\)/g, "(特定攻撃ボーナス)"],
  [new RegExp(`\\bset to (${N}(?:%|s)?)`, "g"), (_m, n) => `${n.replace(/s$/, "秒")}に設定`],
  [/\bimmune to ([^,;(]+?) being set to 0\b/g, (_m, x) => `${words(x)}0化無効`],
  [/\bno longer immune to ([^,;]+)/g, (_m, x) => `${words(x)}無効を解除`],
  [/\bimmune to ([^,;(]+?) (decreases|increases)\b/g, (_m, x, d) => `${words(x)}${d === "decreases" ? "低下" : "上昇"}無効`],
  [/\bimmune to (.+?)(?=, (?:for|only|up to|doesn't|stacks|per|while|when|activates|on giantification)\b|;|$)/g, (_m, x) => `${splitList(x).map((y) => words(y)).join("・")}無効`],
  [new RegExp(`\\binflicts ([A-Za-z ]+?)(?: \\(([^)]*[\\u3040-\\u9fff][^)]*)\\))? \\((${N})s\\)`, "g"), (_m, x, jp, n) => `「${jp || words(x)}」付与(${n}秒)`],
  [/\binflicts ([A-Za-z ]+?) \(([^)]*[぀-鿿][^)]*)\)/g, (_m, _x, jp) => `「${jp}」付与`],
  [/\binflicts ([A-Za-z ]+)/g, (_m, x) => `「${words(x)}」付与`],
  [/\b[Mm]issile #(\d+)/g, "ミサイル#$1"],
  [/\(no extra effects\)/g, "(追加効果なし)"],
  [/\bhits (\d+) times, (\S+)s apart\b/g, "$1回ヒット、$2秒間隔"],
  [/\bhits (\d+) times\b/g, "$1回ヒット"],
  [/\bonce, can't be knocked out: HP can't drop to 0\b/g, "1度だけ大破しない: 耐久が0にならない"],
  [/\bcan't be knocked out\b/g, "大破しない"],
  [/\bHP can't drop to 0\b/g, "耐久が0にならない"],
  [/\bCan't be destroyed \(HP stays at 1\)/g, "耐久が0にならない (耐久1で残る)"],
  [/\bonce\b/g, "1度だけ"],
  [/\bhits of (\d+) damage or less are nullified/g, "$1以下のダメージを無効化"],
  [/\beach hit takes only (\d+) HP \(value \d+\)/g, "被攻撃1回の耐久減少を$1に固定"],
  [/\bdamage split into hits of (\d+)/g, "ダメージを$1ずつに分割"],
  [/\bknocked back \(move speed (\S+)\)/g, "後退 (移動速度$1)"],
  [/\bcan't move \(move speed 0\)/g, "移動不可 (移動速度0)"],
  [/\bcan move on all tiles\b/g, "全てのマスを移動可能"],
  [/\bcan move on ([a-z ]+?) tiles(?: \(([^)]*)\))?/g, (_m, x, jp) => `${(jp || words(x)).replace(/マス$/, "")}マスを移動可能`],
  [/\bmove speed instant \(teleport\)/g, "移動速度 瞬間移動"],
  [/\bwalks with its second walk motion \(歩き2\)/g, "歩き2モーションで歩行"],
  [/\bwalks\b/g, "歩行"],
  [/\bbattle motion set → #(\d+) \(its attack animation sets the hit count\)/g, "戦闘モーション → #$1 (攻撃アニメーションでヒット数が決まる)"],
  [/\bvisual effect #(\d+)/g, "エフェクト#$1"],
  [/\bactivates ability #(\d+) \(mode (\d+)\)/g, "特技#$1を発動 (モード$2)"],
  [/\buses special attack #(\d+) \(特殊攻撃ID\)/g, "特殊攻撃#$1を使用"],
  [/\bits skill \(特技\) activates \(特技発動\)/g, "特技発動"],
  [/\(mode (\d+)\)/g, "(モード$1)"],
  [/\bdamage taken is split among all deployed castle girls \(ダメージ分散\)/g, "ダメージ分散 (配置中の全城娘で分担)"],
  [/\bon-hit effects last (\S+)s \(着弾効果時間\)/g, "着弾効果時間 $1秒"],
  [/\bno effect \(an empty row in the data\)/g, "効果なし (データ上の空行)"],
  [new RegExp(`\\bKi (${N}) when it appears \\(given back when it is defeated\\)`, "g"), "登場時に気$1 (撃破時に返還)"],
  [new RegExp(` \\(\\+(${N}) Ki per tick; a 2nd/3rd such unit counts (\\S+)\\)`, "g"), " (1回あたり気+$1、2体目/3体目は$2)"],
  [/\(from ([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_m, x) => `（${splitList(x).map((y) => words(y, true)).join("・")}から）`],
  [/\bthe effects below apply to units in the area\b/g, "範囲内のユニットに下記の効果"],
];

// an English term (up to 5 words) followed by the game's own word in brackets: the bracket says it already
const GLOSS = /((?:[A-Za-z][A-Za-z'/-]*\s){0,6}[A-Za-z][A-Za-z'/-]*)\s\(([^()]*[぀-ヿ一-鿿][^()]*)\)/g;
const KEEP = new Set(["and", "or", "the", "of", "with", "its", "a", "to", "per", "for", "while", "when", "each", "on", "in"]);

/** The part after a receiver: "ATK +40%, doesn't stack, for 30s". */
export function clauseJa(text: string): string {
  let s = text;
  for (const [re, to] of RULES) s = s.replace(re, to as never);
  s = s.replace(GLOSS, (_m, en: string, jp: string) => {
    // words before the glossed term stay (a connector or a lead the table still translates)
    const w = en.split(" ");
    let i = 0;
    while (i < w.length - 1 && KEEP.has(w[i].toLowerCase())) i++;
    return `${w.slice(0, i).join(" ")}${i ? " " : ""}${jp}`;
  });
  s = words(s);
  s = s.replace(/,\s*/g, "、");
  // a stat list before the amount reads with 「・」: "最大耐久、攻撃・防御 +30%"
  s = s.replace(new RegExp(`(^|\u0005)((?:${JA}+、)+${JA}+)(?=\\s*[+−×])`, "gu"), (_m, a, list) => a + list.replace(/、/g, "・"));
  return tidy(s.replace(/\u0005/g, "、"));
}

// --- sentences ---------------------------------------------------------------------------------

/** English left in a Japanese line (ids, units and a few names the game writes in Latin letters are fine). */
export const hasEnglish = (s: string) => /[A-Za-z]{2,}/.test(s.replace(/#\d+|\b(?:ms|s)\b|\b(?:GuP|JFW|EXP|ID|T\.O\.W\.E\.R\.)\b/g, ""));

/** A whole effect line in Japanese, or null when some of it has no translation yet. */
export function effectJa(line: string): string | null {
  const out = effectJaRaw(line);
  return hasEnglish(out) ? null : out;
}

/** Split on a separator outside brackets. */
function splitOutside(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "「") depth++;
    else if (c === ")" || c === "」") depth--;
    else if (!depth && s.startsWith(sep, i)) { out.push(s.slice(start, i)); start = i + sep.length; i += sep.length - 1; }
  }
  out.push(s.slice(start));
  return out;
}

/** The translation as far as it goes (English left where the tables have nothing). */
export function effectJaRaw(line: string): string {
  return splitOutside(line, " · ").map((piece) => splitOutside(piece, "; ").map(sentence).join("；")).join(" · ");
}

function sentence(piece: string): string {
  const i = piece.indexOf(": ");
  if (i > 0 && /^[A-Z★]/.test(piece) && !/^(Weather immunity|Attack attribute)\b/.test(piece)) {
    const head = piece.slice(0, i);
    const who = receiverJa(head);
    if (!hasEnglish(who)) return `${who}: ${sentence(piece.slice(i + 2))}`;
  }
  return clauseJa(piece);
}

const cache = new Map<string, string | null>();
/** effectJa with a cache: pages ask for the same lines on every render. */
export function effectJaCached(line: string): string | null {
  let v = cache.get(line);
  if (v === undefined) { v = effectJa(line); cache.set(line, v); }
  return v;
}
