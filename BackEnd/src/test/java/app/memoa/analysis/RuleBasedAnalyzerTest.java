package app.memoa.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalTime;

import app.memoa.schedule.SourceType;
import org.junit.jupiter.api.Test;

class RuleBasedAnalyzerTest {
    private final RuleBasedAnalyzer analyzer = new RuleBasedAnalyzer();

    @Test
    void extractsKoreanDateTimeAndMaterials() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "9월 12일 오후 3시까지 과학 수행평가 보고서 제출. 준비물: 실험 노트, USB",
            SourceType.SHARE,
            LocalDate.of(2026, 9, 4)
        ));

        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 9, 12));
        assertThat(result.dueTime()).isEqualTo(LocalTime.of(15, 0));
        assertThat(result.materials()).containsExactly("실험 노트", "USB");
        assertThat(result.sourceType()).isEqualTo(SourceType.SHARE);
        assertThat(result.confidence()).isGreaterThan(0.8);
    }

    @Test
    void resolvesRelativeDateFromReferenceDate() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "내일 오전 10시 팀 회의, 장소: 3층 회의실",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 4)
        ));

        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 9, 5));
        assertThat(result.dueTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(result.location()).isEqualTo("3층 회의실");
    }
}
