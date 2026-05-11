import { useState, useRef, useEffect } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Audio } from 'expo-av';
import { router } from 'expo-router';

export default function NewLectureScreen() {
  const API = 'https://carol-snowbound-smite.ngrok-free.dev';
  //const API = 'http://192.168.100.151:8080';

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');

  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [status, setStatus] = useState('');

  const [lectureId, setLectureId] = useState<number | null>(null);

  const emRequisicao = useRef(false);

  // -----------------------------
  // INICIAR GRAVAÇÃO
  // -----------------------------
  async function iniciarGravacao() {
    try {
      await Audio.requestPermissionsAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(recording);

      setStatus('GRAVANDO');
    } catch (err) {
      console.log('Erro gravação:', err);
    }
  }

  // -----------------------------
  // FINALIZAR
  // -----------------------------
  async function finalizarGravacao() {
    try {
      if (!recording) return;

      setStatus('ENVIANDO');

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();

      setRecording(null);

      if (uri) {
        await enviarAudio(uri);
      }
    } catch (err) {
      console.log('Erro finalizar:', err);
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

      formData.append('titulo', titulo);
      formData.append('descricao', descricao);

      const response = await fetch(`${API}/lectures/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setLectureId(data.id);

      setStatus(data.status);
    } catch (err) {
      console.log('Erro upload:', err);
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
  // STATUS PROCESSAMENTO
  // -----------------------------
  async function buscarStatus(id: number) {
    if (emRequisicao.current) return false;

    emRequisicao.current = true;

    try {
      const response = await fetch(`${API}/lectures/${id}`);

      const data = await response.json();

      setStatus(data.status);

      if (data.status === 'FINALIZADO') {
        router.replace({
          pathname: '/lecture/[id]',
          params: {
            id: id.toString(),
          },
        });

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
  // UI
  // -----------------------------
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 20,
        }}
      >
        Nova Aula
      </Text>

      {/* TÍTULO */}
      <TextInput
        placeholder="Título da aula"
        placeholderTextColor="#777"
        value={titulo}
        onChangeText={setTitulo}
        style={{
          backgroundColor: '#1e1e1e',
          color: '#fff',
          padding: 15,
          borderRadius: 10,
          marginBottom: 15,
        }}
      />

      {/* DESCRIÇÃO */}
      <TextInput
        placeholder="Descrição"
        placeholderTextColor="#777"
        value={descricao}
        onChangeText={setDescricao}
        multiline
        style={{
          backgroundColor: '#1e1e1e',
          color: '#fff',
          padding: 15,
          borderRadius: 10,
          height: 100,
          marginBottom: 20,
          textAlignVertical: 'top',
        }}
      />

      {/* STATUS */}
      {status !== '' && (
        <Text
          style={{
            color: '#aaa',
            marginBottom: 20,
          }}
        >
          Status: {status}
        </Text>
      )}

      {status === 'PROCESSANDO' && <ActivityIndicator />}

      {/* BOTÕES */}
      {!recording ? (
        <TouchableOpacity
          onPress={iniciarGravacao}
          style={{
            backgroundColor: '#2563eb',
            padding: 18,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 18,
            }}
          >
            Iniciar Gravação
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={finalizarGravacao}
          style={{
            backgroundColor: '#dc2626',
            padding: 18,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 18,
            }}
          >
            Finalizar Gravação
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
