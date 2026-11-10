# Oshiro Database

_(castle girl viewer)_ — live at [oshiro.altterisk.cc](https://oshiro.altterisk.cc)

A React (Vite) frontend that reads locally exported game data for
**Shiro Project:RE** (御城プロジェクト:RE / 城プロRE). It shows every castle
girl: rarity, weapon type, region, traits, class stats, specialty (特技),
formation specialty (編成特技), stratagems (計略) per renovation tier
(未改築 / 改壱 / 改弐), class ability, potential, special abilities, dedicated
weapon and profile text. Effect mechanics that are not decoded yet are shown
as raw table fields, never guessed.

List pages keep their search, filters and page in the URL, so back/forward and
shared links restore the same view (`?page=` counts from 0).

## Data

All data lives under `public/`:

- `public/data/units.json` — slim card list; `public/data/unit/<id>.json` — one full card, loaded on demand
- `public/data/meta.json` — label tables (weapon types, regions, rarities, categories, traits) taken from the game's own text tables
- `tools/data/unit_names_en.json` — hand-made English castle girl names (`prefix` for `[夏]`-style event tags, `name` for the rest), added to the unit JSON as `name_en` by the exporter; after an export with new cards, translate the new names there and run `python tools/names_en.py` to re-apply
- `public/unit-icon/<id>.webp` — 120×120 face icons (~11 MB, published)

Card art is not exported (several GB).

Terrain (平 Plain / 平山 Hill / 山 Mountain / 水 Water / 地獄 Hell) is `Card.GrowUpID` (巨大化種別):
the exe's castle-type target matcher reads that field, and `InstallationCastleTypeLimit.atb`
names the types and lists, per terrain, every type that includes it (`平を含む城` …), so
dual-terrain castles (平/水城) match each of their terrains in the filter.

Trait (`Tokusei`) values have no name table in the game data. Where most of a
trait's carriers share a name prefix (`[夏]`, `[正月]`…), that prefix is used as
its label; the others show as `特性 <id>`.

## Buff ranking

`/buffs` ranks who gives the biggest effect per stat (ATK %, range, damage taken, enemy DEF…),
split by source (特技, 編成特技, 計略, class ability…), with receiver, renovation and rarity
filters. Its data, `public/data/buffs.json`, is built by `npm run buffs` (`scripts/buffs.ts`) from
the same effect describer the castle girl pages use: `describeRow` returns, next to each sentence,
the stat changes it worded (stat, direction, value, cap, stacking, receiver, ally/enemy side).
Rebuild it after re-exporting effects or units. Left out: the card's own stat profile
(`always` rows), potentials, quest-only rows, and anything still shown as raw codes.

## Stages and deliberations

`/stages` lists every stage in the current game data (only live quests are in `Quest.atb`),
with Hell (閻魔 Enma, ヘル Hel, オシリス Osiris), Abyss (深淵) and Bushin (武神) stages grouped.
A stage page shows its enemies with stats × the stage multipliers (攻撃/耐久/防御補正), their
abilities, attacks and damage over time, the spawn order, and the deliberations (審議) as
toggles that are applied to each enemy they target. Built by `tools/export_stages.py`:

- `Quest.MapNo` → `Map%05d.aar`; its `Entry%02d.atb` is the spawn script (Type 2 spawns
  `Enemy.EnemyID` = `ID`, Type 0 waits; frames at 30 per second).
- `Quest.SingiID` → `ArenaSingiSet` (header row with the set ID, then one row per deliberation:
  `Singi` = points, `SingiGroup` = 同時設定不可) → `ArenaSingiSetDetail`.
- Deliberations below ID 20000 are the `MapEffect.atb` rows with the same ID (their texts and
  rows agree, e.g. 1005 「全ての敵に毎秒耐久回復10」 = all enemies, regen +10); 2xxxx (castle girl
  base stats) and 3xxxx (tile limits) have no rows and show their text only.
- Stages are grouped by `Event.atb` (title, dates, quest-ID range; past events too). Hades
  (ハデスの死闘場) is the 深淵 series. Past events' stages are rebuilt from the maps still in the
  client cache: quest ID → map = (id ÷ 1000)·100 + id mod 100, which holds for every live quest
  of every event type except the three Hell arenas (and only for IDs with a 0 hundreds digit,
  like all live ones). Past Bushin keep their deliberation sets (set ID = quest ID on every live
  Bushin). Rebuilt stages have no names, multipliers or Ki (those were only in `Quest.atb`).
- The export never drops a stage: one missing from a later export keeps its file, marked removed.
- `tools/export_stage_images.py` writes each map's background (`MapBg01.atx`) to
  `public/stage-map/<map>.webp`, incrementally, never deleting.
- Which enemies a row hits comes from the exe's target predicates (`EnemyTypeID`/`EnemyTypeID2`
  groups, flying flag; `data/target_codes.json`). % changes that don't stack keep only the
  strongest; the final number assumes % changes multiply the stage-scaled stat, then flat values add.

