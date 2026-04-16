package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class LectureService {

    private final LectureRepository repository;

    public LectureService(LectureRepository repository) {
        this.repository = repository;
    }

    private String executarPython(String caminhoAudio) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "python",
                    "C:\\Users\\Usuario\\Documents\\Projetos\\classwatch\\ai\\transcricao.py",
                    caminhoAudio
            );

            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream())
            );

            StringBuilder resultado = new StringBuilder();
            String linha;

            while ((linha = reader.readLine()) != null) {
                resultado.append(linha).append("\n");
            }

            process.waitFor();

            return resultado.toString();

        } catch (Exception e) {
            e.printStackTrace();
            return "Erro ao transcrever";
        }
    }

    private String transcreverAudio(String caminhoAudio) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "C:\\Users\\Usuario\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
                    "C:\\Users\\Usuario\\Documents\\Projetos\\classwatch\\ai\\transcricao.py",
                    caminhoAudio
            );

            processBuilder.redirectErrorStream(false);
            Process process = processBuilder.start();

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8)
            );

            BufferedReader errorReader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8)
            );

            while (errorReader.readLine() != null) {
                // pode ignorar ou logar
            }

            StringBuilder output = new StringBuilder();
            String linha;

            while ((linha = reader.readLine()) != null) {
                output.append(linha).append("\n");
            }

            process.waitFor();

            return output.toString().trim();

        } catch (Exception e) {
            e.printStackTrace();
            return "Erro na transcrição";
        }
    }

    public Lecture salvar(Lecture lecture) {

        // 1. Transcreve o áudio
        String transcricao = transcreverAudio(lecture.getAudioPath());

        // 2. Salva no objeto
        lecture.setTranscricao(transcricao);

        // 3. (opcional) resumo placeholder
        lecture.setResumo("Resumo automático (placeholder)");

        // 4. Salva no banco
        return repository.save(lecture);
    }

    public List<Lecture> listar() {
        return repository.findAll();
    }

    public Lecture atualizar(Long id, Lecture novaLecture) {
        Lecture lectureExistente = repository.findById(id).orElse(null);

        if (lectureExistente == null) {
            return null;
        }

        // Atualiza os campos
        lectureExistente.setTitulo(novaLecture.getTitulo());
        lectureExistente.setDescricao(novaLecture.getDescricao());
        lectureExistente.setAudioPath(novaLecture.getAudioPath());
        lectureExistente.setTranscricao(novaLecture.getTranscricao());
        lectureExistente.setResumo(novaLecture.getResumo());

        return repository.save(lectureExistente);
    }

}