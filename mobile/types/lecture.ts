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
