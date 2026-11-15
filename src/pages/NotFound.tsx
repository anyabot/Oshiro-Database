import { Link } from "react-router-dom";
import { EmptyState } from "@altterisk/game-hub";
import { NOT_FOUND_META } from "../meta";
import { usePageMeta } from "../usePageMeta";
import { useT } from "../i18n";

export default function NotFoundPage() {
  usePageMeta(NOT_FOUND_META);
  const t = useT();
  return (
    <div className="page">
      <EmptyState title={t("pageNotFound")} action={<Link to="/units">{t("backToList")}</Link>} />
    </div>
  );
}
