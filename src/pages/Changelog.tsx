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

/** The last release a visitor has seen ("" = never visited: nothing to catch up on). */
const seen = createSetting<string | null>({
  key: "oshiro.changelog.seen",
  initial: null,
  version: 1,
  sanitize: (raw) => (typeof raw === "string" ? raw : null),
});

/** Once per release: what's new since the visitor's last visit (first-time visitors are not shown it). */
export function ChangelogDialog() {
  const t = useT();
  const lang = useLang();
  const kindLabel = useKindLabel();
  const [last, setLast] = seen.use();
  const latest = latestRelease();
  useEffect(() => {
    if (last === null) setLast(latest); // a first visit banks the current release silently
  }, [last, latest, setLast]);
  const close = () => setLast(latest);
  const fresh = RELEASES.filter((r) => last !== null && r.date > last);
  return (
    <HubChangelogDialog open={fresh.length > 0} onClose={close} releases={releasesFor(lang).slice(0, fresh.length)}
      kindLabel={kindLabel} title={t("changeWhatsNew")} closeLabel={t("changeClose")}
      footer={<Link to="/changelog" onClick={close}>{t("changeSeeAll")}</Link>} />
  );
}
