package com.clinic.common;

import com.clinic.appointment.Idempotency;
import com.clinic.auth.Access;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Commands {
  private final Idempotency idem;
  private final com.clinic.audit.Audit audit;

  public Commands(Idempotency idem, com.clinic.audit.Audit audit) {
    this.idem = idem;
    this.audit = audit;
  }

  @Transactional
  public Map<String, Object> run(
      Access.Actor actor,
      String operation,
      String key,
      Object input,
      Supplier<Map<String, Object>> action) {
    String actionName = operation.split(":", 2)[0];
    switch (actionName) {
      case "CHECKIN" -> actor.require("RECEPTIONIST");
      case "PROGRESS", "QUEUE_NEXT", "QUEUE_SKIP" -> actor.require("DOCTOR", "RECEPTIONIST");
      case "RECORD_SAVE",
              "RECORD_AMEND",
              "PRESCRIBE",
              "RX_UPDATE",
              "RX_ISSUE",
              "ROOM_START",
              "ROOM_END" ->
          actor.require("DOCTOR");
      case "ROOM_PREPARE" -> actor.require("DOCTOR", "PATIENT");
      default -> {}
    }
    var previous = idem.begin(actor.id(), operation, key, input);
    if (previous != null) {
      audit.record(actor.id(), "COMMAND_REPLAYED", operation);
      return previous;
    }
    var result = action.get();
    idem.complete(actor.id(), operation, key, result);
    return result;
  }
}
