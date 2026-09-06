package app.memoa.schedule;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ScheduleRequest(
    @NotBlank @Size(max = 180) String title,
    @Size(max = 1000) String details,
    @NotNull LocalDate dueDate,
    @JsonFormat(pattern = "HH:mm") LocalTime dueTime,
    @Size(max = 180) String location,
    @Size(max = 20) List<@Size(max = 120) String> preparations,
    SourceType sourceType,
    ScheduleStatus status,
    @DecimalMin("0.0") @DecimalMax("1.0") double confidence,
    boolean needsReview,
    LocalDateTime remindAt
) {
}
