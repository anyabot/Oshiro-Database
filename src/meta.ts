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
  "/buffs": {
    title: "Buff Ranking",
    description:
      "Shiro Project:RE buff ranking: which castle girls give the biggest ATK, DEF, range, attack speed, damage, Ki and enemy debuff effects, from specialties, formation specialties, stratagems and class abilities.",
  },
};
