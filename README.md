# Parental Leave Planner (Sweden) — React + Vite + Tailwind

Plan and track Swedish parental leave with a fast, visual calendar. Tag each day for Parent A/B, choose fraction and day type (SBL/MIN/OFF), mark “reserved” days, and see live checks for Swedish rules (double days, 15-month window, post-4 saving cap, SGI weekly check, etc.). Data is stored locally and can be exported/imported as JSON.

> **Note:** This tool helps with planning only. It is **not** legal or financial advice.

---

## ✨ Features

- **Month calendar grid** (Mon–Sun) with weekday/weekend hints
- **Per-day tagging:** Parent A/B fraction (1, 0.75, 0.5, 0.25, 0.125, 0), type (SBL/MIN/OFF), and “reserved”
- **Double days** (both parents same day) auto-sync fractions & types; reserved is disallowed
- **Multi-select & bulk apply**  
  Click = single • **Ctrl/Cmd+Click** = toggle • **Shift+Click** = range • **Select current month**
- **Live summary & warnings** for key Swedish rules (see below)
- **SGI helper:** after age 1, flags ISO weeks with **&lt; 5** covered weekdays
- **LocalStorage persistence** + **JSON import/export**
- **No backend** — instant dev server via Vite

---

## 🇸🇪 Rules modeled

- **480 total days** shared; split as:
  - **390 SBL** (sjukpenningnivå / “full pay”)
  - **90 MIN** (lägstanivå / low pay)
- **90 reserved days per parent** (non-transferable)
- **Double days:** up to **15 months** of age, max **60 per parent** (120 total).  
  Reserved **cannot** be used as double days.
- **Post-4 saving:** after 4th birthday, at most **96 days** may be used/saved (combined)
- **Early MIN guard:** flags MIN usage before **180 SBL** days are cumulatively used
- **SGI weekly check:** after age 1, shows ISO weeks with **&lt; 5** weekdays of leave

> Constraints are shown as counters and warnings; you stay in control of the plan.

---

## 🧰 Tech stack

- **React + Vite**
- **Tailwind CSS** (new CLI)
- **TypeScript**
- **Vitest** (unit tests for the rules)

---

## 🚀 Getting started

### Prerequisites
- **Node.js** 18+ (22 works too)
- npm or pnpm

### Install
```bash
npm install
```

### Dev server
```bash
npm run dev
```

### Build / Preview
```bash
npm run build
npm run preview
```

### Run tests (Vitest)
```bash
npm test
```

---
## 🗂 Project structure
```text
src/
  App.tsx
  domain/
    types.ts       # enums & domain models (Fraction, DayType, DayEntry…)
    rules.ts       # pure rule engine: totals, caps, SGI, 180-SBL guard
  lib/
    date.ts        # date utilities (ISO, week ids, intervals)
    storage.ts     # localStorage load/save
  hooks/
    usePlannerState.ts  # typed reducer + derived metrics + calendar grid
  components/
    Calendar/
      DayCell.tsx
      MonthView.tsx
    Panels/
      SummaryCard.tsx
      SGICard.tsx
      DayEditor.tsx
      BulkEditor.tsx
    Toolbar/
      MonthToolbar.tsx
    Data/
      DataActions.tsx
```
---
## 🧑‍🏫 Usage

* Set DOB and “Jump to DOB month”
* Select days:
  * Click = single
  * Ctrl/Cmd+Click = add/remove
  * Shift+Click = range from anchor
  * “Select current month” grabs all visible month days
* Bulk edit (when > 1 day selected):
  * Mode: Parent A / Parent B / Double day
  * For A/B modes you can auto-convert to double day if within ≤ 15 months and both parents > 0
* Edit single day:
  * Toggle Double day (≤ 15 months only)
  * Choose fraction and type for A/B; reserved not allowed on double days
* Import/Export:
  * Export saves { config, entries } JSON
  * Import expects the same shape
---
## 🧱 Data model
* Fraction: 1 | 0.75 | 0.5 | 0.25 | 0.125 | 0
* DayType: "SBL" | "MIN" | "OFF"
* DayEntry:
{ dateISO, a: { fraction, type, reserved }, b: { … }, doubleDay }

*LocalStorage keys:
  * plp_v1_entries
  * plp_v1_config
---
## ✅ Validation & warnings
* Totals:
  * A_SBL + B_SBL vs 390
  * A_MIN + B_MIN vs 90
  * Reserved A/B vs 90 each
  * Double days A/B vs 60 each
  * Post-4 saved vs 96 (combined)
* MIN before 180 SBL flagged per date
* SGI: ISO weeks after age 1 with < 5 covered weekdays
---
## Disclaimer
This project reflects a best-effort interpretation of Swedish parental leave rules and SGI guidance for planning purposes only. Always confirm details with Försäkringskassan and official sources before making decisions.
