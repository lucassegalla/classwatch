import type { StudyMaterial } from '@/services/studyMaterial';

export interface PdfSummarySection {
  key: 'main_ideas' | 'concepts' | 'relations' | 'examples' | 'questions';
  title: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildLectureSummaryHtml(
  title: string,
  material: StudyMaterial,
  sections: readonly PdfSummarySection[],
): string {
  const overview = material.overview
    ? `<section><h2>Visão geral</h2><p>${escapeHtml(material.overview)}</p></section>`
    : '';

  const sectionMarkup = sections.map(({ key, title: sectionTitle }) => {
    const entries = material[key];
    if (!entries.length) return '';
    const items = entries.map((entry) => `
      <article class="entry">
        ${entry.title ? `<h3>${escapeHtml(entry.title)}</h3>` : ''}
        <p>${escapeHtml(entry.text)}</p>
      </article>`).join('');
    return `<section><h2>${escapeHtml(sectionTitle)}</h2>${items}</section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 18mm 17mm; }
      * { box-sizing: border-box; }
      body {
        color: #202938;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.55;
        margin: 0;
      }
      h1 {
        color: #172b63;
        font-size: 23pt;
        line-height: 1.2;
        margin: 0 0 22pt;
        overflow-wrap: anywhere;
      }
      h2 {
        border-bottom: 1px solid #d7deeb;
        color: #2549a2;
        font-size: 15pt;
        margin: 20pt 0 9pt;
        padding-bottom: 5pt;
        break-after: avoid-page;
        page-break-after: avoid;
      }
      h3 {
        color: #253451;
        font-size: 11.5pt;
        margin: 12pt 0 3pt;
        break-after: avoid-page;
        page-break-after: avoid;
      }
      p {
        margin: 0 0 9pt;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        orphans: 3;
        widows: 3;
      }
      section { margin: 0; }
      .entry { margin: 0 0 9pt; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${overview}
    ${sectionMarkup}
  </body>
</html>`;
}
