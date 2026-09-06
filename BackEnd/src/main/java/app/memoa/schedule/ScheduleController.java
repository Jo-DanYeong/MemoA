package app.memoa.schedule;

import java.util.List;
import java.util.UUID;

import app.memoa.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/schedules")
public class ScheduleController {
    private final ScheduleService scheduleService;
    private final AuthService authService;

    public ScheduleController(ScheduleService scheduleService, AuthService authService) {
        this.scheduleService = scheduleService;
        this.authService = authService;
    }

    @GetMapping
    public List<ScheduleResponse> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return scheduleService.list(authService.requireUser(authorization));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleResponse create(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @Valid @RequestBody ScheduleRequest request
    ) {
        return scheduleService.create(authService.requireUser(authorization), request);
    }

    @PutMapping("/{id}")
    public ScheduleResponse update(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @PathVariable UUID id,
        @Valid @RequestBody ScheduleRequest request
    ) {
        return scheduleService.update(authService.requireUser(authorization), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @PathVariable UUID id
    ) {
        scheduleService.delete(authService.requireUser(authorization), id);
    }
}
