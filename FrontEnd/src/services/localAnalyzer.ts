import {AnalysisResult, SourceType} from '../domain';
import {toISODate} from '../utils/date';
import {messageBody} from './messageContent';

const WEEKDAY_INDEX: Record<string, number> = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};

const STRUCTURED_LABELS = '장소|위치|준비\\s*사항|준비물|지참물|챙길 것|가져올 것';
const NATURAL_LOCATION = /(?:^|[\s,])((?:\d+층\s*)?(?:\d+호\s*)?[가-힣A-Za-z0-9]+(?:실|관|역|점|센터|대학교|학교|학원|회사|카페|식당|병원|도서관|체육관|운동장|공원|매장|집))에서(?:\s|$)/;
const DESTINATION_LOCATION = /(?:^|[\s,])((?:\d+층\s*)?(?:\d+호\s*)?[가-힣A-Za-z0-9]+(?:실|관|역|점|센터|대학교|학교|학원|회사|카페|식당|병원|도서관|체육관|운동장|공원|매장|집))(?:으)?로(?=\s|$)/;
const SHORTHAND_LOCATION = /(?:^|\s)([가-힣A-Za-z0-9]+(?:대학교|학교|학원|병원|도서관|센터|카페|역|점|대))(?=\s|$)/;
const PREPARATION_ACTION = /(?:챙겨\s*(?:와|오|오기|주세요)?|가져\s*(?:와|오|오기|주세요)?|들고|지참(?:해서|하여|하세요|하기|해)?|준비(?:해서|하여|하세요|하기|해)?)/;
const REQUIRED_ITEMS = /((?:[가-힣A-Za-z0-9]+(?:와|과|,|·)\s*)*[가-힣A-Za-z0-9]+)(?:은|는|이|가|을|를)?\s*(?:필참|필수(?:임|입니다)?|필요(?:함|합니다|해요)?)/;
const PREPARATION_CONTEXT = /^.*(?:설명회|세미나|회의|상담|면접|행사|수업|강의|모임|시험|평가|접수|방문)\s+/;
const EVENT_ATTENDANCE = /((?:[가-힣A-Za-z0-9]+\s+){0,5}[가-힣A-Za-z0-9]*(?:설명회|세미나|회의|상담|면접|행사|수업|강의|모임))(?:\s*(?:에\s*)?(?:참석(?:하기|해|하세요)?|가(?:기|세요)?|방문(?:하기|해|하세요)?))?/;
const TASK_ACTION = /([가-힣A-Za-z0-9]+(?:\s+[가-힣A-Za-z0-9]+){0,2})\s*(제출|접수|신청|예약|작성|확인|구매|반납|납부|연락|정리|공부)(?:하(?:기|세요|고)?|하기|해)?(?=[.!?\s]|$)/g;
const CHARGE_DURATION = '(?:(?:\\d+\\s*시간\\s*)?(?:\\d+\\s*분))';

function chargingEstimateTitle(message: string): string | null {
  const targetPattern = new RegExp(`(\\d{1,3})\\s*%\\s*(?:충전\\s*)?까지\\s*(${CHARGE_DURATION})`, 'g');
  const fullPattern = new RegExp(`(?:완충|완전\\s*충전)\\s*까지\\s*(${CHARGE_DURATION})`);
  let targetTitle: string | null = null;
  let fullTitle: string | null = null;

  for (const match of message.matchAll(targetPattern)) {
    const percentage = Math.min(100, Number(match[1]));
    const duration = match[2].trim().replace(/\s+/g, ' ');
    if (percentage === 100) {
      fullTitle = `완충까지 ${duration}`;
    } else if (!targetTitle) {
      targetTitle = `${percentage}%까지 ${duration}`;
    }
  }

  const fullMatch = message.match(fullPattern);
  if (fullMatch) {
    fullTitle = `완충까지 ${fullMatch[1].trim().replace(/\s+/g, ' ')}`;
  }

  if (targetTitle || fullTitle) {
    return [targetTitle, fullTitle].filter(Boolean).join(' · ');
  }

  const chargingRemaining = message.match(
    /^(?:충전량\s*)?\d{1,3}\s*%\s*\(\s*((?:\d+\s*시간)?\s*(?:\d+\s*분)?)\s*후\s*(?:충전\s*완료|완충)\s*\)$/,
  );
  return chargingRemaining?.[1]?.trim()
    ? `완충까지 ${chargingRemaining[1].trim().replace(/\s+/g, ' ')}`
    : null;
}

