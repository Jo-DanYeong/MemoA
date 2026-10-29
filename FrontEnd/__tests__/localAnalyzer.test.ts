import {analyzeLocally} from '../src/services/localAnalyzer';
import {formatTime} from '../src/utils/date';

describe('local message analyzer', () => {
  test('extracts Korean time, location and preparations', () => {
    const result = analyzeLocally(
      '내일 오후 3시까지 과학 수행평가 보고서 제출. 장소: 과학실, 준비 사항: 실험 노트, USB',
      'SHARE',
    );

    expect(result.title).toContain('과학 수행평가 보고서 제출');
    expect(result.dueTime).toBe('15:00');
    expect(result.sourceType).toBe('SHARE');
    expect(result.location).toBe('과학실');
    expect(result.preparations).toEqual(['실험 노트', 'USB']);
  });

  test('displays time with hours and minutes only', () => {
    expect(formatTime('15:30:00')).toBe('15:30');
  });

  test('extracts location and preparations from a natural Korean sentence', () => {
    const result = analyzeLocally(
      '금요일 오후 3시까지 과학 과학실에서 수행평가 보고서를 제출하고 실험 노트와 USB를 챙겨 와.',
      'DIRECT',
    );

    expect(result.location).toBe('과학실');
    expect(result.preparations).toEqual(['실험 노트', 'USB']);
    expect(result.confidence).toBe(0.92);
    expect(result.needsReview).toBe(false);
  });

  test('marks a partial rule-based result for review', () => {
    const result = analyzeLocally('금요일 오후 3시에 보고서를 제출해.', 'DIRECT');

    expect(result.confidence).toBeLessThan(0.82);
    expect(result.needsReview).toBe(true);
  });

  test('extracts shorthand location and required item', () => {
    const result = analyzeLocally('내일 9시부터 A대학교 입학 상담 노트북 필참', 'DIRECT');

    expect(result.title).toBe('[상담] 입학 상담 참석 (A대학교)');
    expect(result.location).toBe('A대학교');
    expect(result.preparations).toEqual(['노트북']);
    expect(result.confidence).toBe(0.92);
  });

  test('prefers a specific destination and extracts an item carried there', () => {
    const result = analyzeLocally(
      '내일 9시에 A대학교 원서접수 시작 10시에 203호 교무실로 노트북 들고 방문해서 원서 접수하기.',
      'DIRECT',
    );

    expect(result.location).toBe('203호 교무실');
    expect(result.preparations).toEqual(['노트북']);
    expect(result.confidence).toBe(0.92);
    expect(result.needsReview).toBe(false);
  });

  test('summarizes an event and excludes event context from preparations', () => {
    const result = analyzeLocally(
      '9월 15일 오후 3시 30분에 A회의실에서 A사 채용설명회 필기도구 지참해서 가기.',
      'DIRECT',
    );

    expect(result.title).toBe('[설명회] A사 채용설명회 참석 (A회의실)');
    expect(result.location).toBe('A회의실');
    expect(result.preparations).toEqual(['필기도구']);
  });

  test('summarizes a charging status without treating duration as a clock time', () => {
    const result = analyzeLocally('71% (1시간 10분 후 충전 완료)', 'ANDROID_NOTIFICATION');

    expect(result.title).toBe('[충전] 완충까지 1시간 10분');
    expect(result.dueTime).toBeNull();
  });

  test('keeps both the 80 percent and full-charge estimates', () => {
    const result = analyzeLocally(
      '80%까지 20분, 완충까지 1시간 10분',
      'DIRECT',
    );

    expect(result.title).toBe('[충전] 80%까지 20분 · 완충까지 1시간 10분');
    expect(result.dueTime).toBeNull();
  });

  test('formats work titles with a searchable prefix and explicit context', () => {
    const result = analyzeLocally(
      '내일 오후 2시 마케팅 전략 수립 회의. 참석자: 팀 전원, 장소: 회의실',
      'DIRECT',
    );

    expect(result.title).toBe('[회의] 마케팅 전략 수립 회의 참석 (팀 전원, 회의실)');
  });

  test('excludes notification source metadata from the title and details', () => {
    const result = analyzeLocally(
      '내일 오후 2시 프로젝트 회의\n알림 출처: 홍길동',
      'ANDROID_NOTIFICATION',
    );

    expect(result.title).toBe('[회의] 프로젝트 회의 참석');
    expect(result.details).not.toContain('홍길동');
    expect(result.analysisMethod).toBe('DEVICE_RULES');
  });

  test('does not copy unrecognized conversation into a schedule title', () => {
    const message = '내일 그때 얘기했던 거 잊지 말고 잘 해주면 좋겠어';
    const result = analyzeLocally(message, 'ANDROID_NOTIFICATION');
    expect(result.title).toBe('[일정] 일정 내용 확인');
    expect(result.title).not.toContain('얘기했던');
    expect(result.needsReview).toBe(true);
  });
});
