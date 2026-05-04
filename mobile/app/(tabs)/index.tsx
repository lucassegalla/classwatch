import { useState, useEffect, useRef } from 'react';
import { Button, View, Text } from 'react-native';
import { Audio } from 'expo-av';

export default function HomeScreen() {

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const [lectureId, setLectureId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [transcricao, setTranscricao] = useState<string>('');

  const emRequisicao = useRef(false);

  // -----------------------------
  // BUSCA STATUS (POLLING)
  // -----------------------------
  async function buscarStatus(id: number) {
    if (emRequisicao.current) return false;

    emRequisicao.current = true;

    try {
      const response = await fetch(
        `http://192.168.100.151:8080/lectures/${id}`
      );

      const data = await response.json();

      console.log("Status:", data.status);

      setStatus(data.status);

      if (data.status === 'FINALIZADO') {
        setTranscricao(data.transcricao ?? 'Transcrição não retornada');
        return true;
      }

      return false;

    } catch (err) {
      console.log('Erro status:', err);
      return false;

    } finally {
      emRequisicao.current = false;
    }
  }

  // -----------------------------
  // POLLING
  // -----------------------------
  useEffect(() => {
    if (!lectureId) return;

    const interval = setInterval(async () => {
      const finalizado = await buscarStatus(lectureId);

      if (finalizado) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);

  }, [lectureId]);

  // -----------------------------
  // GRAVAÇÃO
  // -----------------------------
  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);

    } catch (err) {
      console.log('Erro ao iniciar gravação', err);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecording(null);
      setAudioUri(uri || null);

      if (uri) {
        await enviarAudio(uri);
      }

    } catch (err) {
      console.log('Erro ao parar gravação', err);
    }
  }

  // -----------------------------
  // UPLOAD
  // -----------------------------
  async function enviarAudio(uri: string) {
    try {
      const formData = new FormData();

      formData.append('file', {
        uri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as any);

      formData.append('titulo', 'Aula mobile');
      formData.append('descricao', 'gravado no app');

      const response = await fetch(
        'http://192.168.100.151:8080/lectures/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      console.log("Resposta:", data);

      setLectureId(data.id);
      setStatus(data.status);

    } catch (err) {
      console.log("Erro upload:", err);
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <View style={{ marginTop: 100, alignItems: 'center' }}>

      <Text>Gravação de áudio</Text>

      <Button title="Gravar" onPress={startRecording} />
      <Button title="Parar" onPress={stopRecording} />

      {audioUri && <Text>Áudio gravado!</Text>}

      {status !== '' && <Text>Status: {status}</Text>}

      {transcricao ? (
        <Text style={{ marginTop: 20 }}>
          {transcricao}
        </Text>
      ) : null}

    </View>
  );
}