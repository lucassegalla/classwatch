import { useState } from 'react';
import { Button, View, Text } from 'react-native';
import { Audio } from 'expo-av';

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

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

      console.log('Áudio:', uri);
    } catch (err) {
      console.log('Erro ao parar gravação', err);
    }
  }

  return (
    <View style={{ marginTop: 100, alignItems: 'center' }}>
      <Text>Gravação de áudio</Text>

      <Button title="Gravar" onPress={startRecording} />
      <Button title="Parar" onPress={stopRecording} />

      {audioUri && <Text>Áudio gravado!</Text>}
    </View>
  );
}