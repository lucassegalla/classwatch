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

export interface AvailableLectureSummary extends LectureSummary {
  legacy: boolean;
}

export interface Lecture extends LectureSummary {
  transcricao: string | null;
  resumo: string | null;
  canManage: boolean;
}

export type UserRole = 'PROFESSOR' | 'ESTUDANTE';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: UserProfile;
}

export interface Subject {
  id: number;
  nome: string;
  descricao: string;
  curso: string;
  turma: string;
  periodoLetivo: string;
  professorId: number;
  professorNome: string;
  codigoIngresso: string | null;
  ativa: boolean;
  createdAt: string | null;
}

export interface SubjectInput {
  nome: string;
  descricao: string;
  curso: string;
  turma: string;
  periodoLetivo: string;
}
