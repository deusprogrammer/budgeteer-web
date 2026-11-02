import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

test('production serves the client, SPA routes, and assets without hiding API errors', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'budgeteer-static-'));
  let server;
  try {
    await writeFile(path.join(directory, 'index.html'), '<html><body>Budgeteer</body></html>');
    await writeFile(path.join(directory, 'app.js'), 'console.log("Budgeteer");');
    server = createApp({}, {
      jwtSecret: 'static-test-secret-with-at-least-32-bytes',
      staticDirectory: directory,
    }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const route of ['/', '/budget/expenses']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.match(await response.text(), /Budgeteer/);
    }
    const asset = await fetch(`${base}/app.js`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), 'console.log("Budgeteer");');
    const missingApi = await fetch(`${base}/api/budgeteer/missing`);
    assert.equal(missingApi.status, 404);
    assert.deepEqual(await missingApi.json(), { error: 'API endpoint not found' });
    const protectedApi = await fetch(`${base}/api/budgeteer/bills`);
    assert.equal(protectedApi.status, 401);
    assert.deepEqual(await (await fetch(`${base}/api/budgeteer/health`)).json(), { status: 'ok' });
    for (const route of ['/api/health', '/api/auth/login', '/api/bills']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'API endpoint not found' });
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
