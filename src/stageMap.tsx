// Deployment map: the stage's background with every Location01.atb point drawn on a canvas, so the
// picture can be downloaded or copied as one image. Model: Aigis Tools web/src/stageMap.tsx.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { copyText } from "@altterisk/game-hub";
import { saveBlob } from "@altterisk/game-hub/persist";
import { useLang, useT } from "./i18n";
import { frameSec, mapImage, type MapSpot, type StageSpots } from "./stages";
import type { RawRow } from "./types";

// the game's battle space; the exported backgrounds are smaller and get stretched over it
const GAME_W = 1280, GAME_H = 720;
const SCALE = 0.75;
const W = GAME_W * SCALE, H = GAME_H * SCALE;
const FOOTER = 26;
const ICONS = `${import.meta.env.BASE_URL}map-icons/`;

/** Deployment kinds, in toggle order; the rest are objects on the map. */
const DEPLOY = [4, 5, 1, 9] as const;
const OBJECTS = [0, 2, 3, 7, 8] as const;
const MARKER: Record<number, string> = { 4: "melee", 5: "ranged", 1: "any", 9: "water" };
const BADGE: Record<string, { fill: string; text: string }> = {
  4: { fill: "#e5484d", text: "#fff" },
  5: { fill: "#3b82f6", text: "#fff" },
  1: { fill: "#a855f7", text: "#fff" },
  9: { fill: "#0ea5e9", text: "#fff" },
  0: { fill: "#ffffff", text: "#1b1b1b" },
  2: { fill: "#b45309", text: "#fff" },
  3: { fill: "#57534e", text: "#fff" },
  7: { fill: "#16a34a", text: "#fff" },
  8: { fill: "#f59e0b", text: "#1b1b1b" },
  x: { fill: "#9ca3af", text: "#1b1b1b" },
};
const SHORT: Record<"en" | "ja", Record<number, string>> = {
  en: { 4: "M", 5: "R", 1: "A", 9: "W" },
  ja: { 4: "近", 5: "遠", 1: "遠近", 9: "水" },
};
// 灼熱配置効果 -> 灼熱, 配置効果(猛毒) -> 猛毒
const hazardLabel = (name?: string) => (name || "配置効果").replace(/^配置効果\((.+)\)$/, "$1").replace(/(.)配置効果$/, "$1");
const kindKey = (k: number) => (k in BADGE ? String(k) : "x");
const onMap = (s: MapSpot) => s.x >= 0 && s.y >= 0 && s.x <= GAME_W && s.y <= GAME_H;

type Icons = { img: Record<string, HTMLImageElement>; origin: Record<string, [number, number]> };

/** An enemy path whose route points give it abilities (stage routeEvents): its waypoints and where each
 *  route ability holds. `ab` indexes MapPathAbility. */
export interface MapPath {
  key: string; label: string; xy: [number, number][];
  spans: { from: number; to: number | null; ab: number; hold: number }[];
}
export interface MapPathAbility { id: number; text: string }
const PATH_COLORS = ["#f97316", "#ef4444", "#a855f7", "#22c55e", "#eab308", "#06b6d4"];
const letter = (i: number) => String.fromCharCode(65 + i);
let iconsPromise: Promise<Icons | null> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });
}

// the game's own markers (BattleUITexture sprites, tools/export_map_icons.py)
function loadIcons(): Promise<Icons | null> {
  const names = ["melee", "ranged", "any", "water", "attr1", "attr2", "attr3", "attr4", "attr5"];
  iconsPromise ??= Promise.all([
    fetch(`${ICONS}origins.json`).then((r) => r.json()),
    ...names.map((n) => loadImage(`${ICONS}${n}.png`)),
  ]).then(([origin, ...imgs]) => ({ origin, img: Object.fromEntries(names.map((n, i) => [n, imgs[i] as HTMLImageElement])) }))
    .catch(() => null);
  return iconsPromise;
}

type Phase = { label: string; layer: number; t: number };

