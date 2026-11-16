# Oshiro Database — notes for agents

- Data updates: `python tools/pipeline.py` (fetch → export → translate → names → build). See README "Update pipeline".
- After an update, check `tools/out/translations_to_check.md` (new machine-translated names of castle girls,
  equipment and lord outfits) and `tools/out/untranslated.md` (names still in Japanese). Fix entries in
  `tools/data/{unit,weapon,lord}_names_en.json`, then run `python tools/names_en.py`. Details: README "English names".
- Never overwrite hand-fixed entries in those tables; `translate_names.py` only fills missing ones.