## Regenerate from the game

The exporter in `tools/` reads the game files from the DMM desktop client's
local cache (`%USERPROFILE%\shiroprore_exe\.cache`, override with
`OSHIRO_CACHE`). Start the game once after an update so the cache is current,
then:

```sh
cd tools
python export_units.py            # --no-icons to skip the icons
```

Needs Python 3.11+, NumPy, Pillow and `lz4`.

### Effects

```sh
python export_effects.py          # public/data/effects.json
python mine_effects.py            # tools/out/effect_mining.md, the full evidence report
npm run sweep                     # (from the site folder) tools/out/sweep.md: every effect row
                                  # still undecoded, ranked, with example cards and their text
npm run coverage                  # tools/out/coverage.md: every number in every description,
                                  # checked against what the page shows (shown / data-only / absent)
```

Links followed (each checked against the whole table):

- `Gimmick.GimmickType` picks the table `EffectID` points into: 1 `EnchantEffect`,
  2 `TokenConfig` (the 伏兵 unit placed; its card's abilities are the effects),
  3 `FieldEffect`, 5 `GimmickSet` (set parent). Type 4 (tile changes) is not decoded.
- `FieldEffect` / `DefeatedFieldEffect`: `FieldEffectType` 3 → `Param1` is an
  `EnchantEffect`; types 1, 5, 7 → `Param1` is a `Missile`.
- `Card.GeneralAbilityID1` and `BeforeAttackAbilityID` → `Ability.atb`;
  `MovingAttackID` → `MovingAttack.atb`. A transformed card's general ability
  holds the effects of the stratagem that transforms into it.
- Transforms come from stratagems (`TransformEnabled*`) and from special
  abilities with `Transform=1`; both use the `DependenceCardId` twin.

Effect codes are named from the game client itself (`shiroprore_exe.exe`,
read with Ghidra; the scripts are kept outside this repo) together with the
game's own name tables and column names. Nothing is named from a numeric
pattern. Where the client gives no name, the row falls back to words mined
from the ability descriptions, and those words are marked `?`.

- **Column names**: every table header carries a Japanese name per column
  (`Ability.GrowUpLimitOnly` = 最大化, `WeaponType.DirectHitBonus` =
  直撃ボーナス). All of them are in `tools/data/column_names.json`.
- **Target codes** (`tools/data/target_codes.json`): the client registers a
  predicate per code (`FUN_0052f830`). Each predicate was followed to the
  field it tests, and the value is named from that field's table:
  - region (`Card.AreaType`) and trait (`Card.Tokusei*`), named from MenuText;
  - weapon type (`WeaponType.atb`) and rarity;
  - `CardCategory` (`CardCategoryName.atb`) and castle type
    (`InstallationCastleTypeLimit`);
  - enemy type (`EnemyTypeID`/`EnemyTypeID2`, named from `EnemyType.atb`) and
    the flying flag;
  - token unit type (`TokenConfig.TokenUnitType`).
- **Status types** (`tools/data/status_types_exe.json`): each StatusType has a
  slot in the unit's status sets. The client either writes a table column into
  that slot, or reads the slot in a formula with a known meaning. Examples:
  - the damage formula (ATK × multipliers gated by the weapon type's
    `DirectHitBonus`, `AntiAirBonus`, `AntiSpecterBonus` and `AntiDemonBonus`);
  - the DEF calculation;
  - HP drain;
  - the special-attack gauge (`SpecialAttack` columns);
  - deploy and giantify Ki costs;
  - "can't be targeted".

  Each name in the file carries its proof.
- **Attack properties** (status 201 bits): set by the weapon loader from
  `WeaponType` columns (1 IgnoreArmor, 16 has missile, 32 AntiAir,
  64 DirectHit, 128 AntiSpecter, 256 AntiDemon).

`StatusModifierType.atb` (each modifier code = stat + increase/decrease/set +
flat/percent) then turns every modifier code into a stat change.

How a modifier row is applied (`FUN_00ae7720`):

- **amount**: the row's `EffectValue` (× the source's percentage), capped at
  its `LimitValue` (上限値).
