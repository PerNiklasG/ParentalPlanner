import { useEffect, useMemo, useReducer } from "react";
import { CAPS, FRACTIONS } from "../domain/types";
import type { Config, DayEntry, DayType, Fraction } from "../domain/types";
import { addMonths, eachDayOfInterval, endOfMonth, fromISO, isWeekend, isoWeekId, startOfMonth, startOfWeekMon, toISO } from "../lib/date";
import { computeTotals, findMinBefore180, makeDoubleDay, sgiWeeksBelow5, validateCaps } from "../domain/rules";
import { loadConfig, loadEntries, saveConfig, saveEntries } from "../lib/storage";

export type State = {
  config: Config;
  monthCursor: Date;
  entries: Record<string, DayEntry>;
  selection: Set<string>;
  anchor: string | null;
};

export type Derived = {
  childDobDate: Date;
  fifteenMonths: Date;
  fourYears: Date;
  afterOneYearDate: Date;
  allEntries: DayEntry[];
  totals: ReturnType<typeof computeTotals>;
  minBefore180: Set<string>;
  sgiWeeksBelow5: string[];
  warnings: string[];
  daysInGrid: { iso: string; date: Date }[];
};

export type Action =
  | { type: "SET_DOB"; dob: string }
  | { type: "SET_MONTH"; date: Date }
  | { type: "SELECT_VISIBLE_MONTH" }
  | { type: "SELECT_SINGLE"; iso: string }
  | { type: "TOGGLE_MULTI"; iso: string }
  | { type: "RANGE_SELECT"; iso: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "UPDATE_DAY"; iso: string; parent: "a"|"b"; field: "fraction"|"type"|"reserved"; value: number|DayType|boolean }
  | { type: "TOGGLE_DOUBLE"; iso: string; next: boolean }
  | { type: "BULK_APPLY_A"; fraction: Fraction; dayType: DayType; reserved: boolean; makeDoubleIfAllowed: boolean }
  | { type: "BULK_APPLY_B"; fraction: Fraction; dayType: DayType; reserved: boolean; makeDoubleIfAllowed: boolean }
  | { type: "BULK_APPLY_DOUBLE"; fraction: Fraction; dayType: Exclude<DayType, "OFF"> }
  | { type: "CLEAR_DAY"; iso: string }
  | { type: "REPLACE_ALL"; config: Config; entries: Record<string, DayEntry> }
  | { type: "RESET" };

function defaultConfig(): Config { return { childDob: "2024-12-20", years: 5 }; }

function getEntry(dict: Record<string, DayEntry>, iso: string): DayEntry {
  return dict[iso] ?? { dateISO: iso, a: { fraction: 0, type: "OFF", reserved: false }, b: { fraction: 0, type: "OFF", reserved: false }, doubleDay: false };
}

