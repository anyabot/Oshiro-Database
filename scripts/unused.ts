import fs from "node:fs";
import { describeRow, rowBases, type EffectDefs } from "../src/effects";
const defs: EffectDefs = JSON.parse(fs.readFileSync("public/data/effects.json", "utf-8"));
const field = process.argv[2];
const c = new Map<string, { n: number; ex: string }>();
for (const f of fs.readdirSync("public/data/unit")) {
  const u = JSON.parse(fs.readFileSync(`public/data/unit/${f}`, "utf-8"));
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (Array.isArray(o.effects) && o.effects[0] && "AbilityType" in o.effects[0]) {
      const b = rowBases(o.effects);
      o.effects.forEach((r: any, i: number) => {
        const s = describeRow(r, "ability", defs, o.field_links?.[String(i)], b[i]);
        if (field in s.rest) {
          const h = b[i] ?? r;
          const k = `${h.AbilityType}/${h.AbilityTypeDetail ?? 0} ${field}=${r[field]}`;
          const e = c.get(k) ?? { n: 0, ex: `${o.name} | ${s.text.join(" · ")} | ${(o.description ?? "").replace(/\n/g, "").slice(0, 70)}` };
          e.n++; c.set(k, e);
        }
      });
    }
    Object.values(o).forEach(walk);
  };
  walk(u);
}
[...c.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 30).forEach(([k, v]) => console.log(v.n, k, "::", v.ex));
