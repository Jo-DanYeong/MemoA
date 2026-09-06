package app.memoa.schedule;

import java.util.List;
import java.util.UUID;

import app.memoa.auth.UserAccount;
import app.memoa.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService {
    private final ScheduleRepository schedules;

    public ScheduleService(ScheduleRepository schedules) {
        this.schedules = schedules;
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> list(UserAccount user) {
        return schedules.findAllByOwnerIdOrderByDueDateAscDueTimeAsc(user.getId())
            .stream()
            .map(ScheduleResponse::from)
            .toList();
    }

    @Transactional
    public ScheduleResponse create(UserAccount user, ScheduleRequest request) {
        ScheduleEntity schedule = new ScheduleEntity(user);
        schedule.apply(request);
        return ScheduleResponse.from(schedules.save(schedule));
    }

    @Transactional
    public ScheduleResponse update(UserAccount user, UUID id, ScheduleRequest request) {
        ScheduleEntity schedule = ownedSchedule(user, id);
        schedule.apply(request);
        return ScheduleResponse.from(schedule);
    }

    @Transactional
    public void delete(UserAccount user, UUID id) {
        schedules.delete(ownedSchedule(user, id));
    }

    private ScheduleEntity ownedSchedule(UserAccount user, UUID id) {
        return schedules.findByIdAndOwnerId(id, user.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."));
    }
}
