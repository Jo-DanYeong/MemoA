package app.memoa.schedule;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import app.memoa.auth.UserAccount;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedules")
public class ScheduleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount owner;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 1000)
    private String details;

    @Column(nullable = false)
    private LocalDate dueDate;

    private LocalTime dueTime;

    @Column(length = 180)
    private String location;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "schedule_materials", joinColumns = @JoinColumn(name = "schedule_id"))
    @Column(name = "material", length = 120)
    private List<String> materials = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SourceType sourceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ScheduleStatus status;

    private double confidence;

    @Column(nullable = false)
    private boolean needsReview;

    private LocalDateTime remindAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected ScheduleEntity() {
    }

    public ScheduleEntity(UserAccount owner) {
        this.owner = owner;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UserAccount getOwner() { return owner; }
    public String getTitle() { return title; }
    public String getDetails() { return details; }
    public LocalDate getDueDate() { return dueDate; }
    public LocalTime getDueTime() { return dueTime; }
    public String getLocation() { return location; }
    public List<String> getMaterials() { return materials; }
    public SourceType getSourceType() { return sourceType; }
    public ScheduleStatus getStatus() { return status; }
    public double getConfidence() { return confidence; }
    public boolean isNeedsReview() { return needsReview; }
    public LocalDateTime getRemindAt() { return remindAt; }
    public Instant getCreatedAt() { return createdAt; }

    public void apply(ScheduleRequest request) {
        this.title = request.title().trim();
        this.details = request.details() == null ? "" : request.details().trim();
        this.dueDate = request.dueDate();
        this.dueTime = request.dueTime();
        this.location = blankToNull(request.location());
        this.materials.clear();
        if (request.materials() != null) {
            request.materials().stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .distinct()
                .limit(20)
                .forEach(this.materials::add);
        }
        this.sourceType = request.sourceType() == null ? SourceType.DIRECT : request.sourceType();
        this.status = request.status() == null ? ScheduleStatus.TODO : request.status();
        this.confidence = Math.max(0, Math.min(1, request.confidence()));
        this.needsReview = request.needsReview();
        this.remindAt = request.remindAt() != null ? request.remindAt() : defaultReminder(request.dueDate(), request.dueTime());
    }

    private static LocalDateTime defaultReminder(LocalDate date, LocalTime time) {
        if (date == null || time == null) {
            return null;
        }
        return LocalDateTime.of(date, time).minusHours(1);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
