CREATE TABLE clinic_hours (
  day_of_week TINYINT UNSIGNED PRIMARY KEY CHECK (day_of_week BETWEEN 1 AND 7),
  opens_at CHAR(5),
  closes_at CHAR(5),
  CHECK ((opens_at IS NULL AND closes_at IS NULL)
    OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
);

INSERT INTO clinic_hours (day_of_week, opens_at, closes_at) VALUES
  (1, '08:00', '17:00'),
  (2, '08:00', '17:00'),
  (3, '08:00', '17:00'),
  (4, '08:00', '17:00'),
  (5, '08:00', '17:00'),
  (6, '08:00', '17:00'),
  (7, NULL, NULL);
