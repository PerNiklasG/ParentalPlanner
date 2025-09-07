Parental Leave Planner (Sweden) — React + Vite + Tailwind

Plan and track Swedish parental leave with a fast, visual calendar. Tag each day for Parent A/B, choose fraction and day type (SBL/MIN/OFF), mark “reserved” days, and see live checks for Swedish rules (double days, 15-month window, post-4 saving cap, SGI weekly check, etc.). Data is stored locally and can be exported/imported as JSON.

⚠️ This tool helps with planning only. It is not legal or financial advice.

✨ Features

Month calendar grid (Mon–Sun), weekend/weekday hints

Per-day tagging: Parent A/B fraction (1, 0.75, 0.5, 0.25, 0.125, 0), type (SBL/MIN/OFF), and “reserved”

Double days (both parents same day) auto-sync fractions & types; reserved is disallowed

Multi-select & bulk apply
Click = single • Ctrl/Cmd+Click = toggle • Shift+Click = range • “Select current month”

Live summary & warnings for key Swedish rules (see below)

SGI helper: after age 1, flags ISO weeks with < 5 covered weekdays

LocalStorage persistence + JSON import/export

No backend — instant dev server via Vite

🇸🇪 Rules modeled

480 total days shared; split as:

390 SBL (sjukpenningnivå / “full pay”)

90 MIN (lägstanivå / low pay)

90 reserved days per parent (non-transferable)

Double days: up to 15 months of age, max 60 per parent (120 total).
Reserved cannot be used as double days.

Post-4 saving: after 4th birthday, at most 96 days may be used/saved (combined)

Early MIN guard: flags MIN usage before 180 SBL days are cumulatively used

SGI weekly check: after age 1, shows ISO weeks with < 5 weekdays of leave

Constraints are shown as counters and warnings; you stay in control of the plan.

🧰 Tech stack

React + Vite

Tailwind CSS (CLI)

TypeScript

Vitest (unit tests for the rules)

🚀 Getting started
Prerequisites

Node.js 18+ (22 works too)

npm or pnpm

Install
