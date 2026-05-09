import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 32,
          fontWeight: 'bold',
          marginBottom: 40,
          textAlign: 'center',
        }}
      >
        ClassWatch
      </Text>

      {/* NOVA AULA */}
      <TouchableOpacity
        onPress={() => router.push('/lecture/new')}
        style={{
          backgroundColor: '#1e1e1e',
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: 'bold',
          }}
        >
          Nova Aula
        </Text>

        <Text
          style={{
            color: '#aaa',
            marginTop: 5,
          }}
        >
          Gravar uma nova aula
        </Text>
      </TouchableOpacity>

      {/* HISTÓRICO */}
      <TouchableOpacity
        onPress={() => router.push('/history')}
        style={{
          backgroundColor: '#1e1e1e',
          padding: 20,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: 'bold',
          }}
        >
          Histórico
        </Text>

        <Text
          style={{
            color: '#aaa',
            marginTop: 5,
          }}
        >
          Ver aulas salvas
        </Text>
      </TouchableOpacity>
    </View>
  );
}
