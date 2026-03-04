CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);

INSERT INTO todos (text) VALUES
  ('Configurer le pipeline CI/CD'),
  ('Connecter Grafana à Loki'),
  ('Documenter l''architecture');