function titleCategory(message: string): string {
  const categories: [RegExp, string][] = [
    [/주간\s*회의/, '주간회의'],
    [/수행평가|과제/, '과제'],
    [/채용\s*설명회|설명회/, '설명회'],
    [/세미나/, '세미나'],
    [/회의/, '회의'],
    [/미팅/, '미팅'],
    [/보고(?!서)/, '보고'],
    [/발표|프레젠테이션/, '발표'],
    [/계약/, '계약'],
    [/협의|조율/, '협의'],
    [/상담|면접/, '상담'],
    [/출장/, '출장'],
    [/여행/, '여행'],
    [/전시|미술관/, '전시'],
    [/공연|뮤지컬|콘서트/, '공연'],
    [/결혼식/, '결혼식'],
    [/생일|생신/, '생일'],
    [/치과|스케일링/, '치과'],
    [/병원|진료|검진/, '병원'],
    [/운동|PT|헬스/, '운동'],
    [/저녁|식사/, '저녁'],
    [/동창/, '동창회'],
    [/마트|장보기/, '마트'],
    [/자동차|엔진오일|정비/, '자동차'],
    [/충전|완충/, '충전'],
    [/기획서|초안|집중\s*업무/, '개인업무'],
    [/제출/, '제출'],
    [/접수/, '접수'],
    [/신청/, '신청'],
    [/예약/, '예약'],
    [/약속|만나/, '약속'],
  ];
  return categories.find(([pattern]) => pattern.test(message))?.[1] ?? '일정';
}

function formatScheduleTitle(message: string, title: string, location: string | null): string {
  const existingPrefix = title.match(/^\[([^\]]+)]\s*/);
  const category = existingPrefix?.[1] ?? titleCategory(message);
  const core = title.replace(/^\[[^\]]+]\s*/, '').replace(/[.!?]+$/, '').trim() || '새로운 일정';
  const contexts: string[] = [];
  const explicitContext = message.match(/(?:참석자|기관)\s*[:：]\s*([^,.;\n]+)/)?.[1]?.trim();
  if (explicitContext) {
    contexts.push(explicitContext);
  }
  if (location && !contexts.includes(location) && !core.includes(location)) {
    contexts.push(location);
  }
  const context = !core.includes('(') && contexts.length ? ` (${contexts.join(', ')})` : '';
  const formatted = `[${category}] ${core}${context}`;
  return formatted.length > 60 ? `${formatted.slice(0, 59)}…` : formatted;
}

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
  const koreanTime = message.match(/(?:(오전|오후)\s*)?(\d{1,2})시(?!간)(?:\s*(\d{1,2})분)?/);
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

