import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { colors, radii, spacing } from '@/constants/theme';
import { getLecture, uploadLecture } from '@/services/api';
import { isTerminalStatus, LectureStatus } from '@/types/lecture';

const SPEECH_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 64_000,
};

type FlowStatus = 'IDLE' | 'GRAVANDO' | 'ENVIANDO' | LectureStatus;

export default function NewLectureScreen() {
  const recorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 500);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<FlowStatus>('IDLE');
  const [lectureId, setLectureId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processing = status === 'ENVIANDO' || status === 'RECEBIDO' || status === 'PROCESSANDO';

  async function startRecording() {
    if (!titulo.trim()) {
      setError('Informe um título antes de começar a gravação.');
      return;
    }

    setError(null);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso ao microfone para gravar a aula.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('GRAVANDO');
    } catch (caught) {
      setError(messageFrom(caught, 'Não foi possível iniciar a gravação.'));
    }
  }

  async function stopAndUpload() {
    setError(null);
    try {
      await recorder.stop();
      setStatus('ENVIANDO');

      if (!recorder.uri) {
        throw new Error('O arquivo gravado não foi encontrado.');
      }

      const lecture = await uploadLecture(recorder.uri, titulo.trim(), descricao.trim());
      setLectureId(lecture.id);
      setStatus(lecture.status);
    } catch (caught) {
      setStatus('IDLE');
      setError(messageFrom(caught, 'Não foi possível enviar o áudio.'));
    }
  }

  useEffect(() => {
    if (!lectureId) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const lecture = await getLecture(lectureId!);
        if (cancelled) return;

        setStatus(lecture.status);
        if (lecture.status === 'FINALIZADO') {
          router.replace({ pathname: '/lecture/[id]', params: { id: lecture.id.toString() } });
          return;
        }
        if (lecture.status === 'ERRO') {
          setError(lecture.errorMessage ?? 'O processamento da aula falhou.');
          return;
        }
      } catch (caught) {
        if (!cancelled) {
          setError(messageFrom(caught, 'Não foi possível consultar o processamento.'));
        }
      }

      if (!cancelled) {
        timeout = setTimeout(() => void poll(), 3_000);
      }
    }

    if (!isTerminalStatus(status as LectureStatus)) {
      timeout = setTimeout(() => void poll(), 1_000);
    }

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [lectureId, status]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>CAPTURA DE ÁUDIO</Text>
          <Text style={styles.title}>Prepare sua aula</Text>
          <Text style={styles.subtitle}>
            Dê um nome ao conteúdo e mantenha o celular próximo de quem estiver falando.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            editable={!processing && status !== 'GRAVANDO'}
            maxLength={120}
            onChangeText={setTitulo}
            placeholder="Ex.: Estruturas de dados"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={titulo}
          />

          <Text style={[styles.label, styles.descriptionLabel]}>Descrição</Text>
          <TextInput
            editable={!processing && status !== 'GRAVANDO'}
            maxLength={500}
            multiline
            onChangeText={setDescricao}
            placeholder="Professor, assunto ou observações"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
            value={descricao}
          />
        </View>

        {status !== 'IDLE' ? (
          <View style={styles.statusCard}>
            <View>
              <Text style={styles.statusCaption}>STATUS DA AULA</Text>
              {status === 'GRAVANDO' ? (
                <View style={styles.recordingStatus}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Gravando</Text>
                </View>
              ) : status === 'ENVIANDO' ? (
                <Text style={styles.sendingText}>Enviando áudio</Text>
              ) : (
                <StatusBadge status={status} />
              )}
            </View>
            {status === 'GRAVANDO' ? (
              <Text style={styles.timer}>{formatDuration(recorderState.durationMillis)}</Text>
            ) : processing ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons color={colors.danger} name="error-outline" size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {status === 'GRAVANDO' ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => void stopAndUpload()} style={styles.stopButton}>
            <View style={styles.stopIcon} />
            <Text style={styles.stopButtonText}>Finalizar e enviar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={processing}
            onPress={() => void startRecording()}
            style={[styles.recordButton, processing && styles.buttonDisabled]}>
            <MaterialIcons color={colors.background} name="mic" size={24} />
            <Text style={styles.recordButtonText}>
              {processing ? 'Aguarde o processamento' : 'Iniciar gravação'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.tip}>
          <MaterialIcons color={colors.textSubtle} name="info-outline" size={18} />
          <Text style={styles.tipText}>
            A transcrição continua sendo processada mesmo se você sair desta tela.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatDuration(milliseconds = 0) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  intro: { marginBottom: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.7, marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.large,
    borderWidth: 1,
    padding: spacing.md,
  },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  descriptionLabel: { marginTop: spacing.md },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.medium,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textArea: { height: 104 },
  statusCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.medium,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    padding: spacing.md,
  },
  statusCaption: { color: colors.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  recordingStatus: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  recordingDot: { backgroundColor: colors.danger, borderRadius: 6, height: 11, width: 11 },
  recordingText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  sendingText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  timer: { color: colors.text, fontSize: 25, fontVariant: ['tabular-nums'], fontWeight: '700' },
  errorBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251, 113, 133, 0.10)',
    borderColor: 'rgba(251, 113, 133, 0.32)',
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
    padding: 13,
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 13, lineHeight: 19 },
  recordButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: 17,
  },
  recordButtonText: { color: colors.background, fontSize: 16, fontWeight: '800' },
  stopButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: 11,
    justifyContent: 'center',
    marginTop: spacing.lg,
    padding: 17,
  },
  stopIcon: { backgroundColor: colors.white, borderRadius: 3, height: 15, width: 15 },
  stopButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.55 },
  tip: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginTop: spacing.md, paddingHorizontal: 4 },
  tipText: { color: colors.textSubtle, flex: 1, fontSize: 12, lineHeight: 18 },
});
