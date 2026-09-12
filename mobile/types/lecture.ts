export type LectureStatus = 'RECEBIDO' | 'PROCESSANDO' | 'FINALIZADO' | 'ERRO';

export interface Lecture {
  id: number;
  titulo: string;
  descricao: string;
  transcricao: string | null;
  resumo: string | null;
  status: LectureStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  processingStartedAt: string | null;
  processingFinishedAt: string | null;
}

export const statusLabels: Record<LectureStatus, string> = {
  RECEBIDO: 'Na fila',
  PROCESSANDO: 'Processando',
  FINALIZADO: 'Concluída',
  ERRO: 'Falha',
};

export function isTerminalStatus(status: LectureStatus) {
  return status === 'FINALIZADO' || status === 'ERRO';
}
