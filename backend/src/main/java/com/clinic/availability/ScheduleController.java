package com.clinic.availability;

import com.clinic.auth.Access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ScheduleController {
  private final Access access;
  private final ScheduleService service;
  private final ClinicHours hours;

  public ScheduleController(Access a, ScheduleService s, ClinicHours hours) {
    access = a;
    service = s;
    this.hours = hours;
  }

  public record Availability(
      @NotNull Instant startAt,
      @NotNull Instant endAt,
      @Min(1) @Max(540) int slotMinutes,
      @Pattern(regexp = "IN_PERSON|REMOTE") @NotNull String mode) {}

  public record TimeOff(@NotNull Instant startAt, @NotNull Instant endAt) {}

  @GetMapping("/clinic/hours")
  public ClinicHours.WeeklyHours clinicHours(@AuthenticationPrincipal Jwt j) {
    access.actor(j);
    return hours.read();
  }

  @PutMapping("/clinic/hours")
  public ClinicHours.WeeklyHours updateClinicHours(
      @AuthenticationPrincipal Jwt j, @Valid @RequestBody ClinicHours.WeeklyHours body) {
    return hours.update(access.actor(j), body);
  }

  @GetMapping("/clinic/holidays")
  public List<ClinicHours.Holiday> clinicHolidays(@AuthenticationPrincipal Jwt j) {
    access.actor(j);
    return hours.holidays();
  }

  @PostMapping("/clinic/holidays")
  public ClinicHours.Holiday addClinicHoliday(
      @AuthenticationPrincipal Jwt j, @Valid @RequestBody ClinicHours.HolidayInput body) {
    return hours.addHoliday(access.actor(j), body);
  }

  @DeleteMapping("/clinic/holidays/{id}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void removeClinicHoliday(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    hours.removeHoliday(access.actor(j), id.toString());
  }


  @PostMapping("/doctors/{id}/availability")
  public Object availability(
      @AuthenticationPrincipal Jwt j, @PathVariable UUID id, @Valid @RequestBody Availability b) {
    return service.availability(
        access.actor(j), id.toString(), b.startAt(), b.endAt(), b.slotMinutes(), b.mode());
  }

  @PostMapping("/doctors/{id}/time-off")
  public Object timeOff(
      @AuthenticationPrincipal Jwt j, @PathVariable UUID id, @Valid @RequestBody TimeOff b) {
    return service.timeOff(access.actor(j), id.toString(), b.startAt(), b.endAt());
  }

  @GetMapping("/doctors/{id}/availability")
  public Object availability(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return service.schedules(access.actor(j), id.toString(), false);
  }

  @GetMapping("/doctors/{id}/time-off")
  public Object timeOff(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    return service.schedules(access.actor(j), id.toString(), true);
  }

  @GetMapping("/slots")
  public Object slots(
      @AuthenticationPrincipal Jwt j,
      @RequestParam LocalDate date,
      @RequestParam(required = false) UUID doctorId,
      @RequestParam(required = false) UUID specialtyId,
      @RequestParam(required = false) String mode) {
    access.actor(j);
    return service.slots(
        doctorId == null ? null : doctorId.toString(),
        date,
        mode,
        specialtyId == null ? null : specialtyId.toString());
  }

  @DeleteMapping("/availability/{id}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void removeAvailability(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    service.remove(access.actor(j), id.toString(), false);
  }

  @DeleteMapping("/time-off/{id}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void removeTimeOff(@AuthenticationPrincipal Jwt j, @PathVariable UUID id) {
    service.remove(access.actor(j), id.toString(), true);
  }
}
