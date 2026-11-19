package com.clinic.clinical;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum NoShowReason {
  PATIENT_ABSENT,
  COULD_NOT_CONTACT,
  TECHNICAL_ISSUE,
  OTHER;

  @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
  public static NoShowReason parse(String reason) {
    return valueOf(reason);
  }
}
