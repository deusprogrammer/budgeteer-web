import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';
import { hashPassword, verifyPassword } from '../src/auth.js';

const JWT_SECRET = 'test-secret-with-at-least-32-bytes-long';

test('configuration defaults to the supplied MongoDB server, with optional overrides', () => {
  assert.deepEqual(loadConfig({ JWT_SECRET }), {
    port: 3001,
    jwtSecret: JWT_SECRET,
    mongo: { url: 'mongodb://10.0.0.244/', database: 'budgeteer' },
  });
  assert.deepEqual(loadConfig({
    JWT_SECRET, PORT: '4000', MONGODB_URL: 'mongodb://localhost/', MONGODB_DATABASE: 'other',
  }), {
    port: 4000,
    jwtSecret: JWT_SECRET,
    mongo: { url: 'mongodb://localhost/', database: 'other' },
  });
});

test('configuration rejects missing/short secrets and invalid ports', () => {
  for (const secret of [undefined, '', 'short']) {
    assert.throws(() => loadConfig({ JWT_SECRET: secret }), /JWT_SECRET/);
  }
  for (const port of ['0', '-1', '65536', 'abc', '1.5', '']) {
    assert.throws(() => loadConfig({ JWT_SECRET, PORT: port }), /PORT/);
  }
});

test('password hashes have independent salts and verify only the correct password', async () => {
  const first = await hashPassword('a long test password');
  const second = await hashPassword('a long test password');
  assert.notEqual(first, second);
  assert.equal(first.includes('a long test password'), false);
  assert.equal(await verifyPassword('a long test password', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});
