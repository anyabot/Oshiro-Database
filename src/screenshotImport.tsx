// Collection import from screenshots of the in-game list (城娘確認 / 城娘一覧): icons are recognized in the
// browser (src/iconMatch.ts, hashes from tools/icon_hashes.py), renovation is read off each icon's 改/改弐
// badge, nothing is uploaded. Sure matches go straight in (with an undo); unsure ones wait for a tick.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FallbackImage, Panel } from "@altterisk/game-hub";
import { createJsonLoader } from "@altterisk/game-hub/data";
import {
  HASH_BITS, cropDataUrl, isConfident, renovationBadge, scanScreenshotFile, unpackIconHashes,
  type IconHashDb, type IconHashJson,
} from "./iconMatch";
import { iconUrl, nameOf, tierName } from "./data";
import { useT } from "./i18n";
import type { Collection } from "./collection";
import type { UnitIndexEntry } from "./types";

const loader = createJsonLoader({ urls: (n) => [`${import.meta.env.BASE_URL}data/${n}.json`] });
const MAX_FILES = 40;

interface Candidate { unit: UnitIndexEntry; dist: number; tier: number | null; cropUrl: string; checked: boolean }

export function ScreenshotImport({ byId, coll, setColl }: {
  byId: Map<number, UnitIndexEntry>;
  coll: Collection;
  setColl: (f: (c: Collection) => Collection) => void;
}) {
  const t = useT();
  const dbRef = useRef<IconHashDb | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [added, setAdded] = useState<UnitIndexEntry[]>([]);
  const [undo, setUndo] = useState<Collection | null>(null);
  const [note, setNote] = useState("");

  /** the tier to store: the badge read off the screenshot (capped at her max), else what she had / her max */
  const tierFor = (u: UnitIndexEntry, badge: number | null, c: Collection) =>
    badge != null ? Math.min(badge, u.renovation) : c[u.id] ?? u.renovation;

  const scanFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList?.length || scanning) return;
    const all = [...fileList].filter((f) => f.type.startsWith("image/"));
    const files = all.slice(0, MAX_FILES);
    if (!files.length) return;
    setScanning(true);
    setNote("");
    try {
      if (!dbRef.current) {
        setProgress(t("scanLoading"));
        dbRef.current = unpackIconHashes(await loader.load<IconHashJson>("icon_hashes"));
      }
      const db = dbRef.current;
      // per castle girl: the surest sighting; its badge sets the tier
      const sure = new Map<number, { unit: UnitIndexEntry; tier: number | null; dist: number }>();
      const review = new Map<number, Candidate>();
      for (let fi = 0; fi < files.length; fi += 1) {
        const file = files[fi];
        const label = files.length > 1 ? `${fi + 1}/${files.length}` : "";
        const { matches, canvas } = await scanScreenshotFile(file, db, (f) => setProgress(t("scanProgress", { file: label, pct: Math.round(f * 100) })));
        const img = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
        for (const m of matches) {
          const unit = byId.get(Number(m.unitId));
          if (!unit) continue;
          const tier = renovationBadge(img, m.rect);
          if (isConfident(m)) {
            const prev = sure.get(unit.id);
            // a sighting with a readable badge beats one cut by the screenshot's edge
            if (!prev || (prev.tier == null && tier != null) || (tier != null && m.dist < prev.dist)) sure.set(unit.id, { unit, tier, dist: m.dist });
            review.delete(unit.id);
            continue;
          }
          if (sure.has(unit.id)) continue;
          const prev = review.get(unit.id);
          if (prev && prev.dist <= m.dist) continue;
          review.set(unit.id, { unit, dist: m.dist, tier, cropUrl: cropDataUrl(canvas, m.rect), checked: false });
        }
      }
      let fresh = 0, retiered = 0, same = 0;
      const newOnes: UnitIndexEntry[] = [];
      for (const { unit, tier } of sure.values()) {
        const had = String(unit.id) in coll;
        const next = tierFor(unit, tier, coll);
        if (!had) { fresh++; newOnes.push(unit); } else if (coll[unit.id] !== next) retiered++; else same++;
      }
      if (fresh || retiered) {
        setUndo(coll);
        setColl((c) => {
          const n = { ...c };
          for (const { unit, tier } of sure.values()) n[unit.id] = tierFor(unit, tier, c);
          return n;
        });
      }
      setAdded(newOnes);
      setCandidates([...review.values()]);
      const parts = [
        fresh ? t("scanAdded", { n: fresh }) : "",
        retiered ? t("scanRetiered", { n: retiered }) : "",
        same ? t("scanSame", { n: same }) : "",
        review.size ? t("scanReview", { n: review.size }) : "",
        all.length > MAX_FILES ? t("scanTooMany", { n: MAX_FILES }) : "",
      ].filter(Boolean);
      setNote(sure.size || review.size ? parts.join(" ") : t("scanNone"));
    } catch (e) {
      setNote(e instanceof Error ? e.message : t("scanFailed"));
    } finally {
      setScanning(false);
      setProgress("");
    }
  };

  const selected = candidates.filter((c) => c.checked);
  return (
    <Panel title={t("scanTitle")}>
      <div className="coll-drop" tabIndex={0}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void scanFiles(e.dataTransfer.files); }}
        onPaste={(e) => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); void scanFiles(f); } }}>
        <p className="small muted">{t("scanHelp", { n: MAX_FILES })}</p>
        <input type="file" accept="image/*" multiple disabled={scanning}
          onChange={(e) => { void scanFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {scanning && <p className="coll-scan-msg">{progress}</p>}
      {note && !scanning && <p className="coll-scan-msg">{note}</p>}
      {undo && !scanning && (
        <div className="coll-scan-added">
          {added.slice(0, 60).map((u) => (
            <Link key={u.id} to={`/units/${u.id}`} title={nameOf(u)}>
              {u.face != null && <FallbackImage srcs={[iconUrl(u.face)]} alt={nameOf(u)} width={40} height={40} />}
            </Link>
          ))}
          {added.length > 60 && <span className="muted small">+{added.length - 60}</span>}
          <button type="button" className="hub-btn hub-btn--sm" onClick={() => { setColl(() => undo); setUndo(null); setAdded([]); setNote(t("scanUndone")); }}>{t("scanUndo")}</button>
        </div>
      )}
      {candidates.length > 0 && <>
        <div className="coll-scan-grid">
          {candidates.map((c) => {
            const pct = Math.round(100 * (1 - c.dist / HASH_BITS));
            return (
              <label key={c.unit.id} className={`coll-scan-tile${c.checked ? " on" : ""}`} title={`${pct}%`}>
                <input type="checkbox" checked={c.checked}
                  onChange={() => setCandidates((cur) => cur.map((x) => (x.unit.id === c.unit.id ? { ...x, checked: !x.checked } : x)))} />
                <img src={c.cropUrl} alt="" width={48} height={48} />
                <span aria-hidden="true">→</span>
                {c.unit.face != null && <FallbackImage srcs={[iconUrl(c.unit.face)]} alt="" width={48} height={48} />}
                <span className="coll-scan-name">
                  {nameOf(c.unit)}
                  <span className="muted small">{pct}%{c.tier != null ? ` · ${tierName(Math.min(c.tier, c.unit.renovation))}` : ""}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="coll-bulk">
          <button type="button" className="hub-btn" disabled={!selected.length}
            onClick={() => {
              setUndo(coll);
              setColl((cur) => {
                const n = { ...cur };
                for (const c of selected) n[c.unit.id] = tierFor(c.unit, c.tier, cur);
                return n;
              });
              setCandidates((cur) => cur.filter((c) => !c.checked));
            }}>
            {t("scanAddTicked", { n: selected.length })}
          </button>
          <button type="button" className="hub-btn" onClick={() => { setCandidates([]); setNote(""); }}>{t("scanDismiss")}</button>
        </div>
      </>}
    </Panel>
  );
}
