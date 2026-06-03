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

| Column        | Type    | Required | Notes                                                                 |
|---------------|---------|----------|-----------------------------------------------------------------------|
| `id`          | text    | yes      | Stable slug, e.g. `press-banca`. Used as the primary key.             |
| `name`        | text    | yes      | Display name in Spanish, e.g. `Press de Banca`.                       |
| `muscle`      | text    | yes      | One of `pecho`, `espalda`, `piernas`, `hombros`, `brazos`, `core`.    |
| `type`        | text    | yes      | One of `fuerza`, `cardio`, `movilidad`.                               |
| `description` | text    | no       | Short Spanish description. May be empty.                              |
| `built_in`    | boolean | no       | Defaults to `true`. Set `false` only for user-contributed templates.  |

A starter file lives at `exercises.sample.csv` next to this README — copy it,
extend it, then run the importer against your copy.

## Importer behavior (to implement)

The importer script (`import.mjs` or similar, runnable with `node`) should:

1. Read the spreadsheet from a path passed as `--file <path>`.
2. Validate every row against the schema above. Fail fast with a row number on
   any invalid `muscle` / `type` value or missing required field.
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
