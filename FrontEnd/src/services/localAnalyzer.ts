import {AnalysisResult, SourceType} from '../domain';
import {toISODate} from '../utils/date';

const WEEKDAY_INDEX: Record<string, number> = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};

function dateFromMessage(message: string, now: Date): string {
  const explicit = message.match(/(20\d{2})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})일?/);
  if (explicit) {
    return toISODate(new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3])));
  }

  const shortDate = message.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (shortDate) {
    const candidate = new Date(now.getFullYear(), Number(shortDate[1]) - 1, Number(shortDate[2]));
    if (candidate.getTime() < now.getTime() - 86400000) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    return toISODate(candidate);
  }

  const relative = message.includes('모레') ? 2 : message.includes('내일') ? 1 : message.includes('오늘') ? 0 : null;
  if (relative !== null) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + relative);
    return toISODate(candidate);
  }

  for (const [label, dayIndex] of Object.entries(WEEKDAY_INDEX)) {
    if (message.includes(label) || message.includes(label.slice(0, 1) + '요일')) {
      const candidate = new Date(now);
      let distance = (dayIndex - candidate.getDay() + 7) % 7;
      distance = distance === 0 ? 7 : distance;
      candidate.setDate(candidate.getDate() + distance);
      return toISODate(candidate);
    }
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  return toISODate(fallback);
}

function timeFromMessage(message: string): string | null {
  const colonTime = message.match(/(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})/);
  const koreanTime = message.match(/(?:(오전|오후)\s*)?(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  const match = colonTime ?? koreanTime;
  if (!match) {
    return null;
  }
  let hour = Number(match[2]);
  const minute = Number(match[3] ?? 0);
  if (match[1] === '오후' && hour < 12) {
    hour += 12;
  }
  if (match[1] === '오전' && hour === 12) {
    hour = 0;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function valueAfterLabel(message: string, labels: string[]): string | null {
  const labelPattern = labels.join('|');
  const match = message.match(new RegExp(`(?:${labelPattern})\\s*[:：]?\\s*([^\\n.]+)`));
  return match?.[1]?.trim() ?? null;
}

function titleFromMessage(message: string): string {
  const cleaned = message
    .replace(/(오늘|내일|모레|\d{1,2}월\s*\d{1,2}일|[월화수목금토일]요일)/g, '')
    .replace(/(오전|오후)?\s*\d{1,2}(?::\d{2}|시(?:\s*\d{1,2}분)?)/g, '')
    .replace(/(까지|에|부터)/g, ' ')
    .replace(/준비물\s*[:：].*$/g, '')
    .replace(/장소\s*[:：].*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const firstSentence = cleaned.split(/[.!?\n]/)[0].trim();
  if (!firstSentence) {
    return '새로운 일정';
  }
  return firstSentence.length > 28 ? `${firstSentence.slice(0, 28)}…` : firstSentence;
}

export function analyzeLocally(message: string, sourceType: SourceType = 'DIRECT'): AnalysisResult {
  const materialsText = valueAfterLabel(message, ['준비물', '챙길 것', '가져올 것']);
  const materials = materialsText
    ? materialsText.split(/[,،·]/).map(item => item.trim()).filter(Boolean)
    : [];
  const location = valueAfterLabel(message, ['장소', '위치']);
  const dueTime = timeFromMessage(message);
  const hasDateSignal = /(오늘|내일|모레|\d{1,2}월\s*\d{1,2}일|[월화수목금토일]요일|20\d{2})/.test(message);
  const confidence = Math.min(0.96, 0.52 + (hasDateSignal ? 0.22 : 0) + (dueTime ? 0.12 : 0) + (materials.length ? 0.08 : 0));

  return {
    title: titleFromMessage(message),
    details: '',
    dueDate: dateFromMessage(message, new Date()),
    dueTime,
    location,
    materials,
    sourceType,
    confidence,
    needsReview: confidence < 0.82,
  };
}
