package app.memoa.schedule;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;

public record ScheduleResponse(
    UUID id,
    String title,
    String details,
    LocalDate dueDate,
    @JsonFormat(pattern = "HH:mm") LocalTime dueTime,
    String location,
    List<String> preparations,
    SourceType sourceType,
    ScheduleStatus status,
    double confidence,
    boolean needsReview,
    LocalDateTime remindAt,
    Instant createdAt
) {
    static ScheduleResponse from(ScheduleEntity schedule) {
        return new ScheduleResponse(
            schedule.getId(),
            schedule.getTitle(),
            schedule.getDetails(),
            schedule.getDueDate(),
            schedule.getDueTime(),
            schedule.getLocation(),
            List.copyOf(schedule.getPreparations()),
            schedule.getSourceType(),
            schedule.getStatus(),
            schedule.getConfidence(),
            schedule.isNeedsReview(),
            schedule.getRemindAt(),
            schedule.getCreatedAt()
        );
    }
}
