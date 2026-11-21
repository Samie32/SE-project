package com.clinic.common;

import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class Db {
  public final JdbcTemplate jdbc;

  public Db(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public int update(String sql, Object... args) {
    return jdbc.update(sql, convert(args));
  }

  public List<Map<String, Object>> list(String sql, Object... args) {
    return jdbc.query(
        sql,
        rs -> {
          var md = rs.getMetaData();
          int cols = md.getColumnCount();
          String[] keys = new String[cols];
          for (int i = 0; i < cols; i++) {
            keys[i] = toCamel(md.getColumnLabel(i + 1));
          }
          List<Map<String, Object>> rows = new ArrayList<>();
          while (rs.next()) {
            Map<String, Object> row = new LinkedHashMap<>(cols * 2);
            for (int i = 0; i < cols; i++) {
              Object value = rs.getObject(i + 1);
              if (value instanceof Timestamp t) value = t.toInstant().toString();
              else if (value instanceof LocalDateTime t) value = t.toInstant(ZoneOffset.UTC).toString();
              else if (value instanceof java.sql.Date d) value = d.toLocalDate().toString();
              row.put(keys[i], value);
            }
            rows.add(row);
          }
          return rows;
        },
        convert(args));
  }

  private static String toCamel(String label) {
    String lower = label.toLowerCase(Locale.ROOT);
    int under = lower.indexOf('_');
    if (under < 0) return lower;
    StringBuilder out = new StringBuilder(lower.length());
    boolean upperNext = false;
    for (int i = 0; i < lower.length(); i++) {
      char c = lower.charAt(i);
      if (c == '_') {
        upperNext = true;
      } else if (upperNext) {
        out.append(Character.toUpperCase(c));
        upperNext = false;
      } else {
        out.append(c);
      }
    }
    return out.toString();
  }

  public Map<String, Object> one(String sql, Object... args) {
    var rows = list(sql, args);
    if (rows.isEmpty()) throw Problem.notFound();
    return rows.getFirst();
  }

  public long count(String sql, Object... args) {
    return jdbc.queryForObject(sql, Long.class, convert(args));
  }

  public static String id() {
    return UUID.randomUUID().toString();
  }

  private Object[] convert(Object[] args) {
    return Arrays.stream(args).map(x -> x instanceof Instant i ? Timestamp.from(i) : x).toArray();
  }

  public static Instant instant(Map<String, Object> m, String key) {
    return Instant.parse(m.get(key).toString());
  }
}
