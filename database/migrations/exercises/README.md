# Exercises import

This folder is the home of the **exercise catalog importer**. The catalog is no
longer seeded from `database/seed.sql` — it is loaded from a spreadsheet so
non-technical contributors can curate it.

## Status

Planned. No importer script committed yet. This README locks the file format
and expected behavior so the script can be written without further design work.

## Source file format

Either `.csv` or `.xlsx` is acceptable. Column order does not matter, but the
header row **must** use these exact names:

| Column              | Type    | Required | Notes                                                                                          |
|---------------------|---------|----------|------------------------------------------------------------------------------------------------|
| `id`                | text    | yes      | Stable slug, e.g. `press-banca`. Used as the primary key.                                       |
| `name`              | text    | yes      | Display name in Spanish, e.g. `Press de Banca`.                                                 |
| `second_name`       | text    | no       | Alternate / common name (e.g. English) shown next to the primary name.                          |
| `type`              | text    | yes      | One of `fuerza`, `cardio`, `movilidad`.                                                         |
| `equipment`         | text    | no       | One of `barra`, `mancuernas`, `polea`, `maquina`, `peso-corporal`, `banda-elastica`, `kettlebell`, `otros`. |
| `primary_muscles`   | text    | yes      | Pipe-separated list, e.g. `pecho\|hombros`. At least one value. Values from: `pecho`, `espalda`, `piernas`, `hombros`, `brazos`, `core`. |
| `secondary_muscles` | text    | no       | Pipe-separated list, same allowed values as `primary_muscles`.                                  |
| `icon_url`          | text    | no       | Absolute or app-relative URL to the exercise icon shown in the athlete card.                    |
| `description`       | text    | no       | Short Spanish description. May be empty.                                                        |
| `built_in`          | boolean | no       | Defaults to `true`. Set `false` only for user-contributed templates.                            |

A starter file lives at `exercises.sample.csv` next to this README — copy it,
extend it, then run the importer against your copy.

## Importer behavior (to implement)

The importer script (`import.mjs` or similar, runnable with `node`) should:

1. Read the spreadsheet from a path passed as `--file <path>`.
2. Validate every row against the schema above. Fail fast with a row number on
   any invalid `type` / `equipment` value, any muscle outside the allowed set
   in `primary_muscles` / `secondary_muscles`, or a missing required field.
   `primary_muscles` and `secondary_muscles` are split on `|` and trimmed.
3. Upsert into `exercises` using `INSERT ... ON CONFLICT (id) DO UPDATE`, so
   re-running the importer refreshes names/descriptions without dropping rows.
4. Print a summary: rows inserted / updated / skipped.
5. Connect with the same `DATABASE_URL` env var the backend uses.

Keep the script idempotent — it will be re-run every time the catalog changes.

## Why not seed.sql?

`seed.sql` is for **test users only**. The exercise catalog is real product
data that:
- changes far more often than the schema,
- is maintained by trainers who don't write SQL,
- should be the same in dev, staging, and prod.

A spreadsheet-driven importer covers all three.
