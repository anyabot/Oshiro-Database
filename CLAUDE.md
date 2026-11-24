# Oshiro Database — notes for agents

- Data updates: `python tools/pipeline.py` (fetch → export → translate → names → build). See README "Update pipeline".
- After an update, check `tools/out/translations_to_check.md` (new machine-translated names of castle girls,
  equipment and lord outfits) and `tools/out/untranslated.md` (names still in Japanese). Fix entries in
  `tools/data/{unit,weapon,lord}_names_en.json`, then run `python tools/names_en.py`. Details: README "English names".
- Never overwrite hand-fixed entries in those tables; `translate_names.py` only fills missing ones.
- After changing the effect describer or `scripts/buffs.ts`, run `npm run buffs` and check `tools/out/buff_coverage.md`:
  its "Uncategorized" list must be empty (add a rule or a skip reason in `scripts/buffs.ts`).
- After changing the effect describer (`src/effects.tsx`), run `npm run sweep` and check `tools/out/sweep.md`: it
  flags raw codes and wordings the game's own texts contradict (e.g. "set to 10%" where the text says 10%軽減).
- Change log: every data update or new feature gets an entry at the top of `src/changelog.ts` (shown on /changelog and
  as a once-per-release popup). Only new castle girls (`unit`) and site features (`feature`), in EN and JA; no fixes,
  no data refreshes, no internal changes.