function clock(frames: number): string {
  const s = Math.round(frameSec(frames));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Start (the base layout) plus one phase per Entry Type 12 layout switch. */
export function mapPhases(info: StageSpots): Phase[] {
  const out: Phase[] = [{ label: "", layer: 0, t: 0 }];
  for (const l of info.layers ?? []) {
    if (l.t === 0) out[0].layer = l.n;
    else out.push({ label: clock(l.t), layer: l.n, t: l.t });
  }
  return out;
}

/** Spots present in a layout: the base points, with the layer's points replacing any at the same place. */
export function spotsIn(info: StageSpots, layer: number, mask: number): MapSpot[] {
  const extra = layer ? info.spots.filter((s) => s.l === layer) : [];
  const taken = new Set(extra.map((s) => `${s.x},${s.y}`));
  return [...info.spots.filter((s) => !s.l && !taken.has(`${s.x},${s.y}`)), ...extra]
    .filter((s) => !(mask && s.del && (s.del & mask)));
}

/** M1.. / R1.. per kind over every point the map ever has, by game ID, so a spot keeps its label. */
export function spotLabels(info: StageSpots, lang: "en" | "ja"): Map<number, string> {
  const n: Record<number, number> = {};
  const out = new Map<number, string>();
  for (const s of [...info.spots].sort((a, b) => a.id - b.id)) {
    if (!(s.k in MARKER)) continue;
    n[s.k] = (n[s.k] ?? 0) + 1;
    out.set(s.id, `${SHORT[lang][s.k]}${n[s.k]}`);
  }
  return out;
}

/** What a deliberation mask removes, by name: deploy labels, pre-placed units, else the kind. */
export function removedNames(info: StageSpots, mask: number, lang: "en" | "ja", hard: boolean): string[] {
  const labels = spotLabels(info, lang);
  const guest = new Map((info.guests ?? []).filter((g) => !g.diff || g.diff === (hard ? 2 : 1)).map((g) => [g.loc, g.name]));
  return [...info.spots].sort((a, b) => a.id - b.id).filter((s) => s.del && (s.del & mask))
    .map((s) => labels.get(s.id) ?? guest.get(s.id) ?? (s.k === 7 ? null : `#${s.id}`))
    .filter((x): x is string => !!x);
}

function badge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, kind: string, h = 18) {
  const w = Math.max(h + 4, ctx.measureText(text).width + 10);
  const cx = Math.min(Math.max(x, w / 2 + 1), W - w / 2 - 1);
  const cy = Math.min(Math.max(y, h / 2 + 1), H - h / 2 - 1);
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 5);
  ctx.fillStyle = BADGE[kind].fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.stroke();
  ctx.fillStyle = BADGE[kind].text;
  ctx.fillText(text, cx, cy + 1);
}

interface DrawInput {
  img: HTMLImageElement; icons: Icons | null; info: StageSpots; spots: MapSpot[]; labels: Map<number, string>;
  show: Set<string>; text: (s: MapSpot) => string | null; footer: string;
  /** deploy spots the chosen deliberations removed: drawn faded and crossed out */
  gone: MapSpot[];
  /** the chosen enemy path with its route abilities */
  path?: MapPath;
}

/** An enemy's path: the route as a line, stretches where a route ability holds in that ability's colour
 *  (letter at its start), numbered waypoints and the seconds it waits where it holds. */
