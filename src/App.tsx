import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SegmentedButtons, SiteShell, homeLink } from "@altterisk/game-hub";
import { LIST_META } from "./meta";
import { usePageMeta } from "./usePageMeta";
import { LANGS, hubLabels, setLang, useLang, useT, type Lang } from "./i18n";
import { ChangelogDialog } from "./pages/Changelog";

function LanguagePicker() {
  const t = useT();
  const lang = useLang();
  return (
    <SegmentedButtons className="lang-picker" label={t("language")} options={LANGS} selected={lang}
      onToggle={(v) => setLang(v as Lang)} />
  );
}

export default function App() {
  // list pages here; detail pages and NotFound call usePageMeta themselves
  const { pathname } = useLocation();
  usePageMeta(LIST_META[pathname.replace(/\/$/, "")] ?? null);
  const lang = useLang();
  const t = useT();
  const hub = hubLabels(lang);
  return (
    <SiteShell
      game="oshiro"
      logo={<img src="/logo.png" alt="" />}
      renderHomeLink={homeLink(Link, "to")}
      nav={<><NavLink to="/" end>{t("navHome")}</NavLink><NavLink to="/units">{t("navUnits")}</NavLink><NavLink to="/buffs">{t("navBuffs")}</NavLink><NavLink to="/team">{t("navTeam")}</NavLink><NavLink to="/collection">{t("navCollection")}</NavLink><NavLink to="/equipment">{t("navEquipment")}</NavLink><NavLink to="/stages">{t("navStages")}</NavLink><NavLink to="/story">{t("navStory")}</NavLink><NavLink to="/lord">{t("navLords")}</NavLink><NavLink to="/changelog">{t("navChangelog")}</NavLink></>}
      actions={<LanguagePicker />}
      barLabels={hub.bar}
      errorLabels={hub.error}
      skipLabel={hub.skip}
      footer={{
        links: [
          { label: t("footerSource"), href: "https://github.com/Altterisk/Oshiro-Database" },
          { label: t("footerPortfolio"), href: "https://altterisk.github.io/portfolio/" },
          { label: "Ko-fi", href: "https://ko-fi.com/altterisk" },
        ],
        labels: hub.footer,
      }}
      resetKey={pathname}
      contained={false}
    >
      {/* keyed by language: pages and their memoised option lists rebuild in the new language */}
      <Outlet key={lang} />
      <ChangelogDialog />
    </SiteShell>
  );
}
