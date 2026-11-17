// "How these stack": the stacking rules behind the effect lines a list shows, spelled out once under it.
// Every rule here is read from the game's battle code (shiroprore_exe.exe, Ghidra):
//  - FUN_00549240 / FUN_00547bc0 sum a unit's modifiers per status: plain % (ValueType 2) keeps only the
//    largest increase and the largest decrease; ValueType 3/4/5 % and flat amounts add up (flat ones of a
//    few count-like statuses keep the largest too). The sentences tag these "doesn't stack" / "stacks".
//  - FUN_00546780 adds a status set to a unit. A set whose key (source + effect) is already on the unit
//    is not added again: the live one is overwritten by the new copy (FUN_00498840), or grown by one step
//    for "+N more each …" rows (FUN_00ae8ae0, clamped to their cap), and in both cases its timer's elapsed
//    count is reset (FUN_00414720), so the full duration starts over.
import { useT, type UiKey } from "./i18n";

const TRIGGER = /\b(each time it is attacked|each time attacked|each attack it makes|each attack|each hit taken|each hit|each enemy it defeats|each enemy defeated|each kill|each trigger|on hit|with its special attack|every second|every \d+(?:\.\d+)? ?s(?:econds)?)\b/i;
const DURATION = /\bfor (\d+(?:\.\d+)?)s\b/;
const GROWS = /\b(more (each|every)|grows by that amount)\b/;

/** The stacking notes that apply to these sentences (English, as describeRow writes them). */
export function stackNoteKeys(texts: string[]): { key: UiKey; vars?: Record<string, string> }[] {
  const lines = texts.filter(Boolean);
  const out: { key: UiKey; vars?: Record<string, string> }[] = [];
  if (lines.some((l) => /, doesn't stack\b/.test(l))) out.push({ key: "stackNoteStrongest" });
  if (lines.some((l) => /, stacks\b/.test(l))) out.push({ key: "stackNoteAdds" });
  // a triggered buff/debuff (a status change or one with a timer), not a repeating one-off like "Ki +1 every 5s"
  const triggered = lines.filter((l) => TRIGGER.test(l) && (/, (doesn't )?stacks?\b/.test(l) || DURATION.test(l) || GROWS.test(l)));
  // the plain ones are replaced on a new trigger; the "+N more each …" ones grow instead (own note)
  const plain = triggered.filter((l) => !GROWS.test(l));
  if (plain.length) {
    const secs = [...new Set(plain.map((l) => DURATION.exec(l)?.[1]).filter((s): s is string => !!s))];
    if (secs.length === 1) out.push({ key: "stackNoteRetrigger", vars: { d: `${secs[0]}s` } });
    else if (secs.length > 1) out.push({ key: "stackNoteRetriggerAny" });
    else out.push({ key: "stackNoteRetriggerNoTimer" });
  }
  if (triggered.length > plain.length) out.push({ key: "stackNoteGrow" });
  return out;
}

/** The notes as a small block under an effect list; nothing when no rule applies. */
export function StackNotes({ texts }: { texts: string[] }) {
  const t = useT();
  const notes = stackNoteKeys(texts);
  if (!notes.length) return null;
  return (
    <div className="fx-stack" title={t("stackNoteSource")}>
      <span className="fx-stack__label">{t("stackNoteTitle")}</span>
      <ul>
        {notes.map((n) => <li key={n.key}>{t(n.key, n.vars)}</li>)}
      </ul>
    </div>
  );
}
