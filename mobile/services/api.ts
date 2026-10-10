import type { Lecture } from '@/types/lecture';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const API_URL = rawApiUrl?.replace(/\/+$/, '');

interface ApiErrorBody {
  message?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error(
      'API não configurada. Defina EXPO_PUBLIC_API_URL no arquivo mobile/.env.',
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;

    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Mantém a mensagem padrão quando a resposta não for JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getLectures(): Promise<Lecture[]> {
  return request<Lecture[]>('/lectures');
}

export function getLecture(id: number): Promise<Lecture> {
  return request<Lecture>(`/lectures/${id}`);
}

export function uploadLecture(
  uri: string,
  titulo: string,
  descricao: string,
): Promise<Lecture> {
  const formData = new FormData();

  const file = {
    uri,
    name: 'audio.m4a',
    type: 'audio/m4a',
  };

  formData.append('file', file as unknown as Blob);
  formData.append('titulo', titulo.trim());
  formData.append('descricao', descricao.trim());

  return request<Lecture>('/lectures/upload', {
    method: 'POST',
    body: formData,
  });
}
