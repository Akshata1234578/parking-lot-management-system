CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_users (username, password_hash)
VALUES ('admin', '$2b$10$wGQnEQej1OZdLiJPR7XzfOgbZMlc3il78tcKa..6vCUVY2dKYrG66')
ON CONFLICT (username) DO NOTHING;
