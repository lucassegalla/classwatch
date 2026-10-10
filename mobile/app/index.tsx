import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>ClassWatch</Text>
        <Text style={styles.subtitle}>
          Grave uma aula e transforme o áudio em transcrição e resumo para estudo.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/lecture/new')}
        style={styles.primaryCard}
      >
        <Text style={styles.cardTitle}>Nova aula</Text>
        <Text style={styles.cardText}>Gravar e processar uma nova aula</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/history')}
        style={styles.card}
      >
        <Text style={styles.cardTitle}>Histórico</Text>
        <Text style={styles.cardText}>Acessar aulas já processadas</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 42,
  },
  brand: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#a3a3a3',
    fontSize: 16,
    lineHeight: 24,
  },
  primaryCard: {
    backgroundColor: '#2563eb',
    padding: 22,
    borderRadius: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 22,
    borderRadius: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  cardText: {
    color: '#d4d4d4',
    marginTop: 6,
    fontSize: 14,
  },
});
