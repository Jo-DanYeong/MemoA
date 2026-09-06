package app.memoa.analysis;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

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
                    "responseSchema", "memoa-analysis-v1"
                ))
                .retrieve()
                .body(AnalysisResponse.class);
            if (result == null || result.title() == null || result.title().isBlank() || result.dueDate() == null) {
                return Optional.empty();
            }
            return Optional.of(result);
        } catch (RestClientException exception) {
            return Optional.empty();
        }
    }
}
