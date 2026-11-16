import { useMemo } from "react";
import { Link } from "react-router-dom";
import { EntityTile, LoadState, routerLinks } from "@altterisk/game-hub";
import {
  altName, bannerUrl, iconUrl, nameOf, rarityLabel, useAdded, useHome, useMeta, useUnits, weaponLabel,
  type HomeBanner,
} from "../data";
import { useEvents } from "../stages";
import { useWeapons, weaponDotUrl, weaponIconUrl } from "../weapons";
import { weaponTypeName } from "../weaponParts";
import { useHubLabels, useT, type UiKey } from "../i18n";

const renderLink = routerLinks(Link, "to");

/** Days back from the newest addition that still count as new. */
const NEW_WINDOW_DAYS = 14;

const BANNER_KIND: Record<string, UiKey> = {
  summon: "bannerSummon", event: "bannerEvent", shop: "bannerShop", fixed: "bannerFixed", etc: "bannerEtc", arena: "bannerArena",
};

/** "2026/11/19 11:30:00" (JST) -> ms */
const jst = (s: string) => Date.parse(`${s.replace(/\//g, "-").replace(" ", "T")}+09:00`);
/** "2026/11/19 11:30:00" -> "11/19 11:30" */
const short = (s: string) => {
  const m = s.match(/^\d{4}\/(\d{2})\/(\d{2}) (\d{2}:\d{2})/);
  return m ? `${Number(m[1])}/${Number(m[2])} ${m[3]}` : s;
};
const dayMs = 86_400_000;

/** Banner.DateText: "11/17 メンテナンスまで" or "11/16 4:00:00まで" -> its end (ms, JST) and display text. */
function bannerUntil(text: string, year: number, t: ReturnType<typeof useT>): { end: number | null; label: string } {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\s*(?:(\d{1,2}):(\d{2})(?::\d{2})?)?\s*(メンテナンス)?まで$/);
  if (!m) return { end: null, label: text };
  const md = `${m[1]}/${m[2]}`;
  const iso = (h: string, min: string) => `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T${h.padStart(2, "0")}:${min}:00+09:00`;
  if (m[5]) return { end: Date.parse(iso("23", "59")), label: t("untilMaint", { d: md }) };
  if (m[3]) return { end: Date.parse(iso(m[3], m[4])), label: t("untilTime", { d: `${md} ${m[3]}:${m[4]}` }) };
  return { end: Date.parse(iso("23", "59")), label: t("untilTime", { d: md }) };
}

