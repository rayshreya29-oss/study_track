'use strict';

/** Copy the static frontend into the Pages build output directory. */

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const files = [
    'index.html',
    'subjects.html',
    'reports.html',
    'style.css',
    'script.js',
    'seed-data.js'
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const file of files) {
    fs.copyFileSync(path.join(root, file), path.join(dist, file));
}
console.log(`Built ${files.length} files into ${dist}`);
