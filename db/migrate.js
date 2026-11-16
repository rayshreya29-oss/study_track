'use strict';

const fs = require('node:fs');
const { migrate, replaceState, getState, DB_PATH } = require('./database');

/**
 * Usage:
 *   npm run migrate                     -> create schema, report row counts
 *   npm run migrate -- ./legacy.json    -> also import an exported dataset
 *
 * legacy.json may be either the raw array that was stored in localStorage
 * under "studySyncSubjects", or an object containing that key.
 */
function normalize(input) {
    let raw = input;
    if (!Array.isArray(raw) && raw && typeof raw === 'object') {
        raw = raw.studySyncSubjects || raw.subjects || [];
    }
    if (!Array.isArray(raw)) throw new Error('Expected an array of subjects.');

    return raw.map((subject, si) => ({
        id: String(subject.id ?? `subject-${si}-${Date.now()}`),
        name: String(subject.name ?? 'Untitled subject'),
        modules: (subject.modules || []).map((module, mi) => ({
            id: String(module.id ?? `module-${si}-${mi}-${Date.now()}`),
            name: String(module.name ?? 'Untitled module'),
            topics: (module.topics || []).map((topic, ti) => ({
                id: String(topic.id ?? `topic-${si}-${mi}-${ti}-${Date.now()}`),
                name: String(topic.name ?? 'Untitled topic'),
                completed: Boolean(topic.completed)
            }))
        }))
    }));
}

function main() {
    migrate();
    console.log(`SQLite ready at: ${DB_PATH}`);

    const inputFile = process.argv[2];
    if (inputFile) {
        const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        const subjects = normalize(data);
        const count = replaceState(subjects);
        console.log(`Imported ${count} subject(s) from ${inputFile}`);
    }

    const state = getState();
    const topics = state.reduce(
        (sum, subject) => sum + subject.modules.reduce(
            (n, module) => n + module.topics.length, 0
        ), 0
    );
    console.log(`Current state: ${state.length} subject(s), ${topics} topic(s).`);
}

try {
    main();
} catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
}