export default function Home() {
  const t = useT();
  const hub = useHubLabels();
  const { data: home, loading, error } = useHome();
  const { data: added } = useAdded();
  const { data: events } = useEvents();
  const { data: units } = useUnits();
  const { data: meta } = useMeta();
  const { data: weapons } = useWeapons();
  const now = Date.now();

  const unitById = useMemo(() => new Map((units || []).map((u) => [u.id, u])), [units]);

  const banners = useMemo(() => {
    if (!home) return [];
    const year = Number(home.generated.slice(0, 4));
    return home.banners.map((b) => ({ b, ...bannerUntil(b.until, year, t) })).filter((x) => x.end == null || x.end >= now);
  }, [home, t, now]);

  const running = useMemo(() => (events || [])
    .filter((e) => Number(e.end.slice(0, 4)) < 2030 && jst(e.start) <= now && now < jst(e.end))
    .sort((a, b) => jst(a.end) - jst(b.end)), [events, now]);

  const newUnits = useMemo(() => {
    if (!added || !units) return [];
    const list = units.filter((u) => !u.npc && !u.dup_of && !u.transform_of && added.units[u.id])
      .map((u) => ({ u, d: added.units[u.id] }));
    const newest = list.reduce((m, x) => (x.d > m ? x.d : m), "");
    const from = new Date(Date.parse(newest) - NEW_WINDOW_DAYS * dayMs).toISOString().slice(0, 10);
    return groupByDate(list.filter((x) => x.d >= from).sort((a, b) => b.d.localeCompare(a.d) || b.u.id - a.u.id));
  }, [added, units]);

  const newWeapons = useMemo(() => {
    if (!added || !weapons) return [];
    const list = weapons.weapons.filter((w) => w.kind === 0 && added.weapons[w.id] && added.weapons[w.id][1] !== "between")
      .map((w) => ({ w, d: added.weapons[w.id][0], after: added.weapons[w.id][1] === "after" }));
    const newest = list.reduce((m, x) => (x.d > m ? x.d : m), "");
    const from = new Date(Date.parse(newest) - NEW_WINDOW_DAYS * dayMs).toISOString().slice(0, 10);
    return groupByDate(list.filter((x) => x.d >= from).sort((a, b) => b.d.localeCompare(a.d) || a.w.id - b.w.id));
  }, [added, weapons]);

  const left = (ms: number) => {
    const h = Math.floor(ms / 3_600_000);
    return h >= 24 ? t("daysHours", { d: Math.floor(h / 24), h: h % 24 }) : t("hoursMins", { h, m: Math.floor((ms % 3_600_000) / 60_000) });
  };

  if (!home) return <div className="page"><LoadState loading={loading} error={error} labels={hub.load} /></div>;
  return (
    <div className="page home">
      <header className="home-hero">
        <h1>{t("homeTitle")}</h1>
        <p className="muted">{t("homeSubtitle")}</p>
      </header>

      <section className="home-section">
        <div className="home-section__head">
          <h2>{t("homeEvents")}</h2>
          <Link to="/stages" className="small">{t("allStages")}</Link>
        </div>
        {!events ? null : running.length === 0 ? <p className="muted">{t("noEvents")}</p> : (
          <div className="home-events">
            {running.map((e) => (
              <article key={e.id} className="home-event">
                <Link to={`/stages?q=${encodeURIComponent(e.title)}`} className="home-event__title">{e.title}</Link>
                <div className="muted small">
                  {short(e.start)} – {short(e.end)} JST · <span className="home-event__left">{t("endsIn", { t: left(jst(e.end) - now) })}</span>
                </div>
                {home.focus[e.id] && (
                  <div className="home-event__units">
                    {home.focus[e.id].map((id) => {
                      const u = unitById.get(id);
                      return (
                        <Link key={id} to={`/units/${id}`} className="home-chip" title={altName(u) || undefined}>
                          {u?.face ? <img src={iconUrl(u.face)} alt="" width={40} height={40} loading="lazy" /> : <span className="icon-missing home-chip__none" />}
                          <span className="home-chip__text">
                            <span className="home-chip__name">{u ? nameOf(u) : `#${id}`}</span>
                            {u && <span className="muted small">{rarityLabel(meta, u.rarity)}</span>}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {banners.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <h2>{t("homeBanners")}</h2>
            <span className="muted small">{t("homeBannersHint")}</span>
          </div>
          <div className="home-banners">
            {banners.map(({ b, label }, i) => <Banner key={`${b.type}-${i}`} b={b} label={label} kind={t(BANNER_KIND[b.kind] ?? "bannerEtc")} />)}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-section__head">
          <h2>{t("homeNewUnits")}</h2>
          <Link to="/units" className="small">{t("allUnits")}</Link>
        </div>
        <p className="muted small home-hint">{t("homeNewUnitsHint")}</p>
        {newUnits.map(([d, list]) => (
          <div key={d} className="home-group">
            <h3>{t("addedOn", { d })}</h3>
            <div className="unit-grid">
              {list.map(({ u }) => (
                <EntityTile
                  key={u.id}
                  href={`/units/${u.id}`}
                  renderLink={renderLink}
                  className="unit-tile"
                  icon={u.face ? <img src={iconUrl(u.face)} alt="" width={60} height={60} loading="lazy" /> : <span className="icon-missing" />}
                  title={nameOf(u)}
                  subtitle={`${altName(u) ? `${altName(u)} · ` : ""}${rarityLabel(meta, u.rarity)} · ${weaponLabel(meta, u.weapon)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <h2>{t("homeNewEquip")}</h2>
          <Link to="/equipment" className="small">{t("allEquipment")}</Link>
        </div>
        <p className="muted small home-hint">{t("homeNewEquipHint")}</p>
        {newWeapons.map(([d, list]) => (
          <div key={d} className="home-group">
            <h3>{list.every((x) => x.after) ? t("addedAfter", { d }) : t("addedOn", { d })}</h3>
            <div className="unit-grid">
              {list.map(({ w }) => (
                <EntityTile
                  key={w.id}
                  href={`/equipment/${w.id}`}
                  renderLink={renderLink}
                  className="unit-tile weapon-tile"
                  icon={(
                    <span className="weapon-tile__art">
                      {w.dot ? <img className="weapon-dot" src={weaponDotUrl(w.dot)} alt="" loading="lazy" /> : <img src={weaponIconUrl(w.type)} alt="" loading="lazy" />}
                      <img className="weapon-tile__type" src={weaponIconUrl(w.type)} alt="" width={20} height={20} loading="lazy" />
                    </span>
                  )}
                  title={nameOf(w) || `#${w.id}`}
                  subtitle={`${altName(w) ? `${altName(w)} · ` : ""}★${w.rarity} · ${weaponTypeName(weapons, w.type)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="home-section">
        <div className="home-links">
          {([["/units", "navUnits", "homeLinkUnits"], ["/equipment", "navEquipment", "homeLinkEquipment"],
            ["/stages", "navStages", "homeLinkStages"], ["/buffs", "navBuffs", "homeLinkBuffs"]] as [string, UiKey, UiKey][]).map(([to, label, desc]) => (
            <Link key={to} to={to} className="home-link">
              <strong>{t(label)}</strong>
              <span className="muted small">{t(desc)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Banner({ b, label, kind }: { b: HomeBanner; label: string; kind: string }) {
  return (
    <figure className="home-banner">
      <img src={bannerUrl(b.image)} alt="" width={354} height={109} loading="lazy" />
      <figcaption className="small">
        <span className={`hub-badge${b.kind === "summon" ? " hub-badge--accent" : ""}`}>{kind}</span>
        <span className="muted">{label}</span>
      </figcaption>
    </figure>
  );
}

function groupByDate<T extends { d: string }>(list: T[]): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of list) m.set(x.d, [...(m.get(x.d) || []), x]);
  return [...m.entries()];
}
