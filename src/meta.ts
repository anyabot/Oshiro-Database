// Page titles, descriptions and canonical URLs, applied at runtime by usePageMeta.
import { createSiteMeta, type PageMeta } from "@altterisk/game-hub/meta";

export type { PageMeta };

export const DEFAULT_META: PageMeta = {
  title: "",
  description:
    "Fan-made Shiro Project:RE (城プロRE) database: castle girl stats, weapon types, specialties, formation specialties, stratagems, renovation tiers and abilities.",
};

export const site = createSiteMeta({
  game: "oshiro",
  format: (title, s) => `${title} · ${s.name}`,
  defaultDescription: DEFAULT_META.description,
  defaultImage: "/favicon.png",
});

export const NOT_FOUND_META: PageMeta = { title: "Page not found", description: DEFAULT_META.description, noindex: true };

/** Index pages, keyed by path. */
export const LIST_META: Record<string, PageMeta> = {
  "": {
    title: "",
    description:
      "Fan-made Shiro Project:RE (城プロRE) database: current events and banners, the newest castle girls and equipment, and every castle girl, weapon and stage.",
  },
  "/units": {
    title: "Castle Girls",
    description:
      "Every Shiro Project:RE castle girl: rarity, weapon type, region, stats, specialties, formation specialties, stratagems and renovation tiers. Filter by rarity, weapon, region and trait.",
  },
  "/stages": {
    title: "Stages",
    description:
      "Shiro Project:RE stages with their enemies and stats, including Hell (Enma, Hel, Osiris), Abyss and Bushin stages with deliberations (審議) you can toggle to see how they change each enemy.",
  },
  "/equipment": {
    title: "Equipment",
    description:
      "Every Shiro Project:RE weapon: stats, abilities, castle-girl bonuses and how to get it (dedicated weapon, stage drop, 戦功, exchange, pack, summon bonus, login bonus, upgrade).",
  },
  "/changelog": {
    title: "Updates",
    description: "What's new on Oshiro Database: new castle girls and site features, update by update.",
  },
  "/lord": {
    title: "Lord Outfits",
    description:
      "Every Shiro Project:RE lord outfit (殿の装束): what it changes on the lord at the base camp: HP, ATK, DEF, range, attack wait, targets and its effect, at any lord level.",
  },
  "/team": {
    title: "Team Builder",
    description:
      "Shiro Project:RE team builder: pick a castle girl to buff, add her formation, and see which castle girls in your collection add the most offensive or defensive buffs (ATK, damage dealt, enemy DEF down, damage taken down, enemy ATK down) that reach her.",
  },
  "/collection": {
    title: "Collection Tracker",
    description:
      "Track which Shiro Project:RE castle girls you own and how far each is renovated; the team builder ranks buffers from your collection. Saved in your browser, with a backup code.",
  },
  "/buffs": {
    title: "Buff Ranking",
    description:
      "Shiro Project:RE buff ranking: which castle girls give the biggest ATK, DEF, range, attack speed, damage, Ki and enemy debuff effects, from specialties, formation specialties, stratagems and class abilities.",
  },
};
