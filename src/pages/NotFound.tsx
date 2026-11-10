import { Link } from "react-router-dom";
import { EmptyState } from "@altterisk/game-hub";
import { NOT_FOUND_META } from "../meta";
import { usePageMeta } from "../usePageMeta";

export default function NotFoundPage() {
  usePageMeta(NOT_FOUND_META);
  return (
    <div className="page">
      <EmptyState title="Page not found." action={<Link to="/units">Back to the castle girl list</Link>} />
    </div>
  );
}