function isoRange(aISO: string, bISO: string) {
  const a = fromISO(aISO); const b = fromISO(bISO);
  const start = a <= b ? a : b; const end = a <= b ? b : a;
  return eachDayOfInterval(start, end).map(toISO);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DOB": {
      return { ...state, config: { ...state.config, childDob: action.dob } };
    }
    case "SET_MONTH": {
      return { ...state, monthCursor: action.date };
    }
    case "SELECT_SINGLE": {
      return { ...state, selection: new Set([action.iso]), anchor: action.iso };
    }
    case "TOGGLE_MULTI": {
      const next = new Set(state.selection);
      if (next.has(action.iso)) next.delete(action.iso); else next.add(action.iso);
      return { ...state, selection: next, anchor: action.iso };
    }
    case "RANGE_SELECT": {
      if (!state.anchor) return state;
      const range = isoRange(state.anchor, action.iso);
      return { ...state, selection: new Set([...state.selection, ...range]) };
      }
      case "CLEAR_SELECTION": {
          return { ...state, selection: new Set(), anchor: null };
      }
      case "SELECT_VISIBLE_MONTH": {
          const start = startOfMonth(state.monthCursor);
          const end = endOfMonth(state.monthCursor);
          const isos = eachDayOfInterval(start, end).map(toISO);
          return { ...state, selection: new Set(isos), anchor: null };
      }
      case "UPDATE_DAY": {
          const { iso, parent, field, value } = action;
          const next = { ...state.entries };
      const e = { ...getEntry(next, iso), a: { ...getEntry(next, iso).a }, b: { ...getEntry(next, iso).b } };
      if (field === "reserved" && value === true && e.doubleDay) return state; // ignore invalid
      (e[parent] as any)[field] = value;
      if (!e.doubleDay) {
        if (e.a.fraction>0 && e.b.fraction>0) {
          const other = parent === 'a' ? 'b' : 'a';
          (e as any)[other].fraction = 0; (e as any)[other].type = "OFF"; (e as any)[other].reserved = false;
        }
      } else {
        const target = (e[parent] as any).fraction;
        e.a.fraction = target; e.b.fraction = target;
        if (e.a.type === 'OFF') e.a.type = 'SBL';
        if (e.b.type === 'OFF') e.b.type = 'SBL';
      }
      next[iso] = e; return { ...state, entries: next };
    }
    case "TOGGLE_DOUBLE": {
      const { iso, next: want } = action;
      const next = { ...state.entries };
      const e = { ...getEntry(next, iso), a: { ...getEntry(next, iso).a }, b: { ...getEntry(next, iso).b } };
      const dob = fromISO(state.config.childDob);
      const limit = addMonths(dob, 15);
      const d = fromISO(iso);
      if (want && d > limit) return state; // invalid; ignore
      e.doubleDay = want;
      if (want) {
        const f = Math.max(e.a.fraction, e.b.fraction, 0.25) as Fraction;
        e.a.fraction = f; e.b.fraction = f;
        if (e.a.type === 'OFF') e.a.type = 'SBL';
        if (e.b.type === 'OFF') e.b.type = 'SBL';
        e.a.reserved = false; e.b.reserved = false;
      }
      next[iso] = e; return { ...state, entries: next };
    }
    case "BULK_APPLY_A":
    case "BULK_APPLY_B":
    case "BULK_APPLY_DOUBLE": {
      const next = { ...state.entries };
      const targets = Array.from(state.selection);
      const dob = fromISO(state.config.childDob);
      const limit = addMonths(dob, 15);
      for (const iso of targets) {
        const d = fromISO(iso);
        const e0 = getEntry(next, iso);
        const e: DayEntry = { ...e0, a: { ...e0.a }, b: { ...e0.b } };
        if (action.type === "BULK_APPLY_DOUBLE") {
            if (d <= limit) {
                makeDoubleDay(e, action.fraction, action.dayType);
            } else {
                e.doubleDay = false;
                e.a.fraction = action.fraction;
                e.a.type = action.dayType;
                e.a.reserved = false;
                e.b.fraction = 0;
                e.b.type = "OFF";
                e.b.reserved = false;
            }
        } else if (action.type === "BULK_APPLY_A") {
          e.doubleDay = false;
          e.a.fraction = action.fraction; e.a.type = action.dayType; e.a.reserved = action.reserved;
          if (action.makeDoubleIfAllowed && e.b.fraction>0 && d <= limit) {
            const f = Math.max(e.a.fraction, e.b.fraction) as Fraction;
            makeDoubleDay(e, f, (e.a.type === "OFF" ? "SBL" : e.a.type) as Exclude<DayType,"OFF">);
          } else if (e.b.fraction>0) {
            e.b.fraction = 0; e.b.type = 'OFF'; e.b.reserved = false;
          }
        } else if (action.type === "BULK_APPLY_B") {
          e.doubleDay = false;
          e.b.fraction = action.fraction; e.b.type = action.dayType; e.b.reserved = action.reserved;
          if (action.makeDoubleIfAllowed && e.a.fraction>0 && d <= limit) {
            const f = Math.max(e.a.fraction, e.b.fraction) as Fraction;
            makeDoubleDay(e, f, (e.a.type === "OFF" ? "SBL" : e.a.type) as Exclude<DayType, "OFF">);
          } else if (e.a.fraction>0) {
            e.a.fraction = 0; e.a.type = 'OFF'; e.a.reserved = false;
          }
        }
        next[iso] = e;
      }
      return { ...state, entries: next };
    }
    case "CLEAR_DAY": {
      const next = { ...state.entries }; delete next[action.iso]; return { ...state, entries: next };
    }
    case "REPLACE_ALL": {
      return { ...state, config: action.config, entries: action.entries };
    }
    case "RESET": {
      return { config: defaultConfig(), monthCursor: startOfMonth(new Date()), entries: {}, selection: new Set(), anchor: null };
    }
    default: return state;
  }
}

export function usePlannerState() {
  const [state, dispatch] = useReducer(reducer, null as any, () => ({
    config: loadConfig() ?? defaultConfig(),
    monthCursor: startOfMonth(new Date()),
    entries: loadEntries(),
    selection: new Set<string>(),
    anchor: null,
  }));

  // persist
  useEffect(() => saveConfig(state.config), [state.config]);
  useEffect(() => saveEntries(state.entries), [state.entries]);

  const childDobDate = useMemo(() => fromISO(state.config.childDob), [state.config.childDob]);
  const fifteenMonths = useMemo(() => addMonths(childDobDate, 15), [childDobDate]);
  const fourYears = useMemo(() => addMonths(childDobDate, 48), [childDobDate]);
  const afterOneYearDate = useMemo(() => addMonths(childDobDate, 12), [childDobDate]);

  const allEntries = useMemo(() => Object.values(state.entries).sort((a,b)=> a.dateISO.localeCompare(b.dateISO)), [state.entries]);
  const totals = useMemo(() => computeTotals(allEntries, fourYears), [allEntries, fourYears]);
  const minBefore180 = useMemo(() => findMinBefore180(allEntries), [allEntries]);
  const sgiList = useMemo(() => sgiWeeksBelow5(allEntries, afterOneYearDate), [allEntries, afterOneYearDate]);
  const warnings = useMemo(() => validateCaps(totals).concat(
    sgiList.length>0 ? [`SGI risk: weeks with <5 weekdays covered: ${sgiList.join(', ')}`] : []
  ), [totals, sgiList]);

  // month grid
  const monthStart = startOfMonth(state.monthCursor);
  const monthEnd = endOfMonth(state.monthCursor);
  const gridStart = startOfWeekMon(monthStart);
  const gridEnd = startOfWeekMon(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate()+7));
  const daysInGrid = eachDayOfInterval(gridStart, new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate()-1))
    .map(date => ({ date, iso: toISO(date) }));

  const derived: Derived = {
    childDobDate, fifteenMonths, fourYears, afterOneYearDate,
    allEntries, totals, minBefore180, sgiWeeksBelow5: sgiList, warnings, daysInGrid
  };

  return { state, dispatch, derived };
}