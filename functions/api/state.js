'use strict';

/* StudySync state API backed by Cloudflare D1. */

function json(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

async function readState(db) {
    const [subjectRows, moduleRows, topicRows] = await Promise.all([
        db.prepare('SELECT id, name FROM subjects ORDER BY position, rowid').all(),
        db.prepare('SELECT id, subject_id, name FROM modules ORDER BY position, rowid').all(),
        db.prepare('SELECT id, module_id, name, completed FROM topics ORDER BY position, rowid').all()
    ]);

    const topicsByModule = new Map();
    for (const topic of topicRows.results || []) {
        if (!topicsByModule.has(topic.module_id)) topicsByModule.set(topic.module_id, []);
        topicsByModule.get(topic.module_id).push({
            id: topic.id,
            name: topic.name,
            completed: Boolean(topic.completed)
        });
    }

    const modulesBySubject = new Map();
    for (const module of moduleRows.results || []) {
        if (!modulesBySubject.has(module.subject_id)) modulesBySubject.set(module.subject_id, []);
        modulesBySubject.get(module.subject_id).push({
            id: module.id,
            name: module.name,
            topics: topicsByModule.get(module.id) || []
        });
    }

    return (subjectRows.results || []).map(subject => ({
        id: subject.id,
        name: subject.name,
        modules: modulesBySubject.get(subject.id) || []
    }));
}

export async function onRequestGet({ env }) {
    try {
        const subjects = await readState(env.DB);
        return json({ subjects, storage: 'Cloudflare D1' });
    } catch (error) {
        return json({ error: error.message || 'Could not load state' }, 500);
    }
}

export async function onRequestPut({ request, env }) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON' }, 400);
    }

    if (!body || !Array.isArray(body.subjects)) {
        return json({ error: 'Expected a subjects array.' }, 400);
    }

    const subjects = body.subjects;
    const statements = [
        env.DB.prepare('DELETE FROM topics'),
        env.DB.prepare('DELETE FROM modules'),
        env.DB.prepare('DELETE FROM subjects')
    ];

    subjects.forEach((subject, si) => {
        statements.push(
            env.DB.prepare('INSERT INTO subjects (id, name, position) VALUES (?, ?, ?)')
                .bind(String(subject.id), String(subject.name), si)
        );

        (subject.modules || []).forEach((module, mi) => {
            statements.push(
                env.DB.prepare('INSERT INTO modules (id, subject_id, name, position) VALUES (?, ?, ?, ?)')
                    .bind(String(module.id), String(subject.id), String(module.name), mi)
            );

            (module.topics || []).forEach((topic, ti) => {
                statements.push(
                    env.DB.prepare('INSERT INTO topics (id, module_id, name, completed, position) VALUES (?, ?, ?, ?, ?)')
                        .bind(String(topic.id), String(module.id), String(topic.name), topic.completed ? 1 : 0, ti)
                );
            });
        });
    });

    try {
        await env.DB.batch(statements);
        return json({ ok: true, subjects: subjects.length, storage: 'Cloudflare D1' });
    } catch (error) {
        return json({ error: error.message || 'Could not save state' }, 500);
    }
}
