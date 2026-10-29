package app.memoa.analysis;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import app.memoa.schedule.SourceType;
import com.fasterxml.jackson.annotation.JsonFormat;

public record AnalysisResponse(
    String title,
    String details,
    LocalDate dueDate,
    @JsonFormat(pattern = "HH:mm") LocalTime dueTime,
    String location,
    List<String> preparations,
    SourceType sourceType,
    double confidence,
    boolean needsReview,
    AnalysisMethod analysisMethod
) {
}
