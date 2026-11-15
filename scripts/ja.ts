// Coverage of the Japanese effect wording (src/effectsJa.ts) over every sentence the site prints
// (the humanize corpus) and the buff list's effect names, receivers and conditions.
//   node scripts/ja.mjs <corpus.txt> [report.md]   (npm run ja)
import fs from "node:fs";
import { effectJaRaw, receiverJa, clauseJa, hasEnglish } from "../src/effectsJa";

const corpus = fs.readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean);
const buffs = JSON.parse(fs.readFileSync("public/data/buffs.json", "utf8"));
const names = Object.values<string>(buffs.keys);
const recv = [...new Set<string>(buffs.rows.map((r: { w: string }) => r.w))];
const notes = [...new Set<string>(buffs.rows.map((r: { n?: string }) => r.n).filter(Boolean))];

const strip = (s: string) => s.replace(/#\d+|\b(?:ms|s)\b/g, "");
const eng = hasEnglish;
const words = new Map<string, { n: number; ex: string }>();
function tally(src: string, out: string) {
  if (!eng(out)) return true;
  for (const w of new Set(strip(out).match(/[A-Za-z][A-Za-z'’.-]*(?: [A-Za-z][A-Za-z'’.-]*)*/g) ?? [])) {
    const h = words.get(w) ?? { n: 0, ex: `${src}\n    → ${out}` };
    h.n++;
    words.set(w, h);
  }
  return false;
}
const run = (label: string, list: string[], f: (s: string) => string) => {
  let ok = 0;
  for (const s of list) if (tally(s, f(s))) ok++;
  console.log(`${label}: ${ok}/${list.length} (${((100 * ok) / list.length).toFixed(1)}%)`);
};
run("sentences", corpus, effectJaRaw);
run("buff effect names", names, clauseJa);
run("buff receivers", recv, receiverJa);
run("buff conditions", notes, clauseJa);
const top = [...words.entries()].sort((a, b) => b[1].n - a[1].n);
if (process.argv[3]) fs.writeFileSync(process.argv[3], top.slice(0, 500).map(([w, h]) => `${h.n}\t${w}\n    ${h.ex}`).join("\n"));
console.log(top.slice(0, 60).map(([w, h]) => `${h.n} ${w}`).join(" | "));
