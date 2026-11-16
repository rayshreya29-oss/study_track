-- StudySync schema — version 1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS migrations (
    version     INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS modules (
    id          TEXT    PRIMARY KEY,
    subject_id  TEXT    NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
    id          TEXT    PRIMARY KEY,
    module_id   TEXT    NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    completed   INTEGER NOT NULL DEFAULT 0,
    position    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_modules_subject ON modules(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_module   ON topics(module_id);
