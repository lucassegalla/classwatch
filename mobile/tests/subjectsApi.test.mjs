import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadApi(fetchImpl) {
  const module = { exports: {} };
  const source = readFileSync(new URL('../services/api.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  class TestFormData {
    values = [];
    append(...args) { this.values.push(args); }
  }
  runInNewContext(compiled, {
    exports: module.exports,
    module,
    process: { env: { EXPO_PUBLIC_API_URL: 'https://api.classwatch.test/' } },
    Headers,
    FormData: TestFormData,
    fetch: fetchImpl,
  });
  return module.exports;
}

test('matérias usam endpoints da API protegida e enviam o token atual', async () => {
  const calls = [];
  const api = loadApi(async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, async json() { return []; } };
  });
  api.setAuthToken('session-jwt');

  await api.getSubjects();
  await api.createSubject({ nome: 'Redes', descricao: '', curso: 'Computação', turma: 'A', periodoLetivo: '2026.2' });
  await api.joinSubject('ABCD2345');
  await api.getSubjectLectures(8);
  await api.getAvailableSubjectLectures(8);
  await api.addExistingLectureToSubject(8, 31);

  assert.deepEqual(calls.map((call) => call.url), [
    'https://api.classwatch.test/subjects',
    'https://api.classwatch.test/subjects',
    'https://api.classwatch.test/subjects/join',
    'https://api.classwatch.test/subjects/8/lectures',
    'https://api.classwatch.test/subjects/8/available-lectures',
    'https://api.classwatch.test/subjects/8/lectures/31',
  ]);
  assert.ok(calls.every((call) => call.options.headers.get('Authorization') === 'Bearer session-jwt'));
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[2].options.method, 'POST');
  assert.equal(calls[4].options.method, undefined);
  assert.equal(calls[5].options.method, 'POST');
});

test('upload iniciado em uma matéria usa a rota de associação e mantém autenticação', async () => {
  let call;
  const api = loadApi(async (url, options) => {
    call = { url, options };
    return { ok: true, status: 202, async json() { return { id: 19 }; } };
  });
  api.setAuthToken('teacher-jwt');

  await api.uploadLecture('file:///lecture.m4a', 'Aula 1', '', 'request-1', 12);

  assert.equal(call.url, 'https://api.classwatch.test/subjects/12/lectures');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers.get('Authorization'), 'Bearer teacher-jwt');
});

test('mantém a indicação de aula legada na resposta para confirmação de associação', async () => {
  const api = loadApi(async () => ({
    ok: true,
    status: 200,
    async json() { return [{ id: 41, titulo: 'Aula antiga', legacy: true }]; },
  }));
  api.setAuthToken('teacher-jwt');

  const available = await api.getAvailableSubjectLectures(8);

  assert.equal(available[0].legacy, true);
  assert.equal(available[0].id, 41);
});
