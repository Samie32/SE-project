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
        (rs, n) -> {
          Map<String, Object> row = new LinkedHashMap<>();
          var md = rs.getMetaData();
          for (int i = 1; i <= md.getColumnCount(); i++) {
            String[] words = md.getColumnLabel(i).toLowerCase(Locale.ROOT).split("_");
            String key = words[0];
            for (int j = 1; j < words.length; j++)
              key += words[j].substring(0, 1).toUpperCase() + words[j].substring(1);
            Object value = rs.getObject(i);
            if (value instanceof Timestamp t) value = t.toInstant().toString();
            if (value instanceof LocalDateTime t) value = t.toInstant(ZoneOffset.UTC).toString();
            row.put(key, value);
          }
          return row;
        },
        convert(args));
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
