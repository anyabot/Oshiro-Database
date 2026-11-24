// Hand-written change log: new castle girls and site features only (no fixes, no data refreshes).
// Add a release at the top; `date` is its identity and what the once-per-update popup remembers.
import type { Lang } from "./i18n";

export type ChangeKind = "unit" | "feature";
type Localized = Record<Lang, string>;

export interface ChangeEntry {
  kind: ChangeKind;
  text: Localized;
}

export interface Release {
  /** ISO date, newest first. */
  date: string;
  title: Localized;
  entries: ChangeEntry[];
}

const unit = (en: string, ja: string): ChangeEntry => ({ kind: "unit", text: { en, ja } });
const feature = (en: string, ja: string): ChangeEntry => ({ kind: "feature", text: { en, ja } });

export const RELEASES: Release[] = [
  {
    date: "2026-11-24",
    title: { en: "Wild Serpent Oka Castle and the update list", ja: "[荒蛇]岡城と更新履歴" },
    entries: [
      unit("[Wild Serpent] Oka Castle", "[荒蛇]岡城"),
      feature("This update list, with a short note of what's new after each update.", "更新履歴ページと、更新後に一度だけ出る新着情報。"),
      feature("Castle girl page: her ambush units with their sprites, stats and effects.", "城娘ページ: 伏兵ユニットのドット絵・ステータス・効果。"),
      feature("Buff ranking now covers special attacks, stratagem special attacks, ambush units and weapons.", "バフランキングに特殊攻撃・計略の特殊攻撃・伏兵・武器の効果を追加。"),
    ],
  },
  {
    date: "2026-11-22",
    title: { en: "Voice actors", ja: "声優" },
    entries: [
      feature("Voice actor filter on the castle girl list, buff ranking and team builder; the CV on a castle girl's page lists her voice actor's other castle girls.",
        "城娘一覧・バフランキング・編成で声優の絞り込み。城娘ページのCVから同じ声優の城娘へ。"),
    ],
  },
  {
    date: "2026-11-18",
    title: { en: "Team builder and collection", ja: "編成と所持城娘" },
    entries: [
      feature("Team builder: pick a castle girl and see who buffs her most (attack, defence and utility such as Ki and cooldowns).",
        "編成: 城娘を選ぶと、攻撃・防御・気や再使用時間などのバフが大きい城娘を提案。"),
      feature("Collection tracker: mark the castle girls you own and their renovation, or import them from screenshots.",
        "所持城娘: 所持と改築段階を記録。スクリーンショットからの読み込みにも対応。"),
      feature("Battle dialogue of 111 stages, shown with the stage story.", "111ステージの戦闘中会話をステージのストーリーと一緒に表示。"),
    ],
  },
  {
    date: "2026-11-17",
    title: { en: "Story", ja: "ストーリー" },
    entries: [
      unit("[Spirit Guard] Dazaifu", "[霊衛]大宰府"),
      unit("[Ruin Dance] Nobeoka Castle", "[崩舞]延岡城"),
      unit("[Loyal Blade] Sawayama Castle", "[忠刃]佐和山城"),
      unit("[Un'yo] Kagoshima Castle", "[雲耀]鹿児島城"),
      feature("Story page with a scene player: quest stories, event cutscenes (Tenma, voyage, hells, palaces), skits and bond stories.",
        "ストーリーページとシーン再生: クエスト・イベント(天魔大乱・航海・地獄・御殿)・寸劇・絆ストーリー。"),
      feature("Castle girl page: card art for every renovation tier.", "城娘ページ: 改築段階ごとのカードイラスト。"),
      feature("Possession buffs, placement filter (melee / ranged / water / boat) and a newest-first castle girl list.",
        "所持効果、配置の絞り込み(近接・遠隔・水上・船)、新着順の城娘一覧。"),
      feature("Stage map: enemy paths and the route abilities they pick up.", "ステージマップ: 敵の進路と経路効果。"),
    ],
  },
  {
    date: "2026-11-16",
    title: { en: "Equipment, lord outfits and the home page", ja: "装備・殿の装束・ホーム" },
    entries: [
      feature("Equipment pages: every weapon with stats, abilities, castle girl bonuses and where it comes from.",
        "装備ページ: 全武器のステータス・効果・城娘ボーナス・入手方法。"),
      feature("Lord outfits (殿の装束): stats at any level and their effects.", "殿の装束: 任意レベルのステータスと効果。"),
      feature("Home page: current events, the game's banners and the newest castle girls and equipment.",
        "ホーム: 開催中イベント、ゲーム内バナー、新着の城娘と装備。"),
      feature("Stat simulator on castle girl pages: level, renovation, limit breaks and giantification.",
        "城娘ページのステータス計算: レベル・改築・限界突破・巨大化。"),
      feature("Stage list laid out like the game's sortie menu, and deployment maps with every placement spot.",
        "ゲームの出陣画面と同じ並びのステージ一覧と、配置マス付きのマップ。"),
    ],
  },
  {
    date: "2026-11-15",
    title: { en: "Japanese", ja: "日本語表示" },
    entries: [
      feature("Japanese language option for the whole site, effect texts included.", "サイト全体の日本語表示(効果文を含む)。"),
      feature("Weapon and terrain filters use the game's own icons.", "武器種・地形の絞り込みにゲーム内アイコン。"),
    ],
  },
  {
    date: "2026-11-10",
    title: { en: "Oshiro Database opens", ja: "公開" },
    entries: [
      unit("改弐 for Orange Castle, Fort Zeelandia, Alcázar of Segovia, Tateyama Castle and Acropolis of Athens",
        "オレンジ城・ゼーランディア城・ｾｺﾞﾋﾞｱのｱﾙｶｻﾙ・館山城・アテナイ･アクロポリスの改弐"),
      feature("Castle girls with every renovation tier, stages with enemies and deliberations, and the buff ranking.",
        "城娘(全改築段階)、敵と審議付きのステージ、バフランキング。"),
    ],
  },
];

export const latestRelease = () => RELEASES[0]?.date ?? "";
