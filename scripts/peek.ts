import fs from "node:fs";
import { describeRow, rowBases, type EffectDefs } from "../src/effects";
const defs: EffectDefs = JSON.parse(fs.readFileSync("public/data/effects.json", "utf-8"));
const want = new Set(process.argv.slice(2).map(Number));
for (const f of fs.readdirSync("public/data/unit")) {
  const u = JSON.parse(fs.readFileSync(`public/data/unit/${f}`, "utf-8"));
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (Array.isArray(o.effects) && want.has(o.id)) {
      const b = rowBases(o.effects);
      console.log(`#${o.id} ${o.name} | ${(o.description ?? "").replace(/\n/g, " ")}`);
      o.effects.forEach((r: any, i: number) => console.log("   ", describeRow(r, "ability", defs, o.field_links?.[String(i)], b[i]).text.join(" · ")));
      want.delete(o.id);
    }
    Object.values(o).forEach(walk);
  };
  walk(u);
}
