export interface StudyEntry {
  title?: string;
  text: string;
}

export interface StudyMaterial {
  overview: string;
  main_ideas: StudyEntry[];
  concepts: StudyEntry[];
  relations: StudyEntry[];
  examples: StudyEntry[];
  questions: StudyEntry[];
}

type UnknownRecord = Record<string, unknown>;

const emptyMaterial = (): StudyMaterial => ({
  overview: '', main_ideas: [], concepts: [], relations: [], examples: [], questions: [],
});

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Reads the small, data-only subset emitted by Python repr. Never evaluates code.
function parsePythonLiteral(source: string): unknown {
  let index = 0;
  const skip = () => { while (/\s/.test(source[index] ?? '')) index += 1; };
  const string = (): string => {
    const quote = source[index++];
    let value = '';
    while (index < source.length) {
      const char = source[index++];
      if (char === quote) return value;
      if (char !== '\\') { value += char; continue; }
      const escaped = source[index++];
      const simple: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '\\': '\\', "'": "'", '"': '"' };
      if (escaped === 'u' || escaped === 'U') {
        const length = escaped === 'u' ? 4 : 8;
        const code = Number.parseInt(source.slice(index, index + length), 16);
        if (Number.isFinite(code)) value += String.fromCodePoint(code);
        index += length;
      } else value += simple[escaped] ?? escaped;
    }
    throw new Error('Texto estruturado incompleto');
  };
  const value = (): unknown => {
    skip();
    const char = source[index];
    if (char === '{') {
      index += 1; skip(); const result: UnknownRecord = {};
      while (source[index] !== '}') {
        skip(); const key = source[index] === '"' || source[index] === "'" ? string() : String(value());
        skip(); if (source[index++] !== ':') throw new Error('Dicionário inválido');
        result[key] = value(); skip();
        if (source[index] === ',') { index += 1; skip(); if (source[index] === '}') break; }
        else break;
      }
      if (source[index++] !== '}') throw new Error('Dicionário incompleto');
      return result;
    }
    if (char === '[' || char === '(') {
      const closing = char === '[' ? ']' : ')'; index += 1; skip(); const result: unknown[] = [];
      while (source[index] !== closing) {
        result.push(value()); skip();
        if (source[index] === ',') { index += 1; skip(); if (source[index] === closing) break; }
        else break;
      }
      if (source[index++] !== closing) throw new Error('Lista incompleta');
      return result;
    }
    if (char === '"' || char === "'") return string();
    const start = index;
    while (index < source.length && !/[\s,}\])]/.test(source[index])) index += 1;
    const token = source.slice(start, index);
    if (token === 'None') return null;
    if (token === 'True') return true;
    if (token === 'False') return false;
    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
    throw new Error('Valor estruturado inválido');
  };
  const parsed = value(); skip();
  if (index !== source.length) throw new Error('Conteúdo extra após o resumo');
  return parsed;
}

const comparableText = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();
const genericSummaryText = new Set(['ideia principal', 'ideias principais', 'conceito', 'conceito importante', 'definicao', 'relacao', 'exemplo', 'nao informado', 'nao especificado', 'informacao insuficiente', 'conteudo insuficiente para resumo', 'consulte a transcricao para mais contexto', 'resumo indisponivel', 'sem informacao suficiente', 'n a', 'n d']);
function hasExplanation(title: string, text: string, minimumWords?: number) {
  const normalized = comparableText(text);
  const normalizedTitle = comparableText(title);
  if (!normalized || genericSummaryText.has(normalized) || genericSummaryText.has(normalizedTitle)
    || normalized.includes('conteudo insuficiente para resumo')
    || normalized.includes('consulte a transcricao para mais contexto')
    || (title && normalized === normalizedTitle)) return false;
  const words = normalized.split(' ');
  // Do not require a verb from a hand-maintained vocabulary: technical
  // explanations often use valid domain-specific verbs (e.g. encaminha).
  return words.length >= (minimumWords ?? (title ? 3 : 6));
}

