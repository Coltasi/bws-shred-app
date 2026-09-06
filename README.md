# BWS Shred

A private PWA for running the Built With Science programme and kettlebell training,
with adaptive TDEE, daily nutrition logging and Tanita body-composition tracking.

Next.js 16 · React 19 · Tailwind 4 · IndexedDB · optional Supabase backup.

---

## Why the storage layer looks like this

The original build kept everything in `localStorage`. Two problems with that:

1. **Safari deletes it.** WebKit's Intelligent Tracking Prevention wipes all
   script-written storage for an origin after 7 days without user interaction.
   Two exemptions apply: the site is installed to the home screen, or
   `navigator.storage.persist()` has been granted.
2. **It caps at ~5 MB and fails silently.** Adding daily calorie logs and body
   scans moves the app toward that ceiling, and a `QuotaExceededError` in a
   write path with no error handling loses data without telling anyone.

So data safety is now three independent layers, surfaced in Settings so it is
obvious which are actually active:

| Layer | Protects against | Where |
|---|---|---|
| Home-screen install + `storage.persist()` | Safari's 7-day wipe | `app/lib/db.ts` |
| IndexedDB (localStorage kept as a mirror) | The 5 MB cap, silent write failure | `app/lib/store.ts` |
| Supabase JSONB snapshot, or JSON export | Losing or wiping the phone | `app/lib/sync.ts` |

`app/lib/store.ts` is a synchronous key/value facade over IndexedDB, hydrated once
at boot. That shape was chosen so the existing components — roughly 2,000 lines
written against `localStorage`'s synchronous API — needed a one-line change each
rather than an async rewrite. Legacy `bws-*` keys are migrated on first launch,
non-destructively: the originals are left in `localStorage` untouched.

## The nutrition engine

`app/lib/nutrition.ts` ports the Built With Science Intermediate spreadsheet.
Verified against the workbook's own worked example (226.8 lb male, 27% BF,
intermediate, cutting → 2,182 kcal / 166 P / 61 F / 244 C).

The load-bearing idea is that **TDEE is measured, not predicted**:

```
TDEE = average daily calories + (weight lost that week × 7716 kcal/kg ÷ days logged)
```

For the first three weeks there isn't enough data, so it falls back to
Katch-McArdle × 1.5. After that it uses arithmetic on real results, smoothed
across the last three weeks so one bad week of water retention doesn't yank the
calorie target around. The UI labels which of the two is in play and why,
because a number presented with false confidence is worse than no number.

Body fat comes from a Tanita scan when one exists, a Navy tape estimate when it
doesn't, and an assumption only as a last resort — and the tab says which.

## Training

Two modalities, tracked separately:

- **Kettlebell** (`app/data/kettlebell.ts`) — the primary. Three sessions
  (re-entry, strength, conditioning) with per-exercise load prescriptions for an
  8/12/16/20/24/30 kg set. This is the modality that produced the Apr–Jul 2026
  results, so it leads the picker.
- **Barbell** (`app/data/workouts.ts`) — the original five-day BWS split.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npx eslint app
```

## Cloud backup (optional)

Without `NEXT_PUBLIC_SUPABASE_*` set, the app runs entirely offline and JSON
export is the backup. To enable sync, copy `.env.example` to `.env.local`, create
a free Supabase project, and run the SQL in the header comment of
`app/lib/sync.ts`. Add the same two variables in Vercel's project settings.

Sync is one row per user holding the whole state as JSONB, last write wins on a
timestamp. There is no schema to migrate and no server code. It never blocks the
UI — the gym has no signal, and that is the normal case rather than the error case.

## Theming

Every colour resolves through CSS custom properties at the top of
`app/globals.css`. Four palettes ship (Tidewater, Coast, Sorbet, Midnight),
switchable in Settings and stored per device. Changing a palette, or adding one,
means editing that one block.
