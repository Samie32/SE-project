CREATE TABLE clinic_holiday (
  id CHAR(36) PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT TRUE,
  opens_at CHAR(5),
  closes_at CHAR(5),
  CHECK (start_date <= end_date),
  CHECK ((closed = TRUE AND opens_at IS NULL AND closes_at IS NULL)
    OR (closed = FALSE AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))
);

CREATE INDEX idx_clinic_holiday_range ON clinic_holiday (start_date, end_date);