function entryList(value: unknown): StudyEntry[] {
  let candidates: StudyEntry[] = [];
  if (typeof value === 'string') {
    candidates = value.split(/\n+/).map((line) => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean).map((text) => {
      const separator = text.indexOf(':');
      return separator > 0 ? { title: text.slice(0, separator).trim(), text: text.slice(separator + 1).trim() } : { text };
    });
  } else if (Array.isArray(value)) candidates = value.flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      const text = String(item).trim();
      const separator = text.indexOf(':');
      return [separator > 0 ? { title: text.slice(0, separator).trim(), text: text.slice(separator + 1).trim() } : { text }];
    }
    if (!isRecord(item)) return [];
    const title = item.title ?? item.term ?? item.termo ?? item.conceito ?? item.pergunta ?? item.question ?? item.name ?? item.label;
    const text = item.explanation ?? item.definition ?? item.definicao ?? item.definição ?? item.explicacao ?? item.explicação ?? item.descricao ?? item.description ?? item.resposta ?? item.answer ?? item.text ?? item.content;
    if (typeof text !== 'string') return [];
    return [{ ...(typeof title === 'string' ? { title } : {}), text: text.trim() }];
  });
  else if (isRecord(value)) candidates = Object.entries(value).map(([title, text]) => ({ title, text: typeof text === 'string' ? text.trim() : '' }));

  const seen = new Set<string>();
  return candidates.filter((entry) => {
    if (!hasExplanation(entry.title ?? '', entry.text)) return false;
    const key = comparableText(entry.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const reviewQuestionStarts = [
  'o que ', 'qual ', 'quais ', 'quem ', 'quando ', 'onde ', 'como ', 'por que ',
  'para que ', 'em que ', 'de que ', 'com que ', 'a que ', 'quanto ', 'quantos ', 'quantas ', 'a diferenca entre ',
];

function isReviewQuestion(value: string): boolean {
  const question = value.trim();
  const normalized = comparableText(question);
  return question.endsWith('?') && reviewQuestionStarts.some((prefix) => normalized.startsWith(prefix));
}

function similarQuestion(left: string, right: string): boolean {
  const a = comparableText(left);
  const b = comparableText(right);
  if (!a || !b) return false;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (a[row - 1] === b[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length) >= 0.9;
}

function questionList(value: unknown): StudyEntry[] {
  let candidates: StudyEntry[] = [];
  if (typeof value === 'string') {
    candidates = value.split(/\n+/).map((line) => ({ text: line.replace(/^\s*[-*•]\s*/, '').trim() }));
  } else if (Array.isArray(value)) candidates = value.flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') return [{ text: String(item).trim() }];
    if (!isRecord(item)) return [];
    const question = item.question ?? item.pergunta ?? item.title;
    const answer = item.answer ?? item.resposta ?? item.explanation ?? item.explicacao ?? item.text ?? item.content;
    if (typeof question === 'string') {
      return [{ title: question.trim(), text: typeof answer === 'string' ? answer.trim() : '' }];
    }
    if (typeof answer === 'string' && isReviewQuestion(answer)) return [{ text: answer.trim() }];
    return [];
  });
  else if (isRecord(value)) candidates = Object.entries(value).map(([title, text]) => ({ title, text: typeof text === 'string' ? text.trim() : '' }));

  const seen: string[] = [];
  return candidates.filter((entry) => {
    const question = entry.title?.trim() || entry.text.trim();
    if (!isReviewQuestion(question)) return false;
    if (seen.some((existing) => similarQuestion(question, existing))) return false;
    seen.push(question);
    return true;
  }).map((entry) => entry.title
    ? { title: entry.title, text: entry.text }
    : { text: entry.text });
}

function fromRecord(record: UnknownRecord): StudyMaterial {
  const result = emptyMaterial();
  const pick = (...keys: string[]) => keys.map((key) => record[key]).find((value) => value !== undefined && value !== null);
  const overview = pick('overview', 'visao_geral', 'visão geral');
  result.overview = typeof overview === 'string' && hasExplanation('', overview, 4) ? overview : '';
  result.main_ideas = entryList(pick('main_ideas', 'mainIdeas', 'key_points', 'keyPoints', 'ideias_centrais', 'ideias_principais', 'ideias principais'));
  result.concepts = entryList(pick('concepts', 'concepts_and_definitions', 'conceptsAndDefinitions', 'conceitos_definicoes', 'conceitos_e_definicoes', 'conceitos e definições'));
  result.relations = entryList(pick('relations', 'relations_between_concepts', 'relationsBetweenConcepts', 'relacoes_entre_ideias', 'relacoes_entre_conceitos', 'relações entre ideias', 'relações entre conceitos'));
  result.examples = entryList(pick('examples', 'exemplos_apresentados', 'exemplos apresentados'));
  result.questions = questionList(pick('questions', 'review_questions', 'reviewQuestions', 'perguntas_respostas', 'perguntas_e_respostas', 'perguntas e respostas'));
  if (!result.overview) {
    const legacyOverview = pick('resumo', 'summary');
    if (typeof legacyOverview === 'string' && hasExplanation('', legacyOverview, 4)) result.overview = legacyOverview;
  }
  return pruneCrossSectionDuplicates(result);
}

function pruneCrossSectionDuplicates(material: StudyMaterial): StudyMaterial {
  const seen = new Set<string>();
  for (const key of ['concepts', 'main_ideas', 'relations', 'examples'] as const) {
    material[key] = material[key].filter((entry) => {
      const content = comparableText(entry.text);
      if (!content || seen.has(content)) return false;
      seen.add(content);
      return true;
    });
  }
  return material;
}

function mergeRecords(records: StudyMaterial[]): StudyMaterial {
  const merged = emptyMaterial();
  for (const record of records) {
    if (!merged.overview && record.overview) merged.overview = record.overview;
    for (const key of ['concepts', 'main_ideas', 'relations', 'examples', 'questions'] as const) merged[key].push(...record[key]);
  }
  pruneCrossSectionDuplicates(merged);
  merged.questions = questionList(merged.questions);
  return merged;
}

function parseEmbeddedPythonDictionaries(source: string): StudyMaterial[] {
  const records: StudyMaterial[] = [];
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{') continue;
    let braces = 0; let brackets = 0; let parentheses = 0;
    let quote = ''; let escaped = false;
    for (let end = start; end < source.length; end += 1) {
      const char = source[end];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === "'" || char === '"') { quote = char; continue; }
      if (char === '{') braces += 1;
      else if (char === '}') braces -= 1;
      else if (char === '[') brackets += 1;
      else if (char === ']') brackets -= 1;
      else if (char === '(') parentheses += 1;
      else if (char === ')') parentheses -= 1;
      if (braces === 0 && brackets === 0 && parentheses === 0) {
        try {
          const parsed = parsePythonLiteral(source.slice(start, end + 1));
          if (isRecord(parsed)) records.push(fromRecord(parsed));
        } catch { /* Ignore brace text that is not a supported Python data literal. */ }
        start = end;
        break;
      }
    }
  }
  return records;
}

export function parseStudyMaterial(raw: string | null | undefined): StudyMaterial {
  if (!raw?.trim()) return emptyMaterial();
  const source = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed: unknown = JSON.parse(source);
    if (Array.isArray(parsed)) return fromRecord({ ideias_centrais: parsed });
    if (isRecord(parsed)) {
      const nested = parsed.resumo ?? parsed.summary;
      return fromRecord(isRecord(nested) ? nested : parsed);
    }
  } catch { /* Try legacy Python repr and Markdown below. */ }
  if (/^\s*\{/.test(source) && /['"]\s*[:]/.test(source)) {
    try {
      const parsed = parsePythonLiteral(source);
      if (isRecord(parsed)) return fromRecord(parsed);
    } catch { /* Preserve an unrecognized response as readable plain text. */ }
  }
  const embeddedRecords = parseEmbeddedPythonDictionaries(source);
  if (embeddedRecords.length) return mergeRecords(embeddedRecords);
  if (/^\s*\{/.test(source) && /['"]?\w+['"]?\s*:/.test(source)) return emptyMaterial();
  const sections: Record<string, string[]> = {};
  let current = 'overview';
  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (heading) {
      const normalized = heading.toLocaleLowerCase('pt-BR');
      current = /ideias/.test(normalized) ? 'main_ideas' : /conceito|defini/.test(normalized) ? 'concepts' : /rela/.test(normalized) ? 'relations' : /exemplo/.test(normalized) ? 'examples' : /pergunta|revis/.test(normalized) ? 'questions' : 'overview';
      continue;
    }
    (sections[current] ??= []).push(line.replace(/^\s*[-*•]\s*/, '').trim());
  }
  const result = emptyMaterial();
  const overviewText = (sections.overview ?? []).join('\n').trim();
  result.overview = hasExplanation('', overviewText, 4) ? overviewText : '';
  for (const key of ['main_ideas', 'concepts', 'relations', 'examples'] as const) result[key] = entryList(sections[key] ?? []);
  result.questions = questionList(sections.questions ?? []);
  if (!result.overview && !Object.values(sections).some((items) => items.length) && hasExplanation('', source, 4)) result.overview = source;
  return result;
}
