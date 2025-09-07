import { describe, it, expect } from "vitest";
import { computeTotals, findMinBefore180, sgiWeeksBelow5, validateCaps, makeDoubleDay } from "./rules";
import { toISO, eachDayOfInterval } from "../lib/date";
import type { DayEntry } from "./types";

function mkDay(iso: string, a: Partial<DayEntry["a"]>, b: Partial<DayEntry["b"]>, doubleDay = false): DayEntry {
    return {
        dateISO: iso,
        a: { fraction: 0, type: "OFF", reserved: false, ...a },
        b: { fraction: 0, type: "OFF", reserved: false, ...b },
        doubleDay,
    };
}

describe("rules", () => {
    it("computeTotals sums per-parent SBL/MIN, double days, reserved and post-4", () => {
        const fourYears = new Date(2030, 0, 1);
        const entries: DayEntry[] = [
            mkDay("2025-01-01", { fraction: 1, type: "SBL" }, { fraction: 0 }, false),
            mkDay("2025-01-02", { fraction: 0.5, type: "MIN" }, { fraction: 0 }, false),
            mkDay("2030-01-02", { fraction: 0.25, type: "SBL" }, { fraction: 0.25, type: "SBL" }, true),
            mkDay("2030-01-03", { fraction: 1, type: "SBL", reserved: true }, { fraction: 0 }, false),
        ];
        const t = computeTotals(entries, fourYears);
        expect(t.A_SBL).toBeCloseTo(1 + 0.25 + 1, 5);
        expect(t.A_MIN).toBeCloseTo(0.5, 5);
        expect(t.B_SBL).toBeCloseTo(0.25, 5);
        expect(t.B_MIN).toBeCloseTo(0, 5);
        expect(t.doubleA).toBe(1);
        expect(t.doubleB).toBe(1);
        expect(t.resA).toBeCloseTo(1, 5);
        // post4 counts any non-OFF usage on/after fourYears
        expect(t.post4).toBeCloseTo(0.25 + 0.25 + 1, 5);
    });

    it("findMinBefore180 flags MIN before 180 SBL are accumulated", () => {
        // Build 179 days of SBL, then a MIN (should flag), then more SBL (total >180), then MIN (ok)
        const sblDays = Array.from({ length: 179 }, (_, i) => mkDay(`2025-01-${String(i + 1).padStart(2, "0")}`, { fraction: 1, type: "SBL" }, {}));
        const viol = mkDay("2025-07-01", { fraction: 1, type: "MIN" }, {});
        const ok = mkDay("2025-12-31", { fraction: 1, type: "MIN" }, {}); // after enough SBL
        const set = findMinBefore180([...sblDays, viol, mkDay("2025-08-01", { fraction: 1, type: "SBL" }, {}), ok]);
        expect(set.has("2025-07-01")).toBe(true);
        expect(set.has("2025-12-31")).toBe(false);
    });

    it("sgiWeeksBelow5 returns ISO weeks with <5 weekdays used after 1 year", () => {
        const afterOneYear = new Date(2026, 0, 1);
        // Mon..Fri of one week but only 3 days used -> flagged
        const weekStart = new Date(2026, 0, 5); // Mon
        const days = eachDayOfInterval(weekStart, new Date(2026, 0, 11));
        const entries: DayEntry[] = days.map(d => {
            const iso = toISO(d);
            const weekday = d.getDay() !== 0 && d.getDay() !== 6;
            // mark use on Mon, Wed, Fri
            const use = weekday && [1, 3, 5].includes(d.getDay());
            return mkDay(iso, use ? { fraction: 1, type: "SBL" } : {}, {});
        });
        const weeks = sgiWeeksBelow5(entries, afterOneYear);
        expect(weeks.length).toBe(1);
        expect(weeks[0]).toMatch(/^\d{4}-W\d{2}$/);
    });

    it("validateCaps warns when caps exceeded", () => {
        const fourYears = new Date(2030, 0, 1);
        const entries: DayEntry[] = [];

        // 391 SBL → exceeds 390
        for (let i = 0; i < 391; i++) {
            entries.push(mkDay(`2025-01-${String((i % 28) + 1).padStart(2, "0")}`,
                { fraction: 1, type: "SBL" }, {}));
        }

        // 91 MIN → exceeds 90
        for (let i = 0; i < 91; i++) {
            entries.push(mkDay(`2030-02-${String((i % 28) + 1).padStart(2, "0")}`,
                { fraction: 1, type: "MIN" }, {}));
        }

        // 97 post-4 SBL across both parents → exceeds 96
        for (let i = 0; i < 97; i++) {
            entries.push(mkDay(`2031-03-${String((i % 28) + 1).padStart(2, "0")}`,
                { fraction: 0.5, type: "SBL" }, { fraction: 0.5, type: "SBL" }));
        }

        // 61 double days → both A and B exceed 60
        for (let i = 0; i < 61; i++) {
            entries.push(mkDay(`2025-04-${String((i % 28) + 1).padStart(2, "0")}`,
                { fraction: 1, type: "SBL" }, { fraction: 1, type: "SBL" }, true));
        }

        // Reserved A = 91 days (sum of reserved fractions)
        for (let i = 0; i < 91; i++) {
            entries.push(mkDay(`2025-05-${String((i % 28) + 1).padStart(2, "0")}`,
                { fraction: 1, type: "SBL", reserved: true }, {}));
        }

        const t = computeTotals(entries, fourYears);
        const warns = validateCaps(t);

        expect(warns.some(w => w.includes("Total SBL exceeds"))).toBe(true);
        expect(warns.some(w => w.includes("Total MIN exceeds"))).toBe(true);
        expect(warns.some(w => w.includes("after age 4") || w.includes("Post-4"))).toBe(true);
        expect(warns.some(w => w.includes("double days exceed"))).toBe(true);
        expect(warns.some(w => w.includes("reserved exceeds"))).toBe(true);
    });

    it("makeDoubleDay synchronizes parents, clears reserved", () => {
        const e = mkDay("2025-01-01", { fraction: 0.25, type: "SBL", reserved: true }, { fraction: 0, type: "OFF", reserved: true });
        makeDoubleDay(e, 0.5, "SBL");
        expect(e.doubleDay).toBe(true);
        expect(e.a.fraction).toBe(0.5);
        expect(e.b.fraction).toBe(0.5);
        expect(e.a.type).toBe("SBL");
        expect(e.b.type).toBe("SBL");
        expect(e.a.reserved).toBe(false);
        expect(e.b.reserved).toBe(false);
    });
});
