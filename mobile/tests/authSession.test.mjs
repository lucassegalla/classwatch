import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadSessionService(platform = 'ios') {
  const storage = new Map();
  const module = { exports: {} };
  const source = readFileSync(new URL('../services/authSession.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const secureStore = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    async getItemAsync(key) { return storage.get(key) ?? null; },
    async setItemAsync(key, value) { storage.set(key, value); },
    async deleteItemAsync(key) { storage.delete(key); },
  };
  runInNewContext(compiled, {
    exports: module.exports,
    module,
    require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-secure-store') return secureStore;
      if (name.endsWith('/lecture')) return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { ...module.exports, storage };
}

test('salva e restaura sessão usando armazenamento seguro e limpa no logout', async () => {
  const session = loadSessionService();
  const user = { id: 7, name: 'Ana', email: 'ana@example.com', role: 'ESTUDANTE' };

  await session.saveSession('jwt-access-token', user);
  assert.deepEqual(JSON.parse(JSON.stringify(await session.loadSession())), { token: 'jwt-access-token', user });
  assert.equal(session.storage.get('classwatch.access-token'), 'jwt-access-token');

  await session.clearSavedSession();
  assert.equal(await session.loadSession(), null);
});

test('sessão web fica somente em memória e desaparece ao limpar', async () => {
  const session = loadSessionService('web');
  const user = { id: 8, name: 'Bia', email: 'bia@example.com', role: 'ESTUDANTE' };
  await session.saveSession('web-token', user);
  assert.equal((await session.loadSession()).token, 'web-token');
  await session.clearSavedSession();
  assert.equal(await session.loadSession(), null);
});
