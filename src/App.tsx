import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SiteShell, homeLink } from "@altterisk/game-hub";
import { LIST_META } from "./meta";
import { usePageMeta } from "./usePageMeta";

const FOOTER_LINKS = [
  { label: "Source on GitHub", href: "https://github.com/Altterisk/Oshiro-Database" },
  { label: "Portfolio", href: "https://altterisk.github.io/portfolio/" },
  { label: "Ko-fi", href: "https://ko-fi.com/altterisk" },
];

export default function App() {
  // list pages here; detail pages and NotFound call usePageMeta themselves
  const { pathname } = useLocation();
  usePageMeta(LIST_META[pathname.replace(/\/$/, "")] ?? null);
  return (
    <SiteShell
      game="oshiro"
      logo={<img src="/logo.png" alt="" />}
      renderHomeLink={homeLink(Link, "to")}
      nav={<><NavLink to="/units">Units</NavLink><NavLink to="/buffs">Buffs</NavLink></>}
      footer={{ links: FOOTER_LINKS }}
      resetKey={pathname}
      contained={false}
    >
      <Outlet />
    </SiteShell>
  );
}
