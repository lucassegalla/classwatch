import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
const source = readFileSync(new URL('../services/studyMaterial.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
runInNewContext(compiled, { exports: module.exports, module });
const { parseStudyMaterial } = module.exports;

test('renders structured summaries and removes repeated or title-only content', () => {
  const material = parseStudyMaterial(JSON.stringify({
    visao_geral: 'A aula explica como gases atmosféricos retêm energia térmica.',
    ideias_centrais: [
      { title: 'Efeito estufa', explanation: 'Gases na atmosfera retêm parte do calor terrestre.' },
      { title: 'Efeito estufa', explanation: 'Efeito estufa' },
    ],
    conceitos_definicoes: { 'Efeito estufa': 'Gases na atmosfera retêm parte do calor terrestre.' },
  }));
  assert.equal(material.main_ideas.length, 0);
  assert.equal(material.concepts.length, 1);
  assert.match(material.overview, /gases atmosféricos/);
});

test('reads legacy Python dictionaries embedded in Markdown without exposing syntax', () => {
  const material = parseStudyMaterial(`## Parte 1\n{'ideias_centrais': [{'title': 'Efeito estufa', 'explanation': 'Gases na atmosfera retêm parte do calor terrestre.'}],\n'conceitos_definicoes': {'Aquecimento global': 'Aquecimento global'},\n'relacoes_entre_ideias': ['Atividades humanas e efeito estufa']}`);
  assert.equal(material.main_ideas.length, 1);
  assert.equal(material.concepts.length, 0);
  assert.equal(material.relations.length, 0);
  const renderedText = [material.overview, ...material.main_ideas, ...material.concepts, ...material.relations].map((entry) => typeof entry === 'string' ? entry : `${entry.title ?? ''} ${entry.text}`).join('\n');
  assert.doesNotMatch(renderedText, /##|\{'|\['/);
});

test('does not display malformed serialized objects as summary text', () => {
  const material = parseStudyMaterial('{"ideias_centrais":[{"title":"Efeito estufa"}');
  assert.equal(JSON.stringify(material), JSON.stringify({ overview: '', main_ideas: [], concepts: [], relations: [], examples: [], questions: [] }));
});

test('keeps substantive technical explanations with domain-specific verbs', () => {
  const material = parseStudyMaterial(JSON.stringify({
    visao_geral: 'A aula descreve como redes encaminham dados entre dispositivos conectados.',
    ideias_centrais: [{ title: 'Roteamento', explanation: 'Roteadores encaminham pacotes entre redes diferentes usando os endereços IP de destino.' }],
    conceitos_definicoes: { LAN: 'Uma LAN conecta dispositivos dentro de uma área local, como uma sala ou edifício.' },
    relacoes_entre_ideias: [{ title: 'Switches e redes locais', explanation: 'Switches direcionam quadros aos dispositivos conectados na mesma rede local.' }],
  }));
  assert.equal(material.main_ideas.length, 1);
  assert.equal(material.concepts.length, 1);
  assert.equal(material.relations.length, 1);
  assert.match(material.main_ideas[0].text, /encaminham pacotes/);
});

test('renders supported legacy summary fields', () => {
  const material = parseStudyMaterial(JSON.stringify({
    resumo: 'A aula apresenta como redes locais conectam computadores e compartilham dados.',
    ideias_principais: ['Os switches direcionam quadros aos dispositivos da rede local.'],
  }));
  assert.match(material.overview, /redes locais conectam/);
  assert.equal(material.main_ideas.length, 1);
});

test('does not treat the old generic insufficient-content placeholder as a summary', () => {
  const material = parseStudyMaterial('Conteúdo insuficiente para resumo. Consulte a transcrição para mais contexto.');
  assert.equal(material.overview, '');
  assert.deepEqual(JSON.parse(JSON.stringify(material)), { overview: '', main_ideas: [], concepts: [], relations: [], examples: [], questions: [] });
});

test('renders all detailed sections from alternate JSON property names', () => {
  const material = parseStudyMaterial(JSON.stringify({
    overview: 'A aula explica a estrutura de bancos relacionais e suas regras.',
    mainIdeas: [{ title: 'Integridade', description: 'Restrições preservam a consistência dos registros durante alterações na base.' }],
    conceptsAndDefinitions: [{ name: 'Chave estrangeira', content: 'Referencia uma chave de outra tabela para representar uma relação entre registros.' }],
    relationsBetweenConcepts: [{ title: 'Chaves e relacionamentos', text: 'A chave estrangeira conecta registros relacionados e depende de uma chave referenciada existente.' }],
    reviewQuestions: [{ question: 'Para que serve uma chave estrangeira?', answer: 'Ela referencia registros relacionados armazenados em outra tabela.' }],
  }));
  assert.equal(material.main_ideas.length, 1);
  assert.equal(material.concepts.length, 1);
  assert.equal(material.relations.length, 1);
  assert.equal(material.questions.length, 1);
  assert.equal(material.questions[0].title, 'Para que serve uma chave estrangeira?');
});

test('only displays real interrogative review questions and filters legacy assertions', () => {
  const material = parseStudyMaterial(JSON.stringify({
    overview: 'A aula explica chaves e restrições usadas em bancos de dados relacionais.',
    questions: [
      { question: 'Qual é a função de uma chave primária?', answer: 'Ela identifica exclusivamente cada registro de uma tabela.' },
      { question: 'Qual a função de uma chave primária?', answer: 'Uma chave primária identifica cada registro.' },
      { question: 'As chaves primárias identificam exclusivamente cada registro?', answer: 'Uma chave primária identifica cada registro.' },
      { title: 'Restrições NOT NULL e UNIQUE', text: 'NOT NULL impede valores vazios e UNIQUE impede duplicação.' },
    ],
  }));

  assert.equal(material.questions.length, 1);
  assert.equal(material.questions[0].title, 'Qual é a função de uma chave primária?');
  assert.ok(material.questions[0].text.startsWith('Ela identifica'));
});

test('unwraps legacy summaries nested under resumo or summary', () => {
  for (const wrapper of ['resumo', 'summary']) {
    const material = parseStudyMaterial(JSON.stringify({ [wrapper]: {
      overview: 'A aula explica como tabelas relacionam registros por meio de chaves.',
      concepts: [{ title: 'Chave primária', definition: 'Identifica exclusivamente cada registro guardado em uma tabela.' }],
    } }));
    assert.equal(material.concepts.length, 1);
    assert.match(material.overview, /tabelas relacionam registros/);
  }
});