- **amount by `ValueType`**:
  - 1/7/8: flat;
  - 2: % of one status value;
  - 3: % of another;
  - 4 and 5: % of the difference between the two.
- **result by `ExpressionType`**: 1 adds, 2 subtracts, 3 sets, 4 sets bits,
  5 clears bits.

In battle (`FUN_00549240` / `FUN_00547bc0`), increases and decreases of one stat are combined
as follows:

- **plain % (ValueType 2):** only the strongest increase and the strongest decrease apply, netted
  against each other ("doesn't stack");
- **ValueType 3/4/5:** summed ("stacks", the game's items mark 4/5 as 重複可);
- **flat (1):** summed, except for statuses 105, 106, 108, 111, 113, 203, 210–216, 219, 220, 223,
  10107, 10201, 10206, 10405, 10452 and 10454, which also keep only the strongest.

Formation specialties are applied before battle, one row at a time, to every
unit they target. Each row adds its amount to the stat, and nothing keeps only
the highest of a kind. A 15% buff and a 20% buff to the same stat therefore
both apply. Status sets also merge by adding (a buff adds its value; removing
it subtracts the value again).

Each effect row is shown as a sentence ("Castle girls in range: ATK +20%,
doesn't stack, for 10s"), built only from the row's fields:

- **who**: `AbilityTargetType` + `AbilityAreaType`, named from the phrase in
  front of the stat word (`射程内の城娘` → castle girls, in range).
- **what**: the modifier's stat; sign, unit and number format follow how that
  modifier code's descriptions print it (`短縮` → −, `秒` → s, `1.2倍` → ×1.2).
- **stacking**: from `StatusModifierType.ValueType`. 4 = stacks with same-kind
  effects (its descriptions say `効果重複` / `同種効果と重複`; never `重複なし`),
  2 = the plain % that doesn't (almost never marked as stacking). Flat values
  (1) carry no stacking rule in the data and show none.
- **when**: trigger wording per `AbilityType` (11 = each attack, 12 = each
  time attacked, 13 = each enemy defeated); `EachGrowUp=1` = per
  giantification (489 of 494 clauses worded `巨大化する度に` have it).
- `AbilityType 5/3` = Ki every `DurationInMillis`; `AbilityType 22` = damage
  multiplier against enemies whose stat passes an `AttackBonusStatusEffect`
  threshold; target 51 = the specific castle girl the description names.

Formation specialties (編成特技) use the same target-code registry as unit
abilities.

On-defeat (撃破時) abilities with `AbilityType 21`: `EffectValue` is a
`DefeatedFieldEffect` id (all 89 such rows), whose `Param1` is a `Missile` id
(all 153 field effects). The missile's `StatusModifierType1/2` +
`DurationInMillis1/2` are the effects applied; the field's `Param3` is the
damage as % of ATK (its descriptions print `Param3/100 倍` in 63 of 64 cases).
Who the field hits (`TargetType`, `EffectArea`) and `Param2`, `Param4`–`Param6`
are not decoded.

Transforms and weapon switches:

- A stratagem whose `EnchantEffect` has `TransformEnabled` / `TransformEnabledCT`
  turns the card into its CardType-15 twin (the two point at each other through
  `DependenceCardId`; the twin's own stratagem returns to the base state). The
  base card's page shows a "During stratagem" panel with the twin's weapons and
  class abilities; the twin's page says whose transformed state it is. These
  entries are listed under "Transformed / twin entries".
- `Card.SubClassID` is a second class. A special ability with
  `SwitchSubClass=1` swaps between the main and sub-class weapon; the page
  shows both, each with its class ability.

More rules read from the exe (details in comments in `src/effects.tsx`):

- **Continuation rows.** Ability.atb rows with AbilityID 0 run under the head
  row's AbilityType/TypeDetail.
- **Condition kinds (`FUN_00548d20`).** AbilityTypeDetail is a condition kind
  and AbilityEffectDetail is its parameter. The same kinds drive EnchantEffectSet
  EffectDetailType/Value. Kinds:
  - 2: per enemy in range
  - 5: per 大破 (knockout)
  - 6: per other castle girl
  - 7: per ally
  - 9: at giant stage N
  - 10: per unit with trait N
  - 11/12: block count ≥/≤ N
  - 14: per 大破 in the formation
  - 17/18: per own 伏兵
- **Growth (kind 3).** Only grows when the same status set is re-applied while
  live, and clamps to LimitValue. Rows without a LimitValue never grow.
- **AbilityType 3** = OnTakeDamage effect of type TypeDetail (8 cover, 9 one HP
  per hit, 10 evade, 11 nullify ≤ N).
- **AbilityType 8** = OnGiveDamage.
- **AbilityType 9** = periodic DealDamageEffect (TypeDetail is its id).
- **AbilityType 6 (class abilities).** Per detail:
  - attack method
  - battle motion set
  - movement bits with move speed and move mode (walk / 歩き2 / stand)
  - boat-tile deploy
  - visual effect
  - walk motions
  - stand/attack motion variants
  - 6/7: activate ability
  - 6/8: play voice (named by the one-row ability 戦車搭乗ボイス再生用)
- **Status 225** = attack attribute bits (EnemyWeakAttribute column order).
- **Target codes.**
  - 20xx/21xx: units in 絶望/氷結 (CC state = type − 1)
  - 508–512: trait targets
  - 513: 無属性を含む城
  - EnchantTargetSet uses its own codes, mapped onto these.

Rows named only from their own descriptions (no exe or one-effect item name)
carry `src: "text"` and show the `?` marker. These are:
- statuses 314, 309, 310, 311, 221, 10207, 10452, 10454, 307
- targets 4006, 4008
- op 1
- 5/2
- the 21/2 field re-apply interval

Known gap: summon (伏兵) stratagems' modifier rows don't match their text
(e.g. #8001 reads "Targets +3" where the text says DEF/Range +30).

On the site a row that uses any mined word gets a `?`; hovering shows each
Japanese word, how many matched clauses used it, and examples. Codes without enough
evidence show as raw ids. English for the mined words is in `src/labels.ts`
(`JP_EN`). Each effect line expands to the raw fields it did not use.

How the cache works: each asset is stored decompressed as
`.cache/<sha256(file name)>`, with its MD5 in `.cache/MD5/<sha256>.md5`. The
files are the same AL containers as Millennium War Aigis (ALAR/ALTB/ALTX/ALIG);
`tools/oshirore/parse.py` and `allz.py` are the Aigis Tools parsers.

Main tables: `PlayerUnitTable.aar` (Card, CardName, Class, …),
`PlayerUnitAbilityTable.aar` (specialties and other ability slots),
`Gimmick.atb` / `GimmickSet.atb` / `EnchantEffect*.atb` (stratagems),
`WeaponTable.aar` (weapon types), `Text.aar` (menu labels),
`PlayerUnitFace<n>.aar` (icons).

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static build into dist/
```

The top bar, game switcher, footer and colour tokens come from the shared
`@altterisk/game-hub` package. `npm run hub:local` builds and installs the
sibling `../game-hub` checkout instead of the GitHub version, for testing
shell changes before they are pushed.

## License

AGPL-3.0-or-later. Game data and images belong to their rights holders.
