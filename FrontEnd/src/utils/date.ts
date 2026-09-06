const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function formatKoreanDate(value: string, includeYear = false): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = includeYear ? `${date.getFullYear()}년 ` : '';
  return `${year}${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

export function formatTime(value?: string | null): string {
  if (!value) {
    return '시간 미정';
  }
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 || 12;
  return `${period} ${displayHour}:${minute}`;
}

export function relativeDay(value: string): string {
  const start = new Date(`${todayISO()}T00:00:00`).getTime();
  const target = new Date(`${value}T00:00:00`).getTime();
  const distance = Math.round((target - start) / 86400000);
  if (distance === 0) {
    return '오늘';
  }
  if (distance === 1) {
    return '내일';
  }
  if (distance > 1 && distance < 7) {
    return `${distance}일 후`;
  }
  return formatKoreanDate(value);
}

export type CalendarCell = {
  key: string;
  date?: string;
  day?: number;
};

export function calendarCells(month: Date): CalendarCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push({key: `empty-${index}`});
  }
  for (let day = 1; day <= lastDate; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({key: toISODate(date), date: toISODate(date), day});
  }
  while (cells.length % 7 !== 0) {
    cells.push({key: `tail-${cells.length}`});
  }
  return cells;
}

export function shiftMonth(month: Date, amount: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1);
}
