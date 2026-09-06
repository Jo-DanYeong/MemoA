package app.memoa.analysis;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import app.memoa.schedule.SourceType;

public record AnalysisResponse(
    String title,
    String details,
    LocalDate dueDate,
    LocalTime dueTime,
    String location,
    List<String> materials,
    SourceType sourceType,
    double confidence,
    boolean needsReview
) {
}
