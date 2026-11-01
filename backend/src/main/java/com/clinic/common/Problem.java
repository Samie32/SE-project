package com.clinic.common;

public class Problem extends RuntimeException {
  public final int status;

  public Problem(int status, String message) {
    super(message);
    this.status = status;
  }

  public static Problem notFound() {
    return new Problem(404, "Resource not found");
  }

  public static Problem conflict(String message) {
    return new Problem(409, message);
  }

  public static void require(boolean ok, int status, String message) {
    if (!ok) throw new Problem(status, message);
  }
}
