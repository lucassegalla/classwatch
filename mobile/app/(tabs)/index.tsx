import { useState, useEffect, useRef } from 'react';
import {
  Button,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Asset } from 'expo-asset';

export default function HomeScreen() {
  const [lectureId, setLectureId] = useState<number | null>(null);

  const [status, setStatus] = useState<string>('');
  const [transcricao, setTranscricao] = useState<string>('');
  const [resumo, setResumo] = useState<string>('');

  const [lectures, setLectures] = useState<any[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<any | null>(null);

  const emRequisicao = useRef(false);

  const API = 'http://192.168.100.151:8080';

  // -----------------------------
  // BUSCA STATUS (APENAS NOVO UPLOAD)
  // -----------------------------
  async function buscarStatus(id: number) {
    if (emRequisicao.current) return false;

    emRequisicao.current = true;

    try {
      const response = await fetch(`${API}/lectures/${id}`);
      const data = await response.json();

      setStatus(data.status);

      if (data.status === 'FINALIZADO') {
        setTranscricao(data.transcricao ?? 'Sem transcrição');
        setResumo(data.resumo ?? 'Sem resumo');

        setSelectedLecture(null); // limpa seleção manual

        await carregarLectures();
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
  // POLLING (SÓ PARA UPLOAD)
  // -----------------------------
  useEffect(() => {
    if (!lectureId) return;

    const interval = setInterval(async () => {
      const finalizado = await buscarStatus(lectureId);
      if (finalizado) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [lectureId]);

  // -----------------------------
  // CARREGAR HISTÓRICO
  // -----------------------------
  useEffect(() => {
    carregarLectures();
  }, []);

  async function carregarLectures() {
    try {
      const response = await fetch(`${API}/lectures`);
      const data = await response.json();
      setLectures(data);
    } catch (err) {
      console.log('Erro ao carregar lectures', err);
    }
  }

  // -----------------------------
  // TESTE COM ÁUDIO FIXO
  // -----------------------------
  async function enviarAudioTeste() {
    try {
      setStatus('ENVIANDO');
      setTranscricao('');
      setResumo('');
      setSelectedLecture(null);

      const asset = Asset.fromModule(
        require('../../assets/audio/aula_corte_4min.aac'),
      );

      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;

      const formData = new FormData();

      formData.append('file', {
        uri,
        name: 'aula.aac',
        type: 'audio/aac',
      } as any);

      formData.append('titulo', 'Teste fixo');
      formData.append('descricao', 'arquivo local');

      const response = await fetch(`${API}/lectures/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setLectureId(data.id);
      setStatus(data.status);
    } catch (err) {
      console.log('Erro teste:', err);
    }
  }

  // -----------------------------
  // SELECIONAR HISTÓRICO (SEM POLLING)
  // -----------------------------
  function selecionarLecture(lecture: any) {
    setSelectedLecture(lecture);

    // limpa resultado atual
    setTranscricao('');
    setResumo('');
    setStatus('');
  }

  // -----------------------------
  // DADOS EXIBIDOS
  // -----------------------------
  const transcricaoExibida = selectedLecture?.transcricao ?? transcricao;

  const resumoExibido = selectedLecture?.resumo ?? resumo;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        backgroundColor: '#121212',
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 20,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        ClassWatch
      </Text>

      <Button title="Testar áudio fixo" onPress={enviarAudioTeste} />

      {status !== '' && (
        <Text style={{ color: '#aaa', marginTop: 10 }}>Status: {status}</Text>
      )}

      {status === 'PROCESSANDO' && <ActivityIndicator />}

      {/* RESULTADO */}
      {(transcricaoExibida || resumoExibido) && (
        <View
          style={{
            backgroundColor: '#1e1e1e',
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Transcrição</Text>
          <Text style={{ color: '#ddd' }}>{transcricaoExibida}</Text>

          <Text
            style={{
              color: '#fff',
              fontWeight: 'bold',
              marginTop: 10,
            }}
          >
            Resumo
          </Text>
          <Text style={{ color: '#ddd' }}>{resumoExibido}</Text>
        </View>
      )}

      {/* HISTÓRICO */}
      <View style={{ marginTop: 30 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Histórico</Text>

        {lectures.map((lecture) => (
          <TouchableOpacity
            key={lecture.id}
            onPress={() => selecionarLecture(lecture)}
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 8,
              backgroundColor: '#1e1e1e',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {lecture.titulo}
            </Text>

            <Text style={{ color: '#aaa' }}>Status: {lecture.status}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
