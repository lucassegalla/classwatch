import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { router } from 'expo-router';

import { getLecture, uploadLecture } from '@/services/api';

type ScreenStatus = 'IDLE' | 'GRAVANDO' | 'ENVIANDO' | 'PROCESSANDO' | 'ERRO';

const STATUS_LABEL: Record<Exclude<ScreenStatus, 'IDLE' | 'ERRO'>, string> = {
  GRAVANDO: 'Gravando aula...',
  ENVIANDO: 'Enviando áudio...',
  PROCESSANDO: 'Transcrevendo e organizando a aula...',
};

export default function NewLectureScreen() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [status, setStatus] = useState<ScreenStatus>('IDLE');
  const [lectureId, setLectureId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emRequisicao = useRef(false);

  const busy = status === 'ENVIANDO' || status === 'PROCESSANDO';

  async function iniciarGravacao() {
    if (busy || recording) return;

    if (!titulo.trim()) {
      setError('Informe um título antes de iniciar a gravação.');
      return;
    }

    setError(null);

    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        setError('Permissão de microfone negada. Libere o acesso ao microfone para gravar.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const result = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(result.recording);
      setStatus('GRAVANDO');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar a gravação.');
      setStatus('ERRO');
    }
  }

  async function finalizarGravacao() {
    if (!recording) return;

    setError(null);
    setStatus('ENVIANDO');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('O aplicativo não conseguiu acessar o áudio gravado.');
      }

      const lecture = await uploadLecture(uri, titulo, descricao);
      setLectureId(lecture.id);
      setStatus('PROCESSANDO');
    } catch (err) {
      setRecording(null);
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o áudio.');
      setStatus('ERRO');
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
    setLectureId(null);
    setStatus('IDLE');
    setError(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova aula</Text>
      <Text style={styles.subtitle}>
        Dê um nome para a aula, grave o conteúdo e aguarde o processamento automático.
      </Text>

      <TextInput
        placeholder="Título da aula"
        placeholderTextColor="#737373"
        value={titulo}
        onChangeText={setTitulo}
        editable={!busy && status !== 'GRAVANDO'}
        maxLength={150}
        style={styles.input}
      />

      <TextInput
        placeholder="Descrição (opcional)"
        placeholderTextColor="#737373"
        value={descricao}
        onChangeText={setDescricao}
        editable={!busy && status !== 'GRAVANDO'}
        maxLength={1000}
        multiline
        style={[styles.input, styles.descriptionInput]}
      />

      {status !== 'IDLE' && status !== 'ERRO' ? (
        <View style={styles.statusBox}>
          {busy ? <ActivityIndicator /> : <View style={styles.recordingDot} />}
          <Text style={styles.statusText}>{STATUS_LABEL[status]}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
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

      {status === 'GRAVANDO' ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => void finalizarGravacao()}
          style={styles.stopButton}
        >
          <Text style={styles.buttonText}>Finalizar gravação</Text>
        </TouchableOpacity>
      ) : null}

      {status === 'ERRO' ? (
        <TouchableOpacity activeOpacity={0.8} onPress={resetar} style={styles.secondaryButton}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#a3a3a3',
    lineHeight: 21,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
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
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  statusText: {
    color: '#d4d4d4',
    flex: 1,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  errorBox: {
    backgroundColor: '#2a1717',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: '#fecaca',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
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
    backgroundColor: '#262626',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
});
