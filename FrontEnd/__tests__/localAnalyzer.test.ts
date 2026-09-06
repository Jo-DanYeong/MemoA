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
});
