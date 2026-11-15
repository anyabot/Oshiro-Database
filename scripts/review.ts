// Read-through aid: every distinct sentence shape (numbers -> N, receivers -> R, stat names -> S) with one
// real example in English and Japanese, most frequent first.
//   node scripts/review.mjs <corpus.txt> <out.txt>
import fs from "node:fs";
import { effectJaRaw, receiverJa } from "../src/effectsJa";

const corpus = fs.readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean);
const STATS = /\b(Max HP|Current HP|HP|ATK|DEF|Regen|Range|Attack speed|Attack gap|Targets|Block|Move speed|Blast radius|Splash damage rate|Direct-hit bonus|Giantify Ki|Deploy Ki|Redeploy time|Time until stratagem|Stratagem cooldown|Stratagem Ki cost|Ki per kill|Healing given|Healing received|Anti-air bonus|Anti-yokai bonus|DEF ignore|Area|Magic defense)\b/gi;

function shape(s: string): string {
  return s
    .split(" · ")
    .map((p) => {
      const i = p.indexOf(": ");
      const head = i > 0 && /^[A-Z★]/.test(p) ? p.slice(0, i) : "";
      // a receiver head is any head the receiver grammar fully translates
      const rest = head && !/[A-Za-z]{2,}/.test(receiverJa(head).replace(/\b(?:GuP|JFW)\b/g, "")) ? `R: ${p.slice(i + 2)}` : p;
      return rest;
    })
    .join(" · ")
    .replace(/[−+-]?\d+(\.\d+)?/g, "N")
    .replace(STATS, "S")
    .replace(/S(?:, S)*(?:,? and S)/g, "S")
    .replace(/#N/g, "#");
}

const groups = new Map<string, { n: number; ex: string }>();
for (const s of corpus) {
  const k = shape(s);
  const g = groups.get(k) ?? { n: 0, ex: s };
  g.n++;
  groups.set(k, g);
}
const list = [...groups.entries()].sort((a, b) => b[1].n - a[1].n);
fs.writeFileSync(process.argv[3], list.map(([k, g], i) => `${i + 1}. [${g.n}] ${k}\n   EN ${g.ex}\n   JA ${effectJaRaw(g.ex)}`).join("\n"));
console.log(`${corpus.length} sentences, ${list.length} shapes`);
