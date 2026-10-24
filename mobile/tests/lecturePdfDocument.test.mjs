import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
const source = readFileSync(new URL('../services/lecturePdfDocument.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(compiled, { exports: module.exports, module });
const { buildLectureSummaryHtml } = module.exports;

function loadShareService({ printToFileAsync, shareAsync, isAvailableAsync = async () => true, fileSystem = {} }) {
  const serviceModule = { exports: {} };
  const serviceSource = readFileSync(new URL('../services/shareLecturePdf.ts', import.meta.url), 'utf8');
  const serviceCompiled = ts.transpileModule(serviceSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(serviceCompiled, {
    exports: serviceModule.exports,
    module: serviceModule,
    require(name) {
      if (name === 'expo-print') return { printToFileAsync };
      if (name === 'expo-sharing') return { shareAsync, isAvailableAsync };
      if (name === 'expo-file-system') return fileSystem;
      if (name.endsWith('/lecturePdfDocument')) return { buildLectureSummaryHtml };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return serviceModule.exports;
}

const sections = [
  { key: 'main_ideas', title: 'Ideias principais' },
  { key: 'concepts', title: 'Conceitos e definições' },
  { key: 'relations', title: 'Relações entre os conceitos' },
  { key: 'examples', title: 'Exemplos da aula' },
  { key: 'questions', title: 'Perguntas para revisão' },
];

test('PDF HTML includes every summary section and preserves accents and line breaks', () => {
  const html = buildLectureSummaryHtml('Banco de dados & SQL', {
    overview: 'A visão geral mantém acentos, símbolos & sinais.\nSegundo parágrafo.',
    main_ideas: [{ title: 'Chave primária', text: 'Identifica exclusivamente cada registro.' }],
    concepts: [{ title: 'Chave estrangeira', text: 'Referencia registros de outra tabela.' }],
    relations: [{ title: 'Tabelas relacionadas', text: 'A chave estrangeira conecta registros entre tabelas.' }],
    examples: [{ title: 'Exemplo', text: 'Uma tabela de matrícula relaciona alunos e disciplinas.' }],
    questions: [{ title: 'Para que serve a chave primária?', text: 'Ela identifica cada registro de modo único.' }],
  }, sections);

  assert.match(html, /Banco de dados &amp; SQL/);
  assert.match(html, /Visão geral/);
  assert.match(html, /Ideias principais/);
  assert.match(html, /Conceitos e definições/);
  assert.match(html, /Relações entre os conceitos/);
  assert.match(html, /Exemplos da aula/);
  assert.match(html, /Perguntas para revisão/);
  assert.match(html, /visão geral mantém acentos, símbolos &amp; sinais\.\nSegundo parágrafo\./);
  assert.match(html, /Chave estrangeira/);
});

test('long content keeps its beginning, middle, and end without truncation', () => {
  const longText = [
    'BEGINNING_MARKER ' + 'conceito técnico explicado com detalhes. '.repeat(300),
    'MIDDLE_MARKER ' + 'relação entre os elementos e exemplos da aula. '.repeat(300),
    'ENDING_MARKER conteúdo final preservado por inteiro.',
  ].join('\n\n');
  const html = buildLectureSummaryHtml('Aula extensa', {
    overview: longText,
    main_ideas: [], concepts: [], relations: [], examples: [], questions: [],
  }, sections);

  assert.ok(html.indexOf('BEGINNING_MARKER') < html.indexOf('MIDDLE_MARKER'));
  assert.ok(html.indexOf('MIDDLE_MARKER') < html.indexOf('ENDING_MARKER'));
  assert.ok(html.includes('ENDING_MARKER conteúdo final preservado por inteiro.'));
  assert.ok(html.length > longText.length);
});

test('omits empty sections and escapes untrusted markup as text', () => {
  const html = buildLectureSummaryHtml('<Aula>', {
    overview: '',
    main_ideas: [], concepts: [], relations: [], examples: [], questions: [],
  }, sections);

  assert.match(html, /&lt;Aula&gt;/);
  assert.doesNotMatch(html, /<h2>Ideias principais<\/h2>/);
  assert.doesNotMatch(html, /<h2>Conceitos e definições<\/h2>/);
});

test('names the PDF from the lecture title, then shares the complete generated document', async () => {
  let printOptions;
  let sharedUri;
  let destination;
  const { shareLectureSummaryPdf } = loadShareService({
    printToFileAsync: async (options) => { printOptions = options; return { uri: 'file:///cache/summary.pdf', numberOfPages: 4 }; },
    shareAsync: async (uri) => { sharedUri = uri; },
    fileSystem: {
      Paths: { cache: 'file:///cache' },
      Directory: class { constructor(...parts) { this.uri = parts.join('/'); } create() {} },
      File: class {
        constructor(...parts) { this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/'); }
        move(file) { destination = file.uri; }
      },
    },
  });
  const completeMaterial = {
    overview: 'BEGINNING ' + 'conteúdo integral com explicações. '.repeat(150) + 'ENDING_MARKER',
    main_ideas: [], concepts: [], relations: [], examples: [], questions: [],
  };

  await shareLectureSummaryPdf('Teste4 - Banco de dados', completeMaterial, sections);

  assert.ok(printOptions.html.includes('BEGINNING'));
  assert.ok(printOptions.html.includes('ENDING_MARKER'));
  assert.equal(printOptions.base64, false);
  assert.match(destination, /Teste4 - Banco de dados\.pdf$/);
  assert.equal(sharedUri, destination);
});

test('sanitizes the shared filename without losing accents or extension', async () => {
  const { lecturePdfFilename } = loadShareService({
    printToFileAsync: async () => ({ uri: 'file:///cache/summary.pdf', numberOfPages: 1 }),
    shareAsync: async () => {},
    fileSystem: { Paths: { cache: 'file:///cache' }, Directory: class {}, File: class {} },
  });

  assert.equal(lecturePdfFilename('  Teste4 - Banco de dados  '), 'Teste4 - Banco de dados.pdf');
  assert.equal(lecturePdfFilename('Aula: Redes/segurança?'), 'Aula- Redes-segurança-.pdf');
  assert.equal(lecturePdfFilename('   '), 'Resumo da aula.pdf');
  assert.equal(lecturePdfFilename('Aula.pdf'), 'Aula.pdf');
});

test('does not open native sharing if PDF generation fails', async () => {
  let shareCalled = false;
  const { shareLectureSummaryPdf } = loadShareService({
    printToFileAsync: async () => { throw new Error('print failed'); },
    shareAsync: async () => { shareCalled = true; },
  });

  await assert.rejects(
    shareLectureSummaryPdf('Aula', { overview: 'Conteúdo com explicação suficiente para um resumo.', main_ideas: [], concepts: [], relations: [], examples: [], questions: [] }, sections),
    /print failed/,
  );
  assert.equal(shareCalled, false);
});
