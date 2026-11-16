'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const DB_PATH = process.env.STUDYSYNC_DB || path.join(ROOT, 'data', 'studysync.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

function getDb() {
    if (db) return db;

    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
    return db;
}

/** Create the schema and record the applied migration version. */
function migrate() {
    const database = getDb();
    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    database.exec(sql);
    database.prepare(
        'INSERT OR IGNORE INTO migrations (version, name) VALUES (?, ?)'
    ).run(1, 'initial schema');
    return DB_PATH;
}

function getState() {
    const database = getDb();

    const subjects = database
        .prepare('SELECT id, name FROM subjects ORDER BY position, rowid')
        .all();
    const modules = database
        .prepare('SELECT id, subject_id, name FROM modules ORDER BY position, rowid')
        .all();
    const topics = database
        .prepare('SELECT id, module_id, name, completed FROM topics ORDER BY position, rowid')
        .all();

    const topicsByModule = new Map();
    for (const topic of topics) {
        if (!topicsByModule.has(topic.module_id)) topicsByModule.set(topic.module_id, []);
        topicsByModule.get(topic.module_id).push({
            id: topic.id,
            name: topic.name,
            completed: Boolean(topic.completed)
        });
    }

    const modulesBySubject = new Map();
    for (const module of modules) {
        if (!modulesBySubject.has(module.subject_id)) modulesBySubject.set(module.subject_id, []);
        modulesBySubject.get(module.subject_id).push({
            id: module.id,
            name: module.name,
            topics: topicsByModule.get(module.id) || []
        });
    }

    return subjects.map(subject => ({
        id: subject.id,
        name: subject.name,
        modules: modulesBySubject.get(subject.id) || []
    }));
}

/** Replace the entire state in a single transaction. */
function replaceState(subjects) {
    const database = getDb();

    const write = database.prepare(`
        INSERT INTO subjects (id, name, position)
        VALUES (?, ?, ?)
    `);
    const writeModule = database.prepare(`
        INSERT INTO modules (id, subject_id, name, position)
        VALUES (?, ?, ?, ?)
    `);
    const writeTopic = database.prepare(`
        INSERT INTO topics (id, module_id, name, completed, position)
        VALUES (?, ?, ?, ?, ?)
    `);

    database.exec('BEGIN');
    try {
        database.exec('DELETE FROM topics; DELETE FROM modules; DELETE FROM subjects;');

        subjects.forEach((subject, si) => {
            write.run(String(subject.id), String(subject.name), si);

            (subject.modules || []).forEach((module, mi) => {
                writeModule.run(
                    String(module.id),
                    String(subject.id),
                    String(module.name),
                    mi
                );

                (module.topics || []).forEach((topic, ti) => {
                    writeTopic.run(
                        String(topic.id),
                        String(module.id),
                        String(topic.name),
                        topic.completed ? 1 : 0,
                        ti
                    );
                });
            });
        });

        database.exec('COMMIT');
    } catch (error) {
        database.exec('ROLLBACK');
        throw error;
    }

    return subjects.length;
}

module.exports = { DB_PATH, getDb, migrate, getState, replaceState };
