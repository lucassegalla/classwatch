export type LectureStatus = 'PROCESSANDO' | 'FINALIZADO' | 'ERRO';

export interface LectureSummary {
  id: number;
  titulo: string;
  descricao: string;
  status: LectureStatus;
  erroProcessamento: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Lecture extends LectureSummary {
  transcricao: string | null;
  resumo: string | null;
}
