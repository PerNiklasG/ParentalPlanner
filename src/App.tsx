import MonthToolbar from "./components/Toolbar/MonthToolbar";
import MonthView from "./components/Calendar/MonthView";
import SummaryCard from "./components/Panels/SummaryCard";
import SGICard from "./components/Panels/SGICard";
import DayEditor from "./components/Panels/DayEditor";
import BulkEditor from "./components/Panels/BulkEditor";
import DataActions from "./components/Data/DataActions";
import { usePlannerState } from "./hooks/usePlannerState";
import { addMonths, fromISO, startOfMonth } from "./lib/date";
import { DAY_TYPES, FRACTIONS } from "./domain/types";
import type { DayType, Fraction } from "./domain/types";
import React, { useState } from "react";

export default function App() {
  const { state, dispatch, derived } = usePlannerState();
  const selectedISO = state.selection.size === 1 ? Array.from(state.selection)[0] : null;
  const selectedEntry = selectedISO ? state.entries[selectedISO] ?? null : null;

  function onMouseDownDay(e: React.MouseEvent<HTMLButtonElement>, iso: string) {
    e.preventDefault();
    const isCtrl = e.ctrlKey || e.metaKey || (typeof e.getModifierState === 'function' && (e.getModifierState('Control') || e.getModifierState('Meta')));
    const isShift = e.shiftKey;
    if (isShift && state.anchor) dispatch({ type: 'RANGE_SELECT', iso });
    else if (isCtrl) dispatch({ type: 'TOGGLE_MULTI', iso });
    else dispatch({ type: 'SELECT_SINGLE', iso });
  }

  // bulk values live here as uncontrolled temp values to keep component simple
  const bulkValues = {
    aFraction: 1, aType: 'SBL' as DayType, aReserved: false,
    bFraction: 0, bType: 'OFF' as DayType, bReserved: false,
    doubleFraction: 1, doubleType: 'SBL' as Exclude<DayType,'OFF'>,
    makeDoubleIfAllowed: true,
  };

  const [bulkMode, setBulkMode] = useState<'a'|'b'|'double'>('a');

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left: Calendar */}
        <div className="bg-white rounded-2xl shadow p-4">
          <MonthToolbar
            monthCursor={state.monthCursor}
            childDob={state.config.childDob}
            setPrev={()=>dispatch({ type:'SET_MONTH', date: addMonths(state.monthCursor,-1) })}
            setNext={()=>dispatch({ type:'SET_MONTH', date: addMonths(state.monthCursor,1) })}
            setToday={()=> dispatch({ type:"SET_MONTH", date: startOfMonth(new Date()) })}
            setDob={(v)=>dispatch({ type:'SET_DOB', dob: v })}
            jumpToDob={()=>dispatch({ type:'SET_MONTH', date: startOfMonth(fromISO(state.config.childDob)) })}
          />

          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-center mt-4 text-xs font-medium text-slate-500">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=> <div key={d} className="py-1">{d}</div>)}
          </div>

          {/* Selection helper */}
          {state.selection.size > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <div className="px-2 py-1 rounded bg-indigo-50 border border-indigo-200">Selected: {state.selection.size}</div>
              <button className="px-2 py-1 rounded border" onClick={()=> dispatch({ type:'CLEAR_SELECTION' })}>Clear</button>
              <button className="px-2 py-1 rounded border"
                onClick={() => dispatch({ type: "SELECT_VISIBLE_MONTH" })}>
                Select current month
              </button>
            </div>
          )}

          <MonthView
            days={derived.daysInGrid}
            monthCursor={state.monthCursor}
            childDobISO={state.config.childDob}
            fifteenMonths={derived.fifteenMonths}
            entries={state.entries}
            selectedISO={selectedISO}
            selection={state.selection}
            minBefore180={derived.minBefore180}
            onMouseDownDay={onMouseDownDay}
          />
        </div>

        {/* Right: Summary + Editor */}
        <div className="flex flex-col gap-4">
          <SummaryCard totals={derived.totals} warnings={derived.warnings} />
          <SGICard list={derived.sgiWeeksBelow5} />

          {state.selection.size > 1 && (
            <BulkEditor
              count={state.selection.size}
              mode={bulkMode}
              setMode={setBulkMode}
              values={bulkValues}
              showMakeDouble={bulkMode !== 'double'}
              onApply={()=>{
                if (bulkMode==='double') dispatch({ type:'BULK_APPLY_DOUBLE', fraction: bulkValues.doubleFraction as Fraction, dayType: bulkValues.doubleType });
                else if (bulkMode==='a') dispatch({ type:'BULK_APPLY_A', fraction: bulkValues.aFraction as Fraction, dayType: bulkValues.aType, reserved: bulkValues.aReserved, makeDoubleIfAllowed: bulkValues.makeDoubleIfAllowed });
                else dispatch({ type:'BULK_APPLY_B', fraction: bulkValues.bFraction as Fraction, dayType: bulkValues.bType, reserved: bulkValues.bReserved, makeDoubleIfAllowed: bulkValues.makeDoubleIfAllowed });
              }}
              onClear={()=> dispatch({ type:'CLEAR_SELECTION' })}
            />
          )}

          <DayEditor
            selected={selectedEntry}
            fifteenMonths={derived.fifteenMonths}
            setParentField={(parent, field, value)=> { if (!selectedISO) return; dispatch({ type:'UPDATE_DAY', iso: selectedISO, parent, field: field as any, value }); }}
            toggleDouble={(next)=> { if (!selectedISO) return; dispatch({ type:'TOGGLE_DOUBLE', iso: selectedISO, next }); }}
            clearDay={(iso)=> dispatch({ type:'CLEAR_DAY', iso })}
            close={()=> dispatch({ type:'CLEAR_SELECTION' })}
          />

          <DataActions
            config={state.config}
            entries={state.entries}
            onReplaceAll={(cfg, ent)=> dispatch({ type:'REPLACE_ALL', config: cfg, entries: ent })}
            onReset={()=> dispatch({ type:'RESET' })}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-4 text-xs text-slate-500">
        Tips: Click a day to edit • Ctrl/Cmd+Click multi-select • Shift+Click ranges • Double days auto-sync fractions • Warnings appear as you plan.
      </div>
    </div>
  );
}