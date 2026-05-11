import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function LectureDetails() {
  const { id } = useLocalSearchParams();

  const [lecture, setLecture] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const API = 'https://carol-snowbound-smite.ngrok-free.dev';
  //const API = 'http://192.168.100.151:8080';

  useEffect(() => {
    carregarLecture();
  }, []);

  async function carregarLecture() {
    try {
      const response = await fetch(`${API}/lectures/${id}`);
      const data = await response.json();

      setLecture(data);
    } catch (err) {
      console.log('Erro ao carregar lecture:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#121212',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        backgroundColor: '#121212',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 10,
        }}
      >
        {lecture?.titulo}
      </Text>

      <Text
        style={{
          color: '#aaa',
          marginBottom: 20,
        }}
      >
        Status: {lecture?.status}
      </Text>

      {/* RESUMO */}
      <View
        style={{
          backgroundColor: '#1e1e1e',
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontWeight: 'bold',
            marginBottom: 10,
          }}
        >
          Resumo
        </Text>

        <Text
          style={{
            color: '#ddd',
            lineHeight: 22,
          }}
        >
          {lecture?.resumo || 'Sem resumo'}
        </Text>
      </View>

      {/* TRANSCRIÇÃO */}
      <View
        style={{
          backgroundColor: '#1e1e1e',
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontWeight: 'bold',
            marginBottom: 10,
          }}
        >
          Transcrição
        </Text>

        <Text
          style={{
            color: '#ddd',
            lineHeight: 22,
          }}
        >
          {lecture?.transcricao || 'Sem transcrição'}
        </Text>
      </View>
    </ScrollView>
  );
}
