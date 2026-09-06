package app.memoa.analysis;

import java.time.LocalDate;

import app.memoa.schedule.SourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnalysisRequest(
    @NotBlank @Size(min = 3, max = 2000) String message,
    SourceType sourceType,
    LocalDate referenceDate
) {
}
