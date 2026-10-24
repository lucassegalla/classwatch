import { Directory, File, Paths } from 'expo-file-system';

const directory = new Directory(Paths.document, 'pending-recording');
const audioFile = new File(directory, 'lecture.m4a');
const metadataFile = new File(directory, 'lecture.json');

export interface PendingRecording {
  uri: string;
  titulo: string;
  descricao: string;
  requestId: string;
  subjectId?: number | null;
  subjectName?: string | null;
}

export function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function savePendingRecording(sourceUri: string, metadata: Omit<PendingRecording, 'uri'>) {
  directory.create({ idempotent: true, intermediates: true });
  if (audioFile.exists) audioFile.delete();
  new File(sourceUri).move(audioFile);
  metadataFile.create({ overwrite: true, intermediates: true });
  metadataFile.write(JSON.stringify(metadata));
  return audioFile.uri;
}

export async function loadPendingRecording(): Promise<PendingRecording | null> {
  if (!metadataFile.exists || !audioFile.exists) return null;
  try {
    const metadata = JSON.parse(await metadataFile.text()) as Omit<PendingRecording, 'uri'>;
    if (!metadata.titulo || !metadata.requestId) return null;
    return { ...metadata, uri: audioFile.uri };
  } catch {
    return null;
  }
}

export function clearPendingRecording() {
  if (metadataFile.exists) metadataFile.delete();
  if (audioFile.exists) audioFile.delete();
}
