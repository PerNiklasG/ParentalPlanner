import { CAPS } from "./types";
import type { DayEntry, DayType, Fraction } from "./types";
import { fromISO, isoWeekId, isWeekend } from "../lib/date";

export function computeTotals(entries: DayEntry[], fourYears: Date) {
  let A_SBL=0, A_MIN=0, B_SBL=0, B_MIN=0, resA=0, resB=0, post4=0, doubleA=0, doubleB=0;
  for (const e of entries) {
    if (e.a.type === "SBL") A_SBL += e.a.fraction;
    if (e.a.type === "MIN") A_MIN += e.a.fraction;
    if (e.b.type === "SBL") B_SBL += e.b.fraction;
    if (e.b.type === "MIN") B_MIN += e.b.fraction;
    if (e.a.reserved) resA += e.a.fraction;
    if (e.b.reserved) resB += e.b.fraction;
    if (e.doubleDay && e.a.fraction>0) doubleA++;
    if (e.doubleDay && e.b.fraction>0) doubleB++;
    const d = fromISO(e.dateISO);
    if (d >= fourYears) {
      if (e.a.type !== "OFF") post4 += e.a.fraction;
      if (e.b.type !== "OFF") post4 += e.b.fraction;
    }
  }
  return { A_SBL, A_MIN, B_SBL, B_MIN, resA, resB, post4, doubleA, doubleB };
}

export function findMinBefore180(entries: DayEntry[]) {
  let sbl = 0; const viol = new Set<string>();
  for (const e of entries) {
    if ((e.a.type === "MIN" && e.a.fraction>0 && sbl < 180) || (e.b.type === "MIN" && e.b.fraction>0 && sbl < 180)) viol.add(e.dateISO);
    if (e.a.type === "SBL") sbl += e.a.fraction;
    if (e.b.type === "SBL") sbl += e.b.fraction;
  }
  return viol;
}

export function sgiWeeksBelow5(entries: DayEntry[], afterOneYear: Date) {
  const map: Record<string, number> = {};
  for (const e of entries) {
    const d = fromISO(e.dateISO);
    if (d < afterOneYear || isWeekend(d)) continue;
    const used = (e.a.fraction>0 && e.a.type!=="OFF") || (e.b.fraction>0 && e.b.type!=="OFF");
    if (!used) continue;
    const wk = isoWeekId(d);
    map[wk] = (map[wk] ?? 0) + 1;
  }
  return Object.entries(map).filter(([,n]) => n<5).map(([wk])=>wk);
}

export function validateCaps(t: ReturnType<typeof computeTotals>) {
  const warnings: string[] = [];
  if (t.A_SBL + t.B_SBL > CAPS.TOTAL_SBL) warnings.push("Total SBL exceeds 390.");
  if (t.A_MIN + t.B_MIN > CAPS.TOTAL_MIN) warnings.push("Total MIN exceeds 90.");
  if (t.resA > CAPS.RESERVED_PER_PARENT) warnings.push("Parent A reserved exceeds 90.");
  if (t.resB > CAPS.RESERVED_PER_PARENT) warnings.push("Parent B reserved exceeds 90.");
  if (t.doubleA > CAPS.MAX_DOUBLE_PER_PARENT) warnings.push("Parent A double days exceed 60.");
  if (t.doubleB > CAPS.MAX_DOUBLE_PER_PARENT) warnings.push("Parent B double days exceed 60.");
  if (t.post4 > CAPS.MAX_POST4_SAVED) warnings.push("Saved days after age 4 exceed 96.");
  return warnings;
}

export function makeDoubleDay(
  e: DayEntry,
  fraction: Fraction,
  type: Exclude<DayType, "OFF">
) {
  e.doubleDay = true;
  e.a.fraction = fraction;
  e.b.fraction = fraction;
  e.a.type = type;
  e.b.type = type;
  e.a.reserved = false;
  e.b.reserved = false;
}