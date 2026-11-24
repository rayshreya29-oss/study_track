'use strict';

export async function onRequestGet() {
    return new Response(JSON.stringify({ ok: true, storage: 'Cloudflare D1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}
