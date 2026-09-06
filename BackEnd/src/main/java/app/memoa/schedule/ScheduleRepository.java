package app.memoa.schedule;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ScheduleRepository extends JpaRepository<ScheduleEntity, UUID> {
    List<ScheduleEntity> findAllByOwnerIdOrderByDueDateAscDueTimeAsc(UUID ownerId);
    Optional<ScheduleEntity> findByIdAndOwnerId(UUID id, UUID ownerId);
}
