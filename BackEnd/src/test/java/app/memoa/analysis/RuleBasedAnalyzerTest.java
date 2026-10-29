package app.memoa.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalTime;

import app.memoa.schedule.SourceType;
import org.junit.jupiter.api.Test;

class RuleBasedAnalyzerTest {
    private final RuleBasedAnalyzer analyzer = new RuleBasedAnalyzer();

    @Test
    void extractsKoreanTimeAndPreparations() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "9월 12일 오후 3시까지 과학 수행평가 보고서 제출. 준비물: 실험 노트, USB",
            SourceType.SHARE,
            LocalDate.of(2026, 9, 4)
        ));

        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 9, 12));
        assertThat(result.dueTime()).isEqualTo(LocalTime.of(15, 0));
        assertThat(result.title()).isEqualTo("[과제] 과학 수행평가 보고서 제출");
        assertThat(result.preparations()).containsExactly("실험 노트", "USB");
        assertThat(result.sourceType()).isEqualTo(SourceType.SHARE);
        assertThat(result.confidence()).isGreaterThan(0.8);
    }

    @Test
    void resolvesRelativeDateFromReferenceDate() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "내일 오전 10시 팀 회의. 장소: 3층 회의실, 준비 사항: 기획안",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 4)
        ));

        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 9, 5));
        assertThat(result.dueTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(result.location()).isEqualTo("3층 회의실");
        assertThat(result.preparations()).containsExactly("기획안");
    }

    @Test
    void extractsLocationAndPreparationsFromNaturalSentence() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "금요일 오후 3시까지 과학 과학실에서 수행평가 보고서를 제출하고 실험 노트와 USB를 챙겨 와.",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 7)
        ));

        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 9, 11));
        assertThat(result.dueTime()).isEqualTo(LocalTime.of(15, 0));
        assertThat(result.location()).isEqualTo("과학실");
        assertThat(result.preparations()).containsExactly("실험 노트", "USB");
        assertThat(result.confidence()).isEqualTo(0.92);
        assertThat(result.needsReview()).isFalse();
    }

    @Test
    void marksPartialRuleBasedResultForReview() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "금요일 오후 3시에 보고서를 제출해.",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 7)
        ));

        assertThat(result.confidence()).isLessThan(0.82);
        assertThat(result.needsReview()).isTrue();
    }

    @Test
    void extractsShorthandLocationAndRequiredItem() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "내일 9시부터 A대학교 입학 상담 노트북 필참",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 7)
        ));

        assertThat(result.title()).isEqualTo("[상담] 입학 상담 참석 (A대학교)");
        assertThat(result.location()).isEqualTo("A대학교");
        assertThat(result.preparations()).containsExactly("노트북");
        assertThat(result.confidence()).isEqualTo(0.92);
    }

    @Test
    void prefersSpecificDestinationAndExtractsItemCarriedThere() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "내일 9시에 A대학교 원서접수 시작 10시에 203호 교무실로 노트북 들고 방문해서 원서 접수하기.",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 7)
        ));

        assertThat(result.location()).isEqualTo("203호 교무실");
        assertThat(result.preparations()).containsExactly("노트북");
        assertThat(result.confidence()).isEqualTo(0.92);
        assertThat(result.needsReview()).isFalse();
    }

    @Test
    void summarizesEventAndExcludesEventContextFromPreparations() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "9월 15일 오후 3시 30분에 A회의실에서 A사 채용설명회 필기도구 지참해서 가기.",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 7)
        ));

        assertThat(result.title()).isEqualTo("[설명회] A사 채용설명회 참석 (A회의실)");
        assertThat(result.location()).isEqualTo("A회의실");
        assertThat(result.preparations()).containsExactly("필기도구");
    }

    @Test
    void summarizesChargingStatusWithoutTreatingDurationAsClockTime() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "71% (1시간 10분 후 충전 완료)",
            SourceType.ANDROID_NOTIFICATION,
            LocalDate.of(2026, 9, 20)
        ));

        assertThat(result.title()).isEqualTo("[충전] 완충까지 1시간 10분");
        assertThat(result.dueTime()).isNull();
    }

    @Test
    void keepsBothEightyPercentAndFullChargeEstimates() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "80%까지 20분, 완충까지 1시간 10분",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 20)
        ));

        assertThat(result.title()).isEqualTo("[충전] 80%까지 20분 · 완충까지 1시간 10분");
        assertThat(result.dueTime()).isNull();
    }

    @Test
    void formatsWorkTitleWithSearchablePrefixAndExplicitContext() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "내일 오후 2시 마케팅 전략 수립 회의. 참석자: 팀 전원, 장소: 회의실",
            SourceType.DIRECT,
            LocalDate.of(2026, 9, 20)
        ));

        assertThat(result.title()).isEqualTo("[회의] 마케팅 전략 수립 회의 참석 (팀 전원, 회의실)");
    }

    @Test
    void excludesNotificationSourceFromTitleAndDetails() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "내일 오후 2시 프로젝트 회의\n알림 출처: 홍길동",
            SourceType.ANDROID_NOTIFICATION,
            LocalDate.of(2026, 9, 20)
        ));

        assertThat(result.title()).isEqualTo("[회의] 프로젝트 회의 참석");
        assertThat(result.details()).doesNotContain("홍길동");
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.SERVER_RULES);
    }

    @Test
    void doesNotCopyUnrecognizedConversationIntoTitle() {
        AnalysisResponse result = analyzer.analyze(new AnalysisRequest(
            "내일 그때 얘기했던 거 잊지 말고 잘 해주면 좋겠어", SourceType.ANDROID_NOTIFICATION,
            LocalDate.of(2026, 10, 29)
        ));
        assertThat(result.title()).isEqualTo("[일정] 일정 내용 확인");
        assertThat(result.needsReview()).isTrue();
    }
}
