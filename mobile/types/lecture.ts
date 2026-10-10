export type LectureStatus = 'PROCESSANDO' | 'FINALIZADO' | 'ERRO';

export interface Lecture {
  id: number;
  titulo: string;
  descricao: string;
  transcricao: string | null;
  resumo: string | null;
  status: LectureStatus;
  erroProcessamento: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
