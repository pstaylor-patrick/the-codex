CREATE TABLE user_submissions (
    id SERIAL PRIMARY KEY,
    submission_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    submitter_name VARCHAR(255),
    submitter_email VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT now(),
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
);