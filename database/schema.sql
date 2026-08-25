CREATE TYPE vehicle_type AS ENUM ('BIKE', 'CAR', 'TRUCK');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'OCCUPIED');
CREATE TYPE record_status AS ENUM ('ACTIVE', 'COMPLETED');

CREATE TABLE app_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parking_slots (
  id SERIAL PRIMARY KEY,
  slot_number VARCHAR(10) NOT NULL UNIQUE,
  vehicle_type vehicle_type NOT NULL,
  status slot_status NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parking_records (
  id BIGSERIAL PRIMARY KEY,
  ticket_id VARCHAR(40) NOT NULL UNIQUE,
  vehicle_number VARCHAR(30) NOT NULL,
  vehicle_type vehicle_type NOT NULL,
  slot_id INTEGER NOT NULL REFERENCES parking_slots(id),
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  fare NUMERIC(10, 2),
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX one_active_vehicle ON parking_records (vehicle_number) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX one_active_slot ON parking_records (slot_id) WHERE status = 'ACTIVE';
CREATE INDEX active_records_idx ON parking_records (status, entry_time);
CREATE INDEX ticket_lookup_idx ON parking_records (ticket_id);
