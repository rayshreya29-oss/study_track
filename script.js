'use strict';

/* =========================================================
   StudySync — state, persistence & rendering
   ========================================================= */
const LEGACY_KEY = 'studySyncSubjects';
const THEME_KEY = 'studySyncTheme';

const $ = id => document.getElementById(id);

let subjects = [];
let useDatabase = false;
let saveTimer = null;
let toastTimer = null;

/* ---------- Storage ---------- */

async function apiGetState() {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error('Could not load state');
    return response.json();
}

async function apiPutState(state) {
    const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects: state })
    });
    if (!response.ok) throw new Error('Could not save state');
    return response.json();
}

function readLegacy() {
    try {
        const value = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3600);
}

async function loadData() {
    try {
        const data = await apiGetState();
        subjects = Array.isArray(data.subjects) ? data.subjects : [];
        useDatabase = true;

        // One-time migration: move any old localStorage data into SQLite.
        const legacy = readLegacy();
        if (subjects.length === 0 && legacy.length > 0) {
            await apiPutState(legacy);
            subjects = legacy;
            localStorage.removeItem(LEGACY_KEY);
            toast('Migrated your saved subjects into the local SQLite database.');
        }
        $('storageStatus').textContent = 'SQLite database connected';
    } catch {
        subjects = readLegacy();
        // Static deployments (e.g. Cloudflare Pages) have no local API —
        // fall back to the bundled sample curriculum on first visit.
        if (subjects.length === 0 && Array.isArray(window.STUDYSYNC_SEED)) {
            subjects = window.STUDYSYNC_SEED;
            localStorage.setItem(LEGACY_KEY, JSON.stringify(subjects));
            toast('Loaded the sample Computer Science curriculum.');
        }
        useDatabase = false;
        const status = $('storageStatus');
        status.textContent = 'Offline — using this browser';
        status.style.color = 'var(--accent)';
    }
}

function saveData() {
    if (!useDatabase) {
        localStorage.setItem(LEGACY_KEY, JSON.stringify(subjects));
        return;
    }

    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            await apiPutState(subjects);
        } catch {
            useDatabase = false;
            localStorage.setItem(LEGACY_KEY, JSON.stringify(subjects));
            $('storageStatus').textContent = 'Offline — using this browser';
            toast('Database unavailable — changes saved in this browser.');
        }
    }, 150);
}

/* ---------- Helpers ---------- */

function calculateProgress(topics) {
    if (!topics.length) return 0;
    const completed = topics.filter(topic => topic.completed).length;
    return Math.round((completed / topics.length) * 100);
}

function newId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createButton(text, className, action, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.className = className;
    button.onclick = action;
    if (label) button.setAttribute('aria-label', label);
    return button;
}

/* ---------- Dashboard ---------- */

function updateDashboard() {
    let totalTopics = 0;
    let completed = 0;

    subjects.forEach(subject => {
        subject.modules.forEach(module => {
            totalTopics += module.topics.length;
            completed += module.topics.filter(topic => topic.completed).length;
        });
    });

    const percentage = totalTopics === 0 ? 0 : Math.round((completed / totalTopics) * 100);

    $('totalSubjects').textContent = subjects.length;
    $('totalTopics').textContent = totalTopics;
    $('completedTopics').textContent = completed;
    $('overallProgress').textContent = `${percentage}%`;
    $('reportProgress').textContent = `${percentage}%`;
    $('reportBar').style.width = `${percentage}%`;
    $('reportProgressbar').setAttribute('aria-valuenow', String(percentage));

    $('subjectCount').textContent =
        `${subjects.length} subject${subjects.length === 1 ? '' : 's'}`;

    $('emptyState').hidden = subjects.length > 0;
    $('subjectList').hidden = subjects.length === 0;

    const badges = [
        [85, 'Excellent momentum'],
        [60, 'Steady progress'],
        [30, 'Building momentum'],
        [0, 'Just getting started']
    ];
    $('reportBadge').textContent = badges.find(([min]) => percentage >= min)[1];
}

/* ---------- Rendering ---------- */

