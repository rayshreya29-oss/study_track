'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { getState, replaceState, migrate } = require('./db/database');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8'
};

const BLOCKED = /^(data|db|node_modules|\.git)([\\/]|$)/i;

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', chunk => {
            size += chunk.length;
            if (size > 2 * 1024 * 1024) {
                reject(new Error('Payload too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

function serveStatic(req, res, pathname) {
    let requested;
    try {
        requested = decodeURIComponent(pathname);
    } catch {
        res.writeHead(400);
        return res.end('Bad request');
    }

    if (requested === '/' || requested === '') requested = '/index.html';

    const relative = requested.replace(/^\/+/, '');
    if (BLOCKED.test(relative) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    const filePath = path.resolve(ROOT, relative);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(error.code === 'ENOENT' ? 404 : 500);
            return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
        }
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        res.end(req.method === 'HEAD' ? undefined : data);
    });
}

const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

    try {
        if (pathname.startsWith('/api/')) {
            if (pathname === '/api/health' && req.method === 'GET') {
                return sendJson(res, 200, { ok: true });
            }

            if (pathname === '/api/state' && req.method === 'GET') {
                return sendJson(res, 200, { subjects: getState() });
            }

            if (pathname === '/api/state' && req.method === 'PUT') {
                const body = await readJson(req);
                if (!Array.isArray(body.subjects)) {
                    return sendJson(res, 400, { error: 'Expected a subjects array.' });
                }
                const count = replaceState(body.subjects);
                return sendJson(res, 200, { ok: true, subjects: count });
            }

            return sendJson(res, 404, { error: 'Unknown API endpoint.' });
        }

        return serveStatic(req, res, pathname);
    } catch (error) {
        console.error(error);
        return sendJson(res, 500, { error: error.message || 'Server error' });
    }
});

migrate();
server.listen(PORT, () => {
    console.log(`StudySync running at http://localhost:${PORT}`);
});