function drawPath(ctx: CanvasRenderingContext2D, p: MapPath) {
  const pt = (i: number) => [p.xy[i][0] * SCALE, p.xy[i][1] * SCALE] as const;
  const on = (i: number) => { const [x, y] = p.xy[i]; return x >= 0 && y >= 0 && x <= GAME_W && y <= GAME_H; };
  const seg = (a: number, b: number, color: string, width: number) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    let open = false;
    for (let i = a; i <= b && i < p.xy.length; i++) {
      if (!on(i)) { open = false; continue; }
      const [x, y] = pt(i);
      if (open) ctx.lineTo(x, y); else { ctx.moveTo(x, y); open = true; }
    }
    ctx.stroke();
  };
  seg(0, p.xy.length - 1, "rgba(0,0,0,0.6)", 6);
  seg(0, p.xy.length - 1, "rgba(255,255,255,0.85)", 3);
  for (const s of p.spans) seg(s.from, s.to ?? p.xy.length - 1, PATH_COLORS[s.ab % PATH_COLORS.length], 5);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // waypoints: points on top of each other (a 1 px step before a hold) share one number range
  const placed: { x: number; y: number; n: string[] }[] = [];
  p.xy.forEach((_, i) => {
    if (!on(i)) return;
    const [x, y] = pt(i);
    const near = placed.find((q) => Math.hypot(q.x - x, q.y - y) < 10);
    if (near) near.n.push(String(i + 1)); else placed.push({ x, y, n: [String(i + 1)] });
  });
  ctx.font = "bold 11px Inter, system-ui, sans-serif";
  for (const q of placed) {
    const label = q.n.length > 1 ? `${q.n[0]}–${q.n[q.n.length - 1]}` : q.n[0];
    const w = Math.max(18, ctx.measureText(label).width + 8);
    ctx.fillStyle = "#11141b"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(q.x - w / 2, q.y - 9, w, 18, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.fillText(label, q.x, q.y + 1);
  }
  // ability letters (and hold seconds) beside the waypoint where each stretch starts
  for (const s of p.spans) {
    if (!on(s.from)) continue;
    const [x, y] = pt(s.from);
    const tag = `${letter(s.ab)}${s.hold ? ` ${s.hold}s` : ""}`;
    badgeAt(ctx, tag, x + 14, y - 16, PATH_COLORS[s.ab % PATH_COLORS.length]);
  }
}

function badgeAt(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string) {
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = fill; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y - 9, w, 18, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(text, x + 5, y + 1); ctx.textAlign = "center";
}

function draw(canvas: HTMLCanvasElement, d: DrawInput) {
  canvas.width = W;
  canvas.height = H + FOOTER;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(d.img, 0, 0, W, H);
  const spots = d.spots.filter((s) => onMap(s) && d.show.has(kindKey(s.k))).sort((a, b) => a.y - b.y);
  const px = (s: MapSpot) => [s.x * SCALE, s.y * SCALE] as const;
  const icon = (name: string, s: MapSpot) => {
    const im = d.icons?.img[name], o = d.icons?.origin[name];
    if (!im || !o) return 0;
    const [x, y] = px(s);
    ctx.drawImage(im, x - o[0] * SCALE, y - o[1] * SCALE, im.width * SCALE, im.height * SCALE);
    return o[1] * SCALE;
  };
  const gone = d.gone.filter((s) => onMap(s) && MARKER[s.k] && d.show.has(kindKey(s.k)));
  ctx.globalAlpha = 0.35;
  for (const s of gone) icon(MARKER[s.k], s);
  ctx.globalAlpha = 1;
  for (const s of spots) if (MARKER[s.k]) icon(MARKER[s.k], s);
  // 属性強化マス rings over the markers (PlacementEffect.EffectTextureID 1-5), as the game shows them
  for (const s of spots) {
    const tex = s.pe ? Number(d.info.pe?.[s.pe]?.[0]?.EffectTextureID ?? 0) : 0;
    if (tex >= 1 && tex <= 5) icon(`attr${tex}`, s);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  for (const s of spots) {
    const [x, y] = px(s);
    if (MARKER[s.k]) {
      const top = d.icons ? (d.icons.origin[MARKER[s.k]][1] + 2) * SCALE : 10;
      badge(ctx, d.labels.get(s.id) ?? "?", x, y - top - 8, kindKey(s.k));
      // spot effects other than the attribute rings: a star beside the marker
      const tex = s.pe ? Number(d.info.pe?.[s.pe]?.[0]?.EffectTextureID ?? 0) : 0;
      if (s.pe && !(tex >= 1 && tex <= 5)) badge(ctx, "★", x + 26, y + 6, "8", 16);
    } else {
      const t = d.text(s);
      // a 配置効果 slot shares its tile with a deploy spot: tag it under that marker
      if (t != null) badge(ctx, t, x, s.k === 8 ? y + 24 : y, kindKey(s.k), s.k === 8 ? 17 : 20);
    }
  }
  // removed spots: a red cross and their struck-out label
  for (const s of gone) {
    const [x, y] = px(s);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 12); ctx.lineTo(x + 12, y + 12);
    ctx.moveTo(x + 12, y - 12); ctx.lineTo(x - 12, y + 12);
    ctx.stroke();
    const top = d.icons ? (d.icons.origin[MARKER[s.k]][1] + 2) * SCALE : 10;
    const label = d.labels.get(s.id) ?? "?";
    badge(ctx, label, x, y - top - 8, "x");
    const w = ctx.measureText(label).width;
    ctx.strokeStyle = "#b91c1c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 2, y - top - 7); ctx.lineTo(x + w / 2 + 2, y - top - 7);
    ctx.stroke();
  }
  if (d.path) drawPath(ctx, d.path);
  ctx.fillStyle = "#11141b";
  ctx.fillRect(0, H, W, FOOTER);
  ctx.fillStyle = "#e6e8ee";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(d.footer, 8, H + FOOTER / 2);
}

