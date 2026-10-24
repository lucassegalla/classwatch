import type { AuthResponse, AvailableLectureSummary, Lecture, LectureSummary, Subject, SubjectInput, UserProfile } from '@/types/lecture';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const API_URL = rawApiUrl?.replace(/\/+$/, '');
let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

interface ApiErrorBody {
  message?: string;
}

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error(
      'API não configurada. Defina EXPO_PUBLIC_API_URL no arquivo mobile/.env.',
    );
  }

  const headers = new Headers(options?.headers);
  headers.set('Accept', 'application/json');
  headers.set('ngrok-skip-browser-warning', 'true');
  const publicAuthRequest = path === '/auth/login' || path === '/auth/register';
  if (authToken && !publicAuthRequest) headers.set('Authorization', `Bearer ${authToken}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiRequestError('Não foi possível conectar ao ClassWatch. Verifique sua conexão e o endereço da API.', 0);
  }

  if (!response.ok) {
    if (response.status === 401 && authToken && !publicAuthRequest) unauthorizedHandler?.();
    let message = `Erro HTTP ${response.status}`;

    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Mantém a mensagem padrão quando a resposta não for JSON.
    }

    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function registerStudent(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(): Promise<UserProfile> {
  return request<UserProfile>('/auth/me');
}

export function getSubjects(): Promise<Subject[]> {
  return request<Subject[]>('/subjects');
}

export function getSubject(id: number): Promise<Subject> {
  return request<Subject>(`/subjects/${id}`);
}

export function createSubject(data: SubjectInput): Promise<Subject> {
  return request<Subject>('/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function updateSubject(id: number, data: SubjectInput): Promise<Subject> {
  return request<Subject>(`/subjects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function archiveSubject(id: number): Promise<Subject> {
  return request<Subject>(`/subjects/${id}/archive`, { method: 'POST' });
}

export function joinSubject(codigoIngresso: string): Promise<Subject> {
  return request<Subject>('/subjects/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigoIngresso }) });
}

export function getSubjectLectures(id: number): Promise<LectureSummary[]> {
  return request<LectureSummary[]>(`/subjects/${id}/lectures`);
}

export function getAvailableSubjectLectures(id: number): Promise<AvailableLectureSummary[]> {
  return request<AvailableLectureSummary[]>(`/subjects/${id}/available-lectures`);
}

export function addExistingLectureToSubject(subjectId: number, lectureId: number): Promise<LectureSummary> {
  return request<LectureSummary>(`/subjects/${subjectId}/lectures/${lectureId}`, { method: 'POST' });
}

export function getLectures(query = ''): Promise<LectureSummary[]> {
  const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  return request<LectureSummary[]>(`/lectures${search}`);
}

export function deleteLecture(id: number): Promise<void> {
  return request<void>(`/lectures/${id}`, { method: 'DELETE' });
}

export function retryLecture(id: number): Promise<LectureSummary> {
  return request<LectureSummary>(`/lectures/${id}/retry`, { method: 'POST' });
}

export function getLecture(id: number): Promise<Lecture> {
  return request<Lecture>(`/lectures/${id}`);
}

export function uploadLecture(
  uri: string,
  titulo: string,
  descricao: string,
  requestId: string,
  subjectId?: number,
): Promise<LectureSummary> {
  const formData = new FormData();

  const file = {
    uri,
    name: 'audio.m4a',
    type: 'audio/m4a',
  };

  formData.append('file', file as unknown as Blob);
  formData.append('titulo', titulo.trim());
  formData.append('descricao', descricao.trim());
  formData.append('requestId', requestId);
  const path = subjectId == null ? '/lectures/upload' : `/subjects/${subjectId}/lectures`;
  return request<LectureSummary>(path, {
    method: 'POST',
    body: formData,
  });
}
