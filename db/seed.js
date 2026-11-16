'use strict';

/** Seed a Computer Science major curriculum into the local SQLite database. */

const { getState, replaceState, migrate } = require('./database');

const CURRICULUM = [
    {
        name: 'Data Structures & Algorithms',
        modules: [
            ['Linear Structures', ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Hash Tables']],
            ['Trees & Graphs', ['Binary Trees', 'Binary Search Trees', 'Heaps', 'Graph Traversal (BFS/DFS)', 'Shortest Path']],
            ['Sorting & Searching', ['Bubble & Insertion Sort', 'Merge Sort', 'Quick Sort', 'Binary Search']],
            ['Complexity Analysis', ['Big-O Notation', 'Time vs Space Tradeoffs', 'Recurrence Relations']]
        ]
    },
    {
        name: 'Operating Systems',
        modules: [
            ['Processes & Threads', ['Process Model', 'Context Switching', 'Threads', 'CPU Scheduling']],
            ['Memory Management', ['Paging', 'Segmentation', 'Virtual Memory', 'Page Replacement']],
            ['Concurrency', ['Race Conditions', 'Semaphores & Mutexes', 'Deadlocks']],
            ['File Systems', ['Inodes', 'Directory Structures', 'Disk Scheduling']]
        ]
    },
    {
        name: 'Computer Networks',
        modules: [
            ['Fundamentals', ['OSI Model', 'TCP/IP Model', 'IP Addressing', 'Subnetting']],
            ['Transport Layer', ['TCP', 'UDP', 'Congestion Control']],
            ['Application Layer', ['HTTP & HTTPS', 'DNS', 'SMTP & MIME']],
            ['Network Security', ['TLS/SSL', 'Firewalls', 'VPNs']]
        ]
    },
    {
        name: 'Database Systems',
        modules: [
            ['Relational Model', ['ER Diagrams', 'Normalization', 'SQL Basics', 'Joins']],
            ['Transactions', ['ACID Properties', 'Isolation Levels', 'Concurrency Control']],
            ['Performance', ['Indexes & B-Trees', 'Query Optimization', 'Query Plans']],
            ['NoSQL', ['Document Stores', 'Key-Value Stores', 'Graph Databases']]
        ]
    },
    {
        name: 'Computer Architecture',
        modules: [
            ['Digital Logic', ['Boolean Algebra', 'Logic Gates', 'Karnaugh Maps']],
            ['CPU Design', ['Instruction Sets', 'Registers & ALU', 'Pipelining']],
            ['Memory Hierarchy', ['Cache Memory', 'RAM', 'Virtual Memory']],
            ['I/O Systems', ['Interrupts', 'DMA', 'Buses']]
        ]
    },
    {
        name: 'Discrete Mathematics',
        modules: [
            ['Logic & Proofs', ['Propositional Logic', 'Predicates & Quantifiers', 'Proof Techniques']],
            ['Sets & Combinatorics', ['Set Operations', 'Permutations & Combinations', 'Pigeonhole Principle']],
            ['Graph Theory', ['Graph Terminology', 'Trees', 'Euler & Hamiltonian Paths']],
            ['Number Theory', ['Modular Arithmetic', 'GCD & Euclid', 'Prime Numbers']]
        ]
    },
    {
        name: 'Software Engineering',
        modules: [
            ['SDLC', ['Requirements Gathering', 'System Design', 'Testing', 'Deployment']],
            ['Version Control', ['Git Basics', 'Branching & Merging', 'Pull Requests']],
            ['Design Patterns', ['SOLID Principles', 'Creational Patterns', 'Structural Patterns']],
            ['Agile', ['Scrum', 'Sprints & Standups', 'Code Reviews']]
        ]
    },
    {
        name: 'Web Development',
        modules: [
            ['Frontend', ['HTML', 'CSS', 'JavaScript', 'React']],
            ['Backend', ['Node.js', 'REST APIs', 'Authentication']],
            ['Data Layer', ['SQLite', 'PostgreSQL', 'ORMs']],
            ['Deployment', ['Docker', 'CI/CD', 'Cloud Hosting']]
        ]
    },
    {
        name: 'Machine Learning',
        modules: [
            ['Fundamentals', ['Supervised vs Unsupervised', 'Train/Test Split', 'Overfitting']],
            ['Classical Algorithms', ['Linear Regression', 'Decision Trees', 'SVM', 'K-Means']],
            ['Neural Networks', ['Perceptrons', 'Backpropagation', 'CNNs', 'RNNs']],
            ['Evaluation', ['Accuracy & Precision/Recall', 'Cross-Validation', 'Confusion Matrix']]
        ]
    },
    {
        name: 'Cybersecurity',
        modules: [
            ['Fundamentals', ['CIA Triad', 'Threat Modeling', 'Attack Surfaces']],
            ['Cryptography', ['Symmetric Encryption', 'Public Key Encryption', 'Hashing']],
            ['Network Security', ['Intrusion Detection', 'Man-in-the-Middle', 'Packet Analysis']],
            ['Web Security', ['OWASP Top 10', 'XSS', 'SQL Injection', 'CSRF']]
        ]
    }
];

// A few foundational topics marked done so the dashboard shows real progress.
const PRE_COMPLETED = new Set([
    'Arrays', 'Binary Search', 'Git Basics', 'HTML', 'CSS',
    'Boolean Algebra', 'SQL Basics', 'OSI Model'
]);

function id(part) {
    return `seed-${part.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function buildSubjects() {
    return CURRICULUM.map(subject => ({
        id: id(subject.name),
        name: subject.name,
        modules: subject.modules.map(([moduleName, topicNames]) => ({
            id: id(`${subject.name}-${moduleName}`),
            name: moduleName,
            topics: topicNames.map(topicName => ({
                id: id(`${subject.name}-${moduleName}-${topicName}`),
                name: topicName,
                completed: PRE_COMPLETED.has(topicName)
            }))
        }))
    }));
}

function main() {
    migrate();
    const existing = getState();
    const names = new Set(existing.map(s => s.name.toLowerCase()));
    const additions = buildSubjects().filter(s => !names.has(s.name.toLowerCase()));

    if (!additions.length) {
        console.log('Curriculum already seeded — nothing to add.');
        return;
    }

    replaceState([...existing, ...additions]);
    const state = getState();
    const topics = state.reduce(
        (sum, s) => sum + s.modules.reduce((n, m) => n + m.topics.length, 0), 0
    );
    const done = state.reduce(
        (sum, s) => sum + s.modules.reduce(
            (n, m) => n + m.topics.filter(t => t.completed).length, 0
        ), 0
    );
    console.log(`Seeded ${additions.length} Computer Science subjects.`);
    console.log(`Totals: ${state.length} subjects, ${topics} topics, ${done} completed.`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error('Seed failed:', error.message);
        process.exitCode = 1;
    }
}

module.exports = { CURRICULUM, PRE_COMPLETED };