export function StageMap({ info, mapNo, questId, name, hard, removers, rowList, paths, pathAbilities }: {
  info: StageSpots; mapNo: number; questId: number; name: string; hard: boolean;
  /** enemy paths whose route points give the enemy abilities, and those abilities' texts */
  paths?: MapPath[]; pathAbilities?: MapPathAbility[];
  /** chosen deliberations that remove spots (配置マス制限) */
  removers: { name: string; mask: number }[];
  /** renders effect rows with the stage page's effect list: PlacementEffect rows, or a card's Ability rows */
  rowList: (rows: RawRow[], kind: "organized" | "ability") => ReactNode;
}) {
  const t = useT();
  const lang = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [icons, setIcons] = useState<Icons | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState(0);
  const [note, setNote] = useState("");
  const [pathKey, setPathKey] = useState("");
  const path = paths?.find((p) => p.key === pathKey);
  const phases = useMemo(() => mapPhases(info), [info]);
  const cur = phases[Math.min(phase, phases.length - 1)];
  const labels = useMemo(() => spotLabels(info, lang), [info, lang]);
  const mask = removers.reduce((m, r) => m | r.mask, 0);
  const spots = useMemo(() => spotsIn(info, cur.layer, mask), [info, cur.layer, mask]);
  const gone = useMemo(() => spotsIn(info, cur.layer, 0).filter((s) => s.del && (s.del & mask)), [info, cur.layer, mask]);

  const guests = useMemo(() => new Map((info.guests ?? [])
    .filter((g) => !g.diff || g.diff === (hard ? 2 : 1)).map((g) => [g.loc, g])), [info, hard]);
  const hazards = useMemo(() => new Map((info.hazards ?? []).map((h) => [h.loc, h])), [info]);
  // 配置効果 slots only matter where the battle puts an effect unit on them
  const present = spots.filter((s) => s.k !== 8 || hazards.has(s.id)).filter((s) => s.k !== 7 || guests.has(s.id));
  const text = (s: MapSpot): string | null => {
    if (s.k === 0) return "本陣";
    if (s.k === 2) return "蔵";
    if (s.k === 3) {
      const b = info.buildings?.[String(s.p)];
      return b?.Health ? `HP ${b.Health}` : "◆";
    }
    if (s.k === 7) return guests.get(s.id)?.name || "?";
    if (s.k === 8) return hazardLabel(hazards.get(s.id)?.name);
    return String(s.k);
  };

  const phaseText = phases.length > 1 ? ` · ${phase ? cur.label : t("mapStart")}` : "";
  const footer = `${name}${phaseText} · ${location.host}${location.pathname}`;
  const canCopyImage = typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

  useEffect(() => {
    setFailed(false);
    setImg(null);
    loadImage(mapImage(mapNo)).then(setImg, () => setFailed(true));
  }, [mapNo]);
  useEffect(() => { loadIcons().then(setIcons); }, []);

  const show = useMemo(() => {
    const all = new Set([...DEPLOY, ...OBJECTS].map(String).concat("x"));
    hidden.forEach((k) => all.delete(k));
    return all;
  }, [hidden]);

  useEffect(() => {
    if (img && icons !== undefined && canvasRef.current) {
      draw(canvasRef.current, { img, icons, info, spots: present, labels, show, text, footer, gone, path });
    }
  });

  const flash = (s: string) => {
    setNote(s);
    setTimeout(() => setNote(""), 2000);
  };
  const png = () => new Promise<Blob>((resolve, reject) =>
    canvasRef.current!.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
  const toggle = (k: string) => setHidden((h) => {
    const n = new Set(h);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const count = (k: string) => present.filter((s) => onMap(s) && kindKey(s.k) === k).length;
  const kinds = [...DEPLOY.map(String), ...OBJECTS.map(String), "x"].filter((k) => count(k) > 0);
  const peSpots = new Map<number, string[]>();
  for (const s of [...present].sort((a, b) => a.id - b.id)) {
    if (s.pe) peSpots.set(s.pe, [...(peSpots.get(s.pe) ?? []), labels.get(s.id) ?? String(s.id)]);
  }
  const shownBuildings = [...new Set(present.filter((s) => s.k === 3 && s.p).map((s) => s.p!))];
  const shownGuests = [...guests.values()].filter((g) => present.some((s) => s.id === g.loc));
  const offMap = shownGuests.filter((g) => present.some((s) => s.id === g.loc && !onMap(s)));
  const n = (k: number) => present.filter((s) => s.k === k).length;
  const ready = !!img && icons !== undefined;

  return (
    <div className="stage-map">
      {phases.length > 1 && (
        <div className="stage-map-phases" role="group" aria-label={t("mapPhases")}>
          <span className="muted small">{t("mapPhases")}</span>
          {phases.map((p, i) => (
            <button key={i} type="button" aria-pressed={phase === i}
              className={`hub-btn hub-btn--sm${phase === i ? " stage-map-phase--active" : ""}`} onClick={() => setPhase(i)}>
              {i ? p.label : t("mapStart")}
              {i > 0 && <span className="stage-map-phase-note">{p.layer ? t("mapLayout", { n: p.layer }) : t("mapLayout0")}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="stage-map-toolbar">
        {kinds.map((k) => (
          <label key={k} className="stage-map-toggle">
            <input type="checkbox" checked={!hidden.has(k)} onChange={() => toggle(k)} />
            <span className="stage-map-key" style={{ background: BADGE[k].fill, color: BADGE[k].text }}>
              {MARKER[Number(k)] ? SHORT[lang][Number(k)] : k === "0" ? "本" : k === "2" ? "蔵" : k === "x" ? "?" : "◆"}
            </span>
            {t(`mapK${k}` as Parameters<typeof t>[0])} ({count(k)})
          </label>
        ))}
        <span className="stage-map-actions">
          <button type="button" className="hub-btn hub-btn--sm" disabled={!ready}
            onClick={async () => saveBlob(await png(), `oshiro-stage-${questId}-map${phase ? `-${phase}` : ""}.png`)}>
            {t("mapDownload")}
          </button>
          {canCopyImage && (
            <button type="button" className="hub-btn hub-btn--sm" disabled={!ready}
              onClick={() => navigator.clipboard.write([new ClipboardItem({ "image/png": png() })])
                .then(() => flash(t("mapCopied")), () => flash(t("mapCopyFailed")))}>
              {t("mapCopyImage")}
            </button>
          )}
          <button type="button" className="hub-btn hub-btn--sm"
            onClick={() => copyText(location.href).then((ok) => flash(t(ok ? "mapCopied" : "mapCopyFailed")))}>
            {t("mapCopyLink")}
          </button>
          {note && <span className="muted small" role="status">{note}</span>}
        </span>
      </div>
      {paths && paths.length > 0 && (
        <div className="stage-map-phases" role="group" aria-label={t("mapPaths")}>
          <span className="muted small">{t("mapPaths")}</span>
          <button type="button" aria-pressed={!path} className={`hub-btn hub-btn--sm${!path ? " stage-map-phase--active" : ""}`}
            onClick={() => setPathKey("")}>{t("mapPathNone")}</button>
          {paths.map((p) => (
            <button key={p.key} type="button" aria-pressed={pathKey === p.key}
              className={`hub-btn hub-btn--sm${pathKey === p.key ? " stage-map-phase--active" : ""}`} onClick={() => setPathKey(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      )}
      {failed ? <p className="muted">{t("mapUnavailable")}</p> : !ready && <p className="loading">{t("mapLoading")}</p>}
      <canvas ref={canvasRef} className="stage-map-canvas" hidden={!ready || failed}
        aria-label={t("mapAria", { name, m: n(4), r: n(5), a: n(1), w: n(9) })} />
      {path && (
        <ul className="fx-plain small stage-map-path-legend">
          {[...new Set(path.spans.map((x) => x.ab))].map((ab) => (
            <li key={ab}>
              <span className="stage-map-key" style={{ background: PATH_COLORS[ab % PATH_COLORS.length], color: "#fff" }}>{letter(ab)}</span>{" "}
              {pathAbilities?.[ab]?.text}{" "}
              <span className="muted">({path.spans.filter((x) => x.ab === ab).map((x) => x.to === null
                ? t("routeToEnd", { a: x.from + 1, n: path.xy.length })
                : t("routeSpan", { a: x.from + 1, b: x.to + 1, n: path.xy.length })).join("; ")})</span>
            </li>
          ))}
          <li className="muted">{t("mapPathNote")}</li>
        </ul>
      )}
      {removers.map((r) => {
        const names = removedNames(info, r.mask, lang, hard);
        return names.length ? <p key={r.name} className="small chg-singi">{t("mapRemoved", { name: r.name, spots: names.join(", ") })}</p> : null;
      })}
      {shownGuests.length > 0 && (
        <ul className="fx-plain small">
          {shownGuests.map((g) => (
            <li key={g.loc}>{t("mapK7")}: {g.name} {t("mapLv", { n: g.lv })}{offMap.includes(g) ? ` (${t("mapOffMap")})` : ""}</li>
          ))}
        </ul>
      )}
      {shownBuildings.length > 0 && (
        <ul className="fx-plain small">
          {shownBuildings.map((b) => {
            const r = info.buildings?.[String(b)];
            return r ? (
              <li key={b}>{t("mapBuildingRow", { id: b, hp: r.Health ?? 0, def: r.Defense ?? 0 })}
                {r.BuildingType === 1 && r.BlockCount ? t("mapBlocker") : r.BuildingType === 2 ? t("mapCapturable") : ""}</li>
            ) : null;
          })}
        </ul>
      )}
      {[...peSpots.entries()].map(([id, names]) => {
        const rows = info.pe?.[String(id)];
        if (!rows) return null;
        const tex = Number(rows[0]?.EffectTextureID ?? 0);
        return (
          <div key={id} className="stage-map-pe">
            <span className="small">
              {tex >= 1 && tex <= 5 ? <img src={`${ICONS}attr${tex}.png`} alt="" className="stage-map-pe-icon" /> : <span className="stage-map-key" style={{ background: BADGE[8].fill }}>★</span>}
              {" "}{t("mapPe", { spots: names.join(", ") })}
            </span>
            {rowList(rows, "organized")}
          </div>
        );
      })}
      {[...new Set(present.filter((s) => s.k === 8 && onMap(s)).map((s) => hazards.get(s.id)!.card))].map((card) => {
        const rows = info.hazardRows?.[String(card)];
        const name = (info.hazards ?? []).find((h) => h.card === card)?.name ?? "";
        return rows?.length ? (
          <div key={card} className="stage-map-pe">
            <span className="small"><span className="stage-map-key" style={{ background: BADGE[8].fill, color: BADGE[8].text }}>{hazardLabel(name)}</span> {name}</span>
            {rowList(rows, "ability")}
          </div>
        ) : null;
      })}
      <p className="muted small">{t("mapNote")}</p>
    </div>
  );
}
