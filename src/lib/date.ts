export const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const fromISO = (iso: string) => { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d); };

export const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth()+m, d.getDate());
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth()+1, 0);
export const startOfWeekMon = (d: Date) => { const nd = new Date(d); const day = (nd.getDay()+6)%7; nd.setDate(nd.getDate()-day); nd.setHours(0,0,0,0); return nd; };
export const isWeekend = (d: Date) => ((d.getDay()+6)%7) >= 5;

export const isoWeekId = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+date - +yearStart) / 86400000 + 1)/7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const eachDayOfInterval = (start: Date, end: Date) => {
  const out: Date[] = []; const d = new Date(start);
  while (d <= end) { out.push(new Date(d)); d.setDate(d.getDate()+1); }
  return out;
};