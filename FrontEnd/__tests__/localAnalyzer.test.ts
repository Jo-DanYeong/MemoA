import {analyzeLocally} from '../src/services/localAnalyzer';

describe('local message analyzer', () => {
  test('extracts Korean time and materials', () => {
    const result = analyzeLocally(
      '내일 오후 3시까지 과학 수행평가 보고서 제출. 준비물: 실험 노트, USB',
      'SHARE',
    );

    expect(result.title).toContain('과학 수행평가 보고서 제출');
    expect(result.dueTime).toBe('15:00');
    expect(result.materials).toEqual(['실험 노트', 'USB']);
    expect(result.sourceType).toBe('SHARE');
    expect(result.details).toBe('');
  });
});
