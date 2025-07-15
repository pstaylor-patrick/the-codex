CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  definition TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  aliases JSONB DEFAULT '[]'::jsonb,
  video_link TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_submissions (
  id SERIAL PRIMARY KEY,
  submission_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  submitter_name VARCHAR(255),
  submitter_email VARCHAR(255),
  timestamp TIMESTAMP NOT NULL DEFAULT now(),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
);