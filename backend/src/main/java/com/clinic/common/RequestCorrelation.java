package com.clinic.common;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestCorrelation extends OncePerRequestFilter {
  public static final String ATTRIBUTE = RequestCorrelation.class.getName();

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String id = Db.id();
    request.setAttribute(ATTRIBUTE, id);
    response.setHeader("X-Request-Id", id);
    chain.doFilter(request, response);
  }
}
