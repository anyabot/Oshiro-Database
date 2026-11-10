import fs from "node:fs";
import { describeRow, type EffectDefs } from "../src/effects";
const defs: EffectDefs = JSON.parse(fs.readFileSync("public/data/effects.json", "utf-8"));
const want = new Set(process.argv.slice(2).map(Number));
for (const f of fs.readdirSync("public/data/unit")) {
  const u = JSON.parse(fs.readFileSync(`public/data/unit/${f}`, "utf-8"));
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (want.has(o.id) && o.effect?.row) {
      want.delete(o.id);
      console.log(o.id, o.name, "|", describeRow(o.effect.row, "enchant", defs).text.join(" · "), "|", (o.description ?? "").replace(/\n/g, ""));
    }
    Object.values(o).forEach(walk);
  };
  walk(u);
}
