package app.memoa.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import app.memoa.schedule.SourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class RemoteAiAnalyzerTest {
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    private final AnalysisRequest request = new AnalysisRequest(
        "내일 오후 2시 프로젝트 회의\n알림 출처: 팀 대화방", SourceType.ANDROID_NOTIFICATION,
        LocalDate.of(2026, 10, 29)
    );
    private MockRestServiceServer server;
    private RestClient client;

    @BeforeEach
    void setup() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = builder.build();
    }

    private RemoteAiAnalyzer analyzer(String key) {
        return new RemoteAiAnalyzer(client, mapper, "", "", "openai", key, "gpt-5-mini", "", "openai/gpt-oss-120b");
    }

    private RemoteAiAnalyzer groqAnalyzer(String key) {
        return new RemoteAiAnalyzer(client, mapper, "", "", "groq", "unused-openai-key", "gpt-5-mini", key, "openai/gpt-oss-120b");
    }

    private String output(String title) throws Exception {
        return mapper.writeValueAsString(Map.of(
            "title", title, "details", "프로젝트 진행 상황을 함께 논의합니다.",
            "dueDate", "2026-10-30", "dueTime", "14:00", "location", "회의실",
            "preparations", List.of("발표 자료"), "confidence", 0.9, "needsReview", false
        ));
    }

    private String response(String status, String title) throws Exception {
        return mapper.writeValueAsString(Map.of("status", status, "output", List.of(
            Map.of("type", "reasoning", "summary", List.of()),
            Map.of("type", "message", "content", List.of(Map.of("type", "output_text", "text", output(title))))
        )));
    }

    private String groqResponse(String finishReason, String title) throws Exception {
        return mapper.writeValueAsString(Map.of("choices", List.of(Map.of(
            "finish_reason", finishReason,
            "message", Map.of("role", "assistant", "content", output(title), "reasoning", "not part of the schedule")
        ))));
    }

    @Test
    void groqUsesItsOwnKeyAndStrictChatCompletionSchema() throws Exception {
        server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
            .andExpect(header("Authorization", "Bearer test-groq-key"))
            .andExpect(http -> {
                JsonNode body = mapper.readTree(((MockClientHttpRequest) http).getBodyAsString());
                assertThat(body.path("model").asText()).isEqualTo("openai/gpt-oss-120b");
                assertThat(body.at("/messages/0/role").asText()).isEqualTo("system");
                assertThat(body.at("/messages/1/content").asText()).contains("프로젝트 회의", "2026-10-29")
                    .doesNotContain("팀 대화방", "알림 출처");
                assertThat(body.at("/response_format/type").asText()).isEqualTo("json_schema");
                assertThat(body.at("/response_format/json_schema/strict").asBoolean()).isTrue();
                assertThat(body.at("/response_format/json_schema/schema/required").size()).isEqualTo(8);
                assertThat(body.has("store")).isFalse();
                assertThat(body.has("input")).isFalse();
            })
            .andRespond(withSuccess(groqResponse("stop", "[회의] 프로젝트 진행 상황 회의"), MediaType.APPLICATION_JSON));

        AnalysisResponse result = groqAnalyzer("test-groq-key").analyze(request).orElseThrow();
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.GROQ);
        assertThat(result.title()).isEqualTo("[회의] 프로젝트 진행 상황 회의 (회의실)");
        assertThat(result.sourceType()).isEqualTo(SourceType.ANDROID_NOTIFICATION);
        assertThat(result.preparations()).containsExactly("발표 자료");
        server.verify();
    }

    @Test
    void missingGroqKeyDoesNotUseTheExistingOpenAiKey() {
        AnalysisResponse result = new MessageAnalysisService(groqAnalyzer(""), new RuleBasedAnalyzer()).analyze(request);
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.SERVER_RULES);
        server.verify();
    }

    @Test
    void groqRateLimitFallsBackWithoutSwitchingProviders() {
        server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":{\"code\":\"rate_limit_exceeded\"}}"));
        AnalysisResponse result = new MessageAnalysisService(groqAnalyzer("test-groq-key"), new RuleBasedAnalyzer()).analyze(request);
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.SERVER_RULES);
        server.verify();
    }

    @Test
    void groqTruncatedResultIsNotAnAiSuccess() throws Exception {
        server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
            .andRespond(withSuccess(groqResponse("length", "[회의] 프로젝트 회의"), MediaType.APPLICATION_JSON));
        assertThat(groqAnalyzer("test-groq-key").analyze(request)).isEmpty();
        server.verify();
    }

    @Test
    void groqInvalidJsonFallsBackSafely() {
        server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
            .andRespond(withSuccess("""
                {"choices":[{"finish_reason":"stop","message":{"content":"invalid json"}}]}
                """, MediaType.APPLICATION_JSON));
        assertThat(groqAnalyzer("test-groq-key").analyze(request)).isEmpty();
        server.verify();
    }

    @Test
    void groqRefusalIsNotAnAiSuccess() throws Exception {
        server.expect(requestTo("https://api.groq.com/openai/v1/chat/completions"))
            .andRespond(withSuccess(mapper.writeValueAsString(Map.of("choices", List.of(Map.of(
                "finish_reason", "stop", "message", Map.of("content", output("회의"), "refusal", "refused")
            )))), MediaType.APPLICATION_JSON));
        assertThat(groqAnalyzer("test-groq-key").analyze(request)).isEmpty();
        server.verify();
    }

    @Test
    void usesResponsesSchemaAndNeverSendsNotificationSource() throws Exception {
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andExpect(header("Authorization", "Bearer test-key"))
            .andExpect(http -> {
                JsonNode body = mapper.readTree(((MockClientHttpRequest) http).getBodyAsString());
                assertThat(body.path("model").asText()).isEqualTo("gpt-5-mini");
                assertThat(body.path("store").asBoolean()).isFalse();
                assertThat(body.at("/text/format/type").asText()).isEqualTo("json_schema");
                assertThat(body.at("/text/format/strict").asBoolean()).isTrue();
                assertThat(body.path("input").asText()).doesNotContain("팀 대화방", "알림 출처");
                assertThat(body.path("input").asText()).contains("프로젝트 회의", "2026-10-29");
            })
            .andRespond(withSuccess(response("completed", "[회의] 프로젝트 진행 상황 회의"), MediaType.APPLICATION_JSON));

        AnalysisResponse result = analyzer("test-key").analyze(request).orElseThrow();
        assertThat(result.title()).isEqualTo("[회의] 프로젝트 진행 상황 회의 (회의실)");
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.OPENAI);
        assertThat(result.sourceType()).isEqualTo(SourceType.ANDROID_NOTIFICATION);
        assertThat(result.dueTime().toString()).isEqualTo("14:00");
        assertThat(result.preparations()).containsExactly("발표 자료");
        server.verify();
    }

    @Test
    void missingKeyUsesRulesWithoutCallingOpenAi() {
        AnalysisResponse result = new MessageAnalysisService(analyzer(""), new RuleBasedAnalyzer()).analyze(request);
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.SERVER_RULES);
        assertThat(result.title()).isEqualTo("[회의] 프로젝트 회의 참석");
        server.verify();
    }

    @Test
    void rateLimitIsReportedAsBasicAnalysis() {
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":{\"code\":\"insufficient_quota\"}}"));
        AnalysisResponse result = new MessageAnalysisService(analyzer("test-key"), new RuleBasedAnalyzer()).analyze(request);
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.SERVER_RULES);
        server.verify();
    }

    @Test
    void emptyProviderErrorBodyStillFallsBackSafely() {
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andRespond(withStatus(HttpStatus.UNAUTHORIZED));
        assertThat(analyzer("test-key").analyze(request)).isEmpty();
        server.verify();
    }

    @Test
    void incompleteResponseIsNotPresentedAsAiSuccess() throws Exception {
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andRespond(withSuccess(response("incomplete", "[회의] 프로젝트 회의"), MediaType.APPLICATION_JSON));
        assertThat(analyzer("test-key").analyze(request)).isEmpty();
        server.verify();
    }

    @Test
    void refusalIsNotParsedAsSchedule() {
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andRespond(withSuccess("""
                {"status":"completed","output":[{"type":"message","content":[{"type":"refusal","refusal":"refused"}]}]}
                """, MediaType.APPLICATION_JSON));
        assertThat(analyzer("test-key").analyze(request)).isEmpty();
        server.verify();
    }

    @Test
    void rejectsLongCopiedConversationTitle() throws Exception {
        String message = "내일 오후 두 시에는 그동안 준비했던 프로젝트 진행 상황에 대해서 같이 이야기하면 좋겠어요";
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andRespond(withSuccess(response("completed", message), MediaType.APPLICATION_JSON));
        assertThat(analyzer("test-key").analyze(new AnalysisRequest(message, SourceType.DIRECT, request.referenceDate()))).isEmpty();
        server.verify();
    }

    @Test
    void keepsExistingGatewayAvailableWhenExplicitlySelected() throws Exception {
        server.expect(requestTo("https://example.com/analyze"))
            .andRespond(withSuccess(output("[회의] 프로젝트 회의 참석 (팀 대화방, 회의실)"), MediaType.APPLICATION_JSON));
        RemoteAiAnalyzer gateway = new RemoteAiAnalyzer(client, mapper, "https://example.com/analyze", "", "gateway", "", "gpt-5-mini", "", "openai/gpt-oss-120b");
        AnalysisResponse result = gateway.analyze(request).orElseThrow();
        assertThat(result.title()).doesNotContain("팀 대화방");
        assertThat(result.title()).isEqualTo("[회의] 프로젝트 회의 참석 (회의실)");
        assertThat(result.analysisMethod()).isEqualTo(AnalysisMethod.GATEWAY);
        server.verify();
    }
}