function renderSubjects() {
    const subjectList = $('subjectList');
    subjectList.innerHTML = '';

    subjects.forEach((subject, subjectIndex) => {
        const card = document.createElement('article');
        card.className = 'card subject-card';

        /* Subject header */
        const head = document.createElement('div');
        head.className = 'subject-card-head';

        const title = document.createElement('h3');
        title.textContent = subject.name;

        const icon = document.createElement('span');
        icon.className = 'subject-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '▤';

        head.append(title, icon);

        /* Subject progress */
        const allTopics = subject.modules.flatMap(module => module.topics);
        const progress = calculateProgress(allTopics);

        const progressBox = document.createElement('div');
        progressBox.className = 'subject-progress';

        const progressText = document.createElement('p');
        const progressLabel = document.createElement('span');
        progressLabel.textContent = 'Subject progress';
        const progressValue = document.createElement('span');
        progressValue.textContent = `${progress}%`;
        progressText.append(progressLabel, progressValue);

        const progressBg = document.createElement('div');
        progressBg.className = 'progress-bg';
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = `${progress}%`;
        progressBg.appendChild(progressFill);

        progressBox.append(progressText, progressBg);

        /* Subject actions */
        const subjectActions = document.createElement('div');
        subjectActions.className = 'action-buttons';
        subjectActions.append(
            createButton('✎ Edit', 'btn btn-ghost btn-edit', () => {
                const name = prompt('Edit subject name:', subject.name);
                if (!name || !name.trim()) return;
                subject.name = name.trim();
                saveData();
                renderSubjects();
            }, `Edit ${subject.name}`),
            createButton('Delete', 'btn btn-ghost btn-danger', () => {
                if (confirm(`Delete "${subject.name}" and all its modules?`)) {
                    subjects.splice(subjectIndex, 1);
                    saveData();
                    renderSubjects();
                }
            }, `Delete ${subject.name}`)
        );

        const addModuleBtn = createButton('＋ Add module', 'btn btn-ghost', () => {
            const name = prompt('Enter module name:');
            if (!name || !name.trim()) return;
            subject.modules.push({ id: newId(), name: name.trim(), topics: [] });
            saveData();
            renderSubjects();
        });

        card.append(head, progressBox, subjectActions, addModuleBtn);

        /* Modules */
        subject.modules.forEach((module, moduleIndex) => {
            const moduleDiv = document.createElement('div');
            moduleDiv.className = 'module';

            const moduleTitle = document.createElement('h4');
            moduleTitle.textContent = `◈ ${module.name}`;

            const moduleActions = document.createElement('div');
            moduleActions.className = 'action-buttons';
            moduleActions.append(
                createButton('✎', 'btn btn-ghost btn-edit', () => {
                    const name = prompt('Edit module name:', module.name);
                    if (!name || !name.trim()) return;
                    module.name = name.trim();
                    saveData();
                    renderSubjects();
                }, `Edit ${module.name}`),
                createButton('Delete', 'btn btn-ghost btn-danger', () => {
                    if (confirm(`Delete "${module.name}" and its topics?`)) {
                        subject.modules.splice(moduleIndex, 1);
                        saveData();
                        renderSubjects();
                    }
                }, `Delete ${module.name}`)
            );

            const addTopicBtn = createButton('＋ Add topic', 'btn btn-ghost', () => {
                const name = prompt('Enter topic name:');
                if (!name || !name.trim()) return;
                module.topics.push({ id: newId(), name: name.trim(), completed: false });
                saveData();
                renderSubjects();
            });

            moduleDiv.append(moduleTitle, moduleActions, addTopicBtn);

            /* Topics */
            module.topics.forEach((topic, topicIndex) => {
                const topicDiv = document.createElement('div');
                topicDiv.className = `topic${topic.completed ? ' is-done' : ''}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = topic.completed;
                checkbox.setAttribute('aria-label', `Mark ${topic.name} complete`);
                checkbox.onchange = () => {
                    topic.completed = checkbox.checked;
                    saveData();
                    renderSubjects();
                };

                const topicName = document.createElement('span');
                topicName.className = 'topic-name';
                topicName.textContent = topic.name;

                const editTopic = createButton('✎', 'btn btn-ghost btn-edit', () => {
                    const name = prompt('Edit topic:', topic.name);
                    if (!name || !name.trim()) return;
                    topic.name = name.trim();
                    saveData();
                    renderSubjects();
                }, `Edit ${topic.name}`);

                const deleteTopic = createButton('✕', 'btn btn-ghost btn-danger', () => {
                    if (confirm(`Delete "${topic.name}"?`)) {
                        module.topics.splice(topicIndex, 1);
                        saveData();
                        renderSubjects();
                    }
                }, `Delete ${topic.name}`);

                topicDiv.append(checkbox, topicName, editTopic, deleteTopic);
                moduleDiv.appendChild(topicDiv);
            });

            card.appendChild(moduleDiv);
        });

        subjectList.appendChild(card);
    });

    updateDashboard();
}

/* ---------- Actions & UI ---------- */

function addSubject() {
    const name = prompt('Enter subject name:');
    if (!name || !name.trim()) return;
    subjects.push({ id: newId(), name: name.trim(), modules: [] });
    saveData();
    renderSubjects();
}

function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
    const label = document.querySelector('.theme-label');
    if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            links.forEach(item => {
                item.classList.remove('active');
                item.removeAttribute('aria-current');
            });
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        });
    });
}

async function init() {
    applyTheme(localStorage.getItem(THEME_KEY) || 'light');

    $('addSubjectBtn').addEventListener('click', addSubject);
    $('emptyAddBtn').addEventListener('click', addSubject);
    $('themeBtn').addEventListener('click', () => {
        applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    });
    setupNavigation();

    await loadData();
    renderSubjects();
}

init();
