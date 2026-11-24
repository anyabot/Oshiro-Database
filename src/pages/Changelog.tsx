import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChangelogDialog as HubChangelogDialog, PageHeader, ReleaseList, type Release } from "@altterisk/game-hub";
import { createSetting } from "@altterisk/game-hub/persist";
import { RELEASES, latestRelease, type ChangeKind } from "../changelog";
import { useLang, useT, type Lang } from "../i18n";

const KIND_ORDER: ChangeKind[] = ["unit", "feature"];

function releasesFor(lang: Lang): Release[] {
  return RELEASES.map((r) => ({
    date: r.date,
    title: r.title[lang],
    entries: [...r.entries]
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
      .map((e) => ({ kind: e.kind, text: e.text[lang] })),
  }));
}

function useKindLabel() {
  const t = useT();
  return (k: string) => t(k === "unit" ? "changeKindUnit" : "changeKindFeature");
}

export default function ChangelogPage() {
  const t = useT();
  const lang = useLang();
  return (
    <div className="page">
      <PageHeader title={t("navChangelog")} />
      <ReleaseList releases={releasesFor(lang)} kindLabel={useKindLabel()} />
    </div>
  );
}

const SEEN_KEY = "oshiro.changelog.lastSeen";
/** The first key banked every visitor silently, the ones who had been here before included. */
const LEGACY_KEY = "oshiro.changelog.seen";

/** The last release a visitor has seen (null = no record yet). */
const seen = createSetting<string | null>({
  key: SEEN_KEY,
  initial: null,
  version: 1,
  sanitize: (raw) => (typeof raw === "string" ? raw : null),
});

/** Read once at load, before this visit writes anything: any other stored setting means they have been here before. */
const returning = (() => {
  try {
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k !== SEEN_KEY) return true;
    }
  } catch {
    // no storage: treat as a first visit
  }
  return false;
})();

/** Once per release: what's new since the visitor's last visit. A first-ever visitor is not shown it; a returning
 *  visitor without a record yet (the log is newer than their last visit) gets the latest release. */
export function ChangelogDialog() {
  const t = useT();
  const lang = useLang();
  const kindLabel = useKindLabel();
  const [last, setLast] = seen.use();
  const latest = latestRelease();
  useEffect(() => {
    if (last === null && !returning) setLast(latest); // a first visit banks the current release silently
    try { window.localStorage.removeItem(LEGACY_KEY); } catch { /* nothing to clear */ }
  }, [last, latest, setLast]);
  const close = () => setLast(latest);
  const fresh = last === null ? (returning ? RELEASES.slice(0, 1) : []) : RELEASES.filter((r) => r.date > last);
  return (
    <HubChangelogDialog open={fresh.length > 0} onClose={close} releases={releasesFor(lang).slice(0, fresh.length)}
      kindLabel={kindLabel} title={t("changeWhatsNew")} closeLabel={t("changeClose")}
      footer={<Link to="/changelog" onClick={close}>{t("changeSeeAll")}</Link>} />
  );
}
