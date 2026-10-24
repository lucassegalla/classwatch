import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';

import type { StudyMaterial } from '@/services/studyMaterial';
import { buildLectureSummaryHtml, type PdfSummarySection } from '@/services/lecturePdfDocument';

export function lecturePdfFilename(title: string): string {
  const safeTitle = title
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .replace(/\.pdf$/i, '')
    .trim();

  return `${safeTitle || 'Resumo da aula'}.pdf`;
}

export async function shareLectureSummaryPdf(
  title: string,
  material: StudyMaterial,
  sections: readonly PdfSummarySection[],
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento de arquivos não está disponível neste dispositivo.');
  }

  const html = buildLectureSummaryHtml(title, material, sections);
  const pdf = await Print.printToFileAsync({
    html,
    base64: false,
    margins: { top: 48, right: 48, bottom: 48, left: 48 },
  });

  if (!pdf.uri || pdf.numberOfPages < 1) {
    throw new Error('Não foi possível criar o arquivo PDF da aula.');
  }

  const shareDirectory = new Directory(
    Paths.cache,
    `classwatch-share-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  shareDirectory.create();
  const namedPdf = new File(shareDirectory, lecturePdfFilename(title));
  new File(pdf.uri).move(namedPdf);

  await Sharing.shareAsync(namedPdf.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Compartilhar resumo da aula',
  });
}
