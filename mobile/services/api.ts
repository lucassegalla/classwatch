import { Platform } from 'react-native';

import type { Lecture } from '@/types/lecture';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

interface ProblemDetail {
  detail?: string;
  message?: string;
  title?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: T | ProblemDetail | null = null;

    if (raw) {
      try {
        data = JSON.parse(raw) as T | ProblemDetail;
      } catch {
        data = { detail: raw };
      }
    }

    if (!response.ok) {
      const problem = data as ProblemDetail | null;
      throw new ApiError(
        problem?.detail ?? problem?.message ?? problem?.title ?? 'Não foi possível concluir a operação.',
        response.status,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('A conexão demorou mais que o esperado.');
    }
    throw new ApiError('Não foi possível conectar ao servidor.');
  } finally {
    clearTimeout(timeout);
  }
}

function audioMetadata(uri: string) {
  const extension =
    Platform.OS === 'web' ? 'webm' : uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'm4a';
  const mimeTypes: Record<string, string> = {
    m4a: 'audio/m4a',
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    '3gp': 'audio/3gpp',
  };

  return {
    name: `aula.${extension}`,
    type: mimeTypes[extension] ?? 'application/octet-stream',
  };
}

export function listLectures() {
  return request<Lecture[]>('/lectures');
}

export function getLecture(id: number) {
  return request<Lecture>(`/lectures/${id}`);
}

export function uploadLecture(uri: string, titulo: string, descricao: string) {
  const metadata = audioMetadata(uri);
  const formData = new FormData();
  const file = { uri, ...metadata };

  formData.append('file', file as unknown as Blob);
  formData.append('titulo', titulo);
  formData.append('descricao', descricao);

  return request<Lecture>(
    '/lectures/upload',
    {
      method: 'POST',
      body: formData,
    },
    5 * 60_000,
  );
}
