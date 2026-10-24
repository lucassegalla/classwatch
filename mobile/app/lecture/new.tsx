import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, type AudioRecorder } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';

import { getLecture, retryLecture, uploadLecture } from '@/services/api';
import { clearPendingRecording, createRequestId, loadPendingRecording, savePendingRecording } from '@/services/pendingRecording';
import { useClassWatchTheme } from '@/services/theme';

type ScreenStatus = 'IDLE' | 'GRAVANDO' | 'PAUSADA' | 'PRONTO' | 'ENVIANDO' | 'PROCESSANDO' | 'ERRO';

const STATUS_LABEL: Record<Exclude<ScreenStatus, 'IDLE' | 'ERRO'>, string> = {
  GRAVANDO: 'Gravando aula...',
  PAUSADA: 'Gravação pausada',
  PRONTO: 'Gravação pronta para envio',
  ENVIANDO: 'Enviando áudio...',
  PROCESSANDO: 'Transcrevendo e organizando a aula...',
};

export default function NewLectureScreen() {
  const params = useLocalSearchParams<{ subjectId?: string; subjectName?: string }>();
  const paramSubjectId = params.subjectId && Number.isInteger(Number(params.subjectId)) ? Number(params.subjectId) : null;
  const paramSubjectName = typeof params.subjectName === 'string' ? params.subjectName : null;
  const { colors } = useClassWatchTheme();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<ScreenStatus>('IDLE');
  const [lectureId, setLectureId] = useState<number | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingSubjectId, setRecordingSubjectId] = useState<number | null>(paramSubjectId);
  const [recordingSubjectName, setRecordingSubjectName] = useState<string | null>(paramSubjectName);
  const [error, setError] = useState<string | null>(null);
  const emRequisicao = useRef(false);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const draftRef = useRef({ titulo, descricao, subjectId: recordingSubjectId, subjectName: recordingSubjectName });
  draftRef.current = { titulo, descricao, subjectId: recordingSubjectId, subjectName: recordingSubjectName };

  useEffect(() => () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;
    void activeRecording.stop().then(() => {
      const uri = activeRecording.uri;
      if (uri && draftRef.current.titulo.trim()) {
        savePendingRecording(uri, { titulo: draftRef.current.titulo.trim(), descricao: draftRef.current.descricao.trim(), requestId: createRequestId(), subjectId: draftRef.current.subjectId, subjectName: draftRef.current.subjectName });
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void loadPendingRecording().then((pending) => {
      if (!active || !pending) return;
      setAudioUri(pending.uri);
      setRequestId(pending.requestId);
      setTitulo(pending.titulo);
      setDescricao(pending.descricao);
      setRecordingSubjectId(pending.subjectId ?? null);
      setRecordingSubjectName(pending.subjectName ?? null);
      setStatus('PRONTO');
    });
    return () => { active = false; };
  }, []);

  const busy = status === 'ENVIANDO' || status === 'PROCESSANDO';

  useEffect(() => {
    if (status !== 'GRAVANDO') return;
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  async function iniciarGravacao() {
    if (busy || recording || audioUri) return;

    if (!titulo.trim()) {
      setError('Informe um título antes de iniciar a gravação.');
      return;
    }

    setError(null);

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setError('Permissão de microfone negada. Libere o acesso ao microfone para gravar.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecording(true);
      recordingRef.current = audioRecorder;
      setStatus('GRAVANDO');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar a gravação.');
      setStatus('ERRO');
    }
  }

  async function finalizarGravacao() {
    if (!recording) return;

    setError(null);
    setStatus('PAUSADA');

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      setRecording(false);
      recordingRef.current = null;

      if (!uri) {
        throw new Error('O aplicativo não conseguiu acessar o áudio gravado.');
      }

      const idempotencyKey = createRequestId();
      const persistentUri = savePendingRecording(uri, { titulo: titulo.trim(), descricao: descricao.trim(), requestId: idempotencyKey, subjectId: recordingSubjectId, subjectName: recordingSubjectName });
      setAudioUri(persistentUri);
      setRequestId(idempotencyKey);
      setStatus('PRONTO');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o áudio.');
      setStatus('ERRO');
    }
  }

  async function enviarAudio() {
    if (!audioUri || emRequisicao.current) return;
    emRequisicao.current = true;
    setError(null);
    setStatus('ENVIANDO');
    try {
      const lecture = await uploadLecture(audioUri, titulo, descricao, requestId ?? createRequestId(), recordingSubjectId ?? undefined);
      setLectureId(lecture.id);
      setAudioUri(null);
      setStatus('PROCESSANDO');
      try { clearPendingRecording(); } catch { /* Reenvio com o mesmo requestId não cria outra aula. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o áudio.');
      setStatus('PRONTO');
    } finally {
      emRequisicao.current = false;
    }
  }

  async function alternarPausa() {
    if (!recording) return;
    try {
      if (status === 'GRAVANDO') {
        audioRecorder.pause();
        setStatus('PAUSADA');
      } else if (status === 'PAUSADA') {
        audioRecorder.record();
        setStatus('GRAVANDO');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o estado da gravação.');
    }
  }

  useEffect(() => {
    if (!lectureId || status !== 'PROCESSANDO') return;

    const currentLectureId = lectureId;
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (!active || emRequisicao.current) return;

      emRequisicao.current = true;

      try {
        const lecture = await getLecture(currentLectureId);

        if (!active) return;

        setError(null);

        if (lecture.status === 'FINALIZADO') {
          router.replace({
            pathname: '/lecture/[id]',
            params: { id: currentLectureId.toString() },
          });
          return;
        }

        if (lecture.status === 'ERRO') {
          setError(
            lecture.erroProcessamento ||
              'O processamento da aula falhou. Você pode tentar gravar novamente.',
          );
          setStatus('ERRO');
          return;
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? `${err.message} O aplicativo continuará tentando.`
              : 'Falha ao consultar o processamento. O aplicativo continuará tentando.',
          );
        }
      } finally {
        emRequisicao.current = false;
      }

      if (active) {
        timeout = setTimeout(() => void poll(), 3000);
      }
    }

    timeout = setTimeout(() => void poll(), 1000);

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [lectureId, status]);

  function resetar() {
    if (recording) {
      void recordingRef.current?.stop().catch(() => undefined).finally(() => { setRecording(false); recordingRef.current = null; });
    }
    try { clearPendingRecording(); } catch { /* Arquivo órfão local não é enviado sem metadados. */ }
    setLectureId(null);
    setAudioUri(null);
    setRequestId(null);
    setStatus('IDLE');
    setError(null);
    setElapsedSeconds(0);
  }

  async function reprocessarAula() {
    if (!lectureId || emRequisicao.current) return;
    emRequisicao.current = true;
    setStatus('ENVIANDO');
    setError(null);
    try {
      await retryLecture(lectureId);
      setStatus('PROCESSANDO');
    } catch (err) {
      setStatus('ERRO');
      setError(err instanceof Error ? err.message : 'Não foi possível reprocessar a aula.');
    } finally { emRequisicao.current = false; }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Nova aula</Text>
      {recordingSubjectId ? <Text style={[styles.subjectNote, { color: colors.primary }]}>Matéria: {recordingSubjectName || 'selecionada'}</Text> : null}

      <TextInput
        placeholder="Título da aula"
        placeholderTextColor="#737373"
        value={titulo}
        onChangeText={setTitulo}
        editable={!busy && status !== 'GRAVANDO' && status !== 'PAUSADA' && !audioUri}
        maxLength={150}
        style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
      />

      <TextInput
        placeholder="Descrição (opcional)"
        placeholderTextColor="#737373"
        value={descricao}
        onChangeText={setDescricao}
        editable={!busy && status !== 'GRAVANDO' && status !== 'PAUSADA' && !audioUri}
        maxLength={1000}
        multiline
        style={[styles.input, styles.descriptionInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border, borderWidth: 1 }]}
      />

      {status !== 'IDLE' && status !== 'ERRO' ? (
        <View style={[styles.statusBox, { backgroundColor: colors.surface }]}>
          {busy ? <ActivityIndicator color="#315ce7" /> : <View style={styles.recordingDot} />}
          <Text style={[styles.statusText, { color: colors.text }]}>{STATUS_LABEL[status]}{status === 'GRAVANDO' || status === 'PAUSADA' ? `  •  ${Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}` : ''}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.errorSurface }]}>
          <Text style={[styles.errorText, { color: colors.errorText }]}>{error}</Text>
        </View>
      ) : null}

      {status === 'IDLE' ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => void iniciarGravacao()}
          style={styles.primaryButton}
        >
          <Text style={styles.buttonText}>Iniciar gravação</Text>
        </TouchableOpacity>
      ) : null}

      {status === 'GRAVANDO' || status === 'PAUSADA' ? (
        <View style={styles.actions}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => void alternarPausa()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{status === 'GRAVANDO' ? 'Pausar' : 'Retomar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => void finalizarGravacao()} style={styles.stopButton}>
            <Text style={styles.buttonText}>Finalizar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {status === 'PRONTO' ? (
        <View style={styles.actions}>
        <TouchableOpacity activeOpacity={0.8} onPress={resetar} style={[styles.secondaryButton, { backgroundColor: colors.border }]}>
            <Text style={styles.secondaryText}>Descartar</Text>
          </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={() => void enviarAudio()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText}>Enviar gravação</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {status === 'ERRO' ? (
        <TouchableOpacity activeOpacity={0.8} onPress={() => audioUri ? void enviarAudio() : lectureId ? void reprocessarAula() : resetar()} style={[styles.secondaryButton, { backgroundColor: colors.border }]}>
          <Text style={styles.secondaryText}>{audioUri ? 'Reenviar gravação' : lectureId ? 'Reprocessar aula' : 'Tentar novamente'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  subjectNote: { fontWeight: '700', marginBottom: 14 },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 14,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusBox: {
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  statusText: {
    flex: 1,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  errorBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#315ce7',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#e8ebf3',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryText: { color: '#25304a', fontWeight: '700', fontSize: 16 },
});
