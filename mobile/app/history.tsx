import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { router } from 'expo-router';

export default function HistoryScreen() {
  const [lectures, setLectures] = useState<any[]>([]);

  const API = 'http://192.168.100.151:8080';

  useEffect(() => {
    carregarLectures();
  }, []);

  async function carregarLectures() {
    try {
      const response = await fetch(`${API}/lectures`);
      const data = await response.json();

      setLectures(data);
    } catch (err) {
      console.log('Erro ao carregar histórico:', err);
    }
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
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 20,
        }}
      >
        Histórico
      </Text>

      {lectures.map((lecture) => (
        <TouchableOpacity
          key={lecture.id}
          onPress={() =>
            router.push({
              pathname: '/lecture/[id]',
              params: { id: lecture.id.toString() },
            })
          }
          style={{
            backgroundColor: '#1e1e1e',
            padding: 15,
            borderRadius: 12,
            marginBottom: 15,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            {lecture.titulo}
          </Text>

          <Text
            style={{
              color: '#aaa',
              marginTop: 5,
            }}
          >
            {lecture.descricao}
          </Text>

          <Text
            style={{
              color: '#666',
              marginTop: 10,
            }}
          >
            Status: {lecture.status}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