function titleFromMessage(message: string, location: string | null, preparations: string[]): string {
  const chargingTitle = chargingEstimateTitle(message);
  if (chargingTitle) {
    return chargingTitle;
  }

  let cleaned = message
    .replace(/(오늘|내일|모레|\d{1,2}월\s*\d{1,2}일|[월화수목금토일]요일)/g, '')
    .replace(/(오전|오후)?\s*\d{1,2}(?::\d{2}|시(?:\s*\d{1,2}분)?)(?:까지|에|부터)?/g, '')
    .replace(/(까지|부터)/g, ' ')
    .replace(/(?:준비\s*사항|준비물|지참물|챙길 것|가져올 것)\s*[:：].*$/g, '')
    .replace(/(?:장소|위치)\s*[:：].*$/g, '')
    .replace(/((?:[가-힣A-Za-z0-9]+(?:와|과|,|·)\s*)*[가-힣A-Za-z0-9]+)(?:은|는|이|가|을|를)?\s*(?:필참|필수(?:임|입니다)?|필요(?:함|합니다|해요)?)/g, '')
    .replace(/(?:[가-힣A-Za-z0-9]+(?:와|과|,|·)\s*)*[가-힣A-Za-z0-9]+(?:은|는|이|가|을|를)?\s*들고/g, '')
    .replace(/\s*하고\s+[^.!?\n]+?(?:을|를)\s*(?:챙겨|가져|지참|준비).*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (location) {
    cleaned = cleaned
      .replace(`${location}에서`, ' ')
      .replace(`${location}으로`, ' ')
      .replace(`${location}로`, ' ')
      .replace(location, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  for (const preparation of preparations) {
    cleaned = cleaned.split(preparation).join(' ');
  }
  cleaned = cleaned
    .replace(new RegExp(PREPARATION_ACTION.source, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const event = cleaned.match(EVENT_ATTENDANCE)?.[1]?.trim();
  if (event) {
    const eventTitle = `${event} 참석`;
    return eventTitle.length > 28 ? `${eventTitle.slice(0, 28)}…` : eventTitle;
  }

  const taskMatches = [...cleaned.matchAll(TASK_ACTION)];
  const task = taskMatches.at(-1);
  if (task) {
    const objectTokens = task[1].trim().split(/\s+/);
    let connectorIndex = -1;
    objectTokens.forEach((token, index) => {
      if (/(?:해서|하고|후|뒤)$/.test(token)) {
        connectorIndex = index;
      }
    });
    const object = objectTokens.slice(connectorIndex + 1).join(' ').replace(/[은는이가을를]$/, '');
    const taskTitle = `${object} ${task[2]}`.replace(/\s+/g, ' ').trim();
    return taskTitle.length > 28 ? `${taskTitle.slice(0, 28)}…` : taskTitle;
  }

  cleaned = cleaned.replace(/(?:방문해서\s*)?(?:가|오)기\s*$/g, '').trim();
  return '일정 내용 확인';
}

function valueAfterLabel(message: string, labels: string[]): string | null {
  const labelPattern = labels.join('|');
  const match = message.match(new RegExp(
    `(?:${labelPattern})\\s*[:：]?\\s*(.+?)(?=\\s*(?:[,;]\\s*)?(?:${STRUCTURED_LABELS})\\s*[:：]|[\\n.]|$)`,
  ));
  return match?.[1]?.trim() ?? null;
}

function locationFromMessage(message: string): string | null {
  return valueAfterLabel(message, ['장소', '위치'])
    ?? message.match(DESTINATION_LOCATION)?.[1]?.trim()
    ?? message.match(NATURAL_LOCATION)?.[1]?.trim()
    ?? message.match(SHORTHAND_LOCATION)?.[1]?.trim()
    ?? null;
}

function splitPreparationItems(value: string): string[] {
  return value
    .replace(/([가-힣A-Za-z0-9]+)(?:와|과)\s+(?=[가-힣A-Za-z0-9])/g, '$1,')
    .replace(/\s+(?:및|그리고)\s+/g, ',')
    .split(/[,،·]/)
    .map(item => item.trim().replace(/[을를]$/, '').trim())
    .filter(Boolean);
}

function preparationsFromMessage(message: string): string[] {
  const labeled = valueAfterLabel(message, [
    '준비\\s*사항',
    '준비물',
    '지참물',
    '챙길 것',
    '가져올 것',
  ]);
  if (labeled) {
    return splitPreparationItems(labeled);
  }

  const requiredItems = message.match(REQUIRED_ITEMS)?.[1];
  if (requiredItems) {
    return splitPreparationItems(requiredItems);
  }

  const action = PREPARATION_ACTION.exec(message);
  if (!action) {
    return [];
  }
  const clauses = message
    .slice(0, action.index)
    .split(/(?:[.!?\n,;]|(?:제출|완료|확인|작성|끝내)하고|그리고)\s*/);
  const candidate = (clauses.at(-1) ?? '')
    .replace(/^.*(?:에서|에|(?:으)?로)\s+/, '')
    .replace(PREPARATION_CONTEXT, '')
    .replace(/^(?:오늘|내일|모레|[월화수목금토일]요일)\s*/, '')
    .trim();
  return splitPreparationItems(candidate);
}

function detailsFromMessage(message: string): string {
  const interpreted = message
    .replace(/\s*(?:준비\s*사항|준비물|지참물|챙길 것|가져올 것)\s*[:：]\s*[^\n.]+/g, '')
    .replace(/\s*(?:장소|위치)\s*[:：]\s*[^\n.]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!interpreted) {
    return '';
  }
  const sentence = /[.!?]$/.test(interpreted) ? interpreted : `${interpreted}.`;
  return sentence.length > 1000 ? `${sentence.slice(0, 999)}…` : sentence;
}

export function analyzeLocally(message: string, sourceType: SourceType = 'DIRECT'): AnalysisResult {
  message = messageBody(message);
  const location = locationFromMessage(message);
  const preparations = preparationsFromMessage(message);
  const dueTime = timeFromMessage(message);
  const hasDateSignal = /(오늘|내일|모레|\d{1,2}월\s*\d{1,2}일|[월화수목금토일]요일|20\d{2})/.test(message);
  const title = titleFromMessage(message, location, preparations);
  const confidence = Number(Math.min(
    title === '일정 내용 확인' ? 0.55 : 0.92,
    0.42 + (hasDateSignal ? 0.18 : 0) + (dueTime ? 0.12 : 0) + (location ? 0.1 : 0) + (preparations.length ? 0.1 : 0),
  ).toFixed(2));

  return {
    analysisMethod: 'DEVICE_RULES',
    title: formatScheduleTitle(message, title, location),
    details: detailsFromMessage(message),
    dueDate: dateFromMessage(message, new Date()),
    dueTime,
    location,
    preparations,
    sourceType,
    confidence,
    needsReview: confidence < 0.82,
  };
}
