// Prüft das gebaute JAR über echte HTTP-Anfragen und eine persistente H2-Datenbank.
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:18080';
const cookies = new Map();
let server;
let log;
async function request(path, init = {}) {
  const response = await fetch(origin + path, {
    ...init,
    redirect: 'manual',
    headers: { cookie: [...cookies].map(([key, value]) => key + '=' + value).join('; '), ...init.headers },
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0];
    const index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
async function mutate(path, method, body, form = false) {
  const csrfResponse = await request('/api/csrf');
  assert.equal(csrfResponse.status, 200);
  const csrf = await csrfResponse.json();
  return request(path, { method, body, headers: {
    [csrf.headerName]: csrf.token,
    'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json',
  } });
}
async function start() {
  cookies.clear();
  log = openSync('target/smoke.log', 'a');
  server = spawn('java', ['-jar', 'target/bookshelf-0.0.1-SNAPSHOT.jar'], {
    env: { ...process.env, SERVER_PORT: '18080', DB_URL: 'jdbc:h2:file:./target/smoke-db;DB_CLOSE_ON_EXIT=FALSE', DB_PASSWORD: 'password' },
    stdio: ['ignore', log, log],
  });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error('Spring wurde vorzeitig beendet; siehe target/smoke.log');
    try {
      const response = await fetch(origin + '/api/session');
      if (response.ok) return;
    } catch {}
    await setTimeout(500);
  }
  throw new Error('Spring ist nicht gestartet; siehe target/smoke.log');
}
async function stop() {
  if (server && server.exitCode === null) {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    server.kill('SIGTERM');
    await stopped;
  }
  if (log !== undefined) { closeSync(log); log = undefined; }
}
async function login() {
  const response = await mutate('/api/login', 'POST', 'username=dbUser&password=workshops', true);
  assert.equal(response.status, 204);
  const session = await (await request('/api/session')).json();
  assert.equal(session.authenticated, true);
}
try {
  await start();
  const root = await request('/');
  assert.equal(root.status, 200);
  assert.match(await root.text(), /assets\/index-/);
  assert.equal((await request('/book')).status, 401);
  await login();
  const book = { title: 'Neustart-Test', author: 'Bookshelf', isbn: '978-1234567890', description: 'Persistenzprüfung' };
  const created = await mutate('/book', 'POST', JSON.stringify(book));
  assert.equal(created.status, 201);
  assert.equal((await mutate('/api/logout', 'POST')).status, 204);
  assert.equal((await request('/book')).status, 401);
  await stop();

  await start();
  await login();
  const persisted = await request('/book/' + book.isbn);
  assert.equal(persisted.status, 200);
  assert.equal((await persisted.json()).title, book.title);
  const updated = await mutate('/book/' + book.isbn, 'PUT', JSON.stringify({ ...book, title: 'Überarbeitet' }));
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).title, 'Überarbeitet');
  assert.equal((await mutate('/book/' + book.isbn, 'DELETE')).status, 204);
  assert.equal((await request('/book/' + book.isbn)).status, 404);
  console.log('Gesamtanwendung: React-Auslieferung, Anmeldung, CRUD, Abmeldung und Datenerhalt nach Neustart erfolgreich.');
} finally { await stop(); }
