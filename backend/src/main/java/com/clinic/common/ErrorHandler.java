package com.clinic.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ErrorHandler {
  @ExceptionHandler(Problem.class)
  ResponseEntity<ProblemDetail> domain(Problem e) {
    return response(e.status, e.getMessage());
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class,
    ConstraintViolationException.class
  })
  ResponseEntity<ProblemDetail> input(Exception e) {
    return response(400, "Invalid request");
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ProblemDetail> constraint(Exception e) {
    return response(409, "Constraint conflict");
  }

  @ExceptionHandler({CannotAcquireLockException.class, OptimisticLockingFailureException.class})
  ResponseEntity<ProblemDetail> concurrent(Exception e) {
    return response(409, "Concurrent modification; retry request");
  }

  @ExceptionHandler(DataAccessException.class)
  ResponseEntity<ProblemDetail> storage(Exception e) {
    return response(503, "Storage or audit temporarily unavailable");
  }

  private ResponseEntity<ProblemDetail> response(int status, String detail) {
    return ResponseEntity.status(status)
        .body(ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(status), detail));
  }
}
