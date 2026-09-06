package app.memoa.analysis;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import app.memoa.schedule.SourceType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class RemoteAiAnalyzer {
    private final RestClient restClient;
    private final String endpoint;
    private final String apiKey;

    public RemoteAiAnalyzer(
        RestClient.Builder restClientBuilder,
        @Value("${memoa.ai.endpoint:}") String endpoint,
        @Value("${memoa.ai.api-key:}") String apiKey
    ) {
        this.restClient = restClientBuilder.build();
        this.endpoint = endpoint == null ? "" : endpoint.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    public Optional<AnalysisResponse> analyze(AnalysisRequest request) {
        if (endpoint.isBlank()) {
            return Optional.empty();
        }
        try {
            RestClient.RequestBodySpec call = restClient.post()
                .uri(endpoint)
                .header(HttpHeaders.CONTENT_TYPE, "application/json");
            if (!apiKey.isBlank()) {
                call.header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
            }
            AnalysisResponse result = call
                .body(Map.of(
                    "message", request.message(),
                    "sourceType", request.sourceType() == null ? "DIRECT" : request.sourceType().name(),
                    "referenceDate", request.referenceDate() == null ? LocalDate.now().toString() : request.referenceDate().toString(),
                    "language", "ko-KR",
                    "instruction", "메시지 전체의 의미를 해석해 핵심 행동은 title로, 보충 설명은 details로 요약하세요. 날짜는 dueDate, 시간은 HH:mm 형식의 dueTime, 장소는 location으로 추출하세요. 물품, 서류, 사전 작업 등 사용자가 준비해야 할 항목은 preparations 배열로 정리하세요.",
                    "responseSchema", "memoa-analysis-v3"
                ))
                .retrieve()
                .body(AnalysisResponse.class);
            if (
                result == null
                    || result.title() == null
                    || result.title().isBlank()
                    || result.details() == null
                    || result.details().isBlank()
                    || result.dueDate() == null
            ) {
                return Optional.empty();
            }
            double confidence = Math.max(0, Math.min(1, result.confidence()));
            List<String> preparations = result.preparations() == null
                ? List.of()
                : result.preparations().stream()
                    .filter(item -> item != null && !item.isBlank())
                    .map(item -> truncate(item.trim(), 120))
                    .distinct()
                    .limit(20)
                    .toList();
            return Optional.of(new AnalysisResponse(
                truncate(result.title().trim(), 180),
                truncate(result.details().trim(), 1000),
                result.dueDate(),
                result.dueTime(),
                blankToNull(result.location(), 180),
                preparations,
                result.sourceType() == null
                    ? (request.sourceType() == null ? SourceType.DIRECT : request.sourceType())
                    : result.sourceType(),
                confidence,
                result.needsReview() || confidence < 0.82
            ));
        } catch (RestClientException exception) {
            return Optional.empty();
        }
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength - 1) + "…";
    }

    private static String blankToNull(String value, int maxLength) {
        return value == null || value.isBlank() ? null : truncate(value.trim(), maxLength);
    }
}
