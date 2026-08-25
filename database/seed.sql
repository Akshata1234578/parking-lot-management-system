INSERT INTO parking_slots (slot_number, vehicle_type)
SELECT 'B' || number, 'BIKE'::vehicle_type FROM generate_series(1, 5) AS number;
INSERT INTO parking_slots (slot_number, vehicle_type)
SELECT 'C' || number, 'CAR'::vehicle_type FROM generate_series(1, 5) AS number;
INSERT INTO parking_slots (slot_number, vehicle_type)
SELECT 'T' || number, 'TRUCK'::vehicle_type FROM generate_series(1, 2) AS number;

-- Password: change-me-now (replace this seed in production).
INSERT INTO app_users (username, password_hash)
VALUES ('admin', '$2b$10$wGQnEQej1OZdLiJPR7XzfOgbZMlc3il78tcKa..6vCUVY2dKYrG66')
ON CONFLICT (username) DO NOTHING;
