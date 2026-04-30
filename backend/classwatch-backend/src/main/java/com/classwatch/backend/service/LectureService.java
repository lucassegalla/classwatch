package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

/*
 * Camada de regra de negócio
 * Responsável por:
 * - salvar lectures
 * - gerenciar upload de áudio
 * - iniciar processamento assíncrono
 */
@Service
public class LectureService {

    private final LectureRepository repository;
    private final TranscriptionService transcriptionService;

    /*
     * Injeção de dependência
     */
    public LectureService(LectureRepository repository,
                          TranscriptionService transcriptionService) {
        this.repository = repository;
        this.transcriptionService = transcriptionService;
    }

    /*
     * Cria uma nova lecture (sem upload direto)
     * Usado quando o frontend já manda um audioPath (caso antigo/teste)
     */
    public Lecture salvar(Lecture lecture) {

        // Define status inicial
        lecture.setStatus("PROCESSANDO");

        // Salva no banco
        Lecture salva = repository.save(lecture);

        // Dispara processamento em background
        transcriptionService.processar(salva);

        // Retorna imediatamente (não espera IA)
        return salva;
    }

    /*
     * Novo fluxo correto: upload de arquivo real
     */
    public Lecture salvarComArquivo(MultipartFile file, String titulo, String descricao) {

        try {
            /*
             * 1. Validação básica
             */
            if (file.isEmpty()) {
                throw new RuntimeException("Arquivo vazio");
            }

            /*
             * 2. Garante nome seguro
             */
            String original = file.getOriginalFilename() != null
                    ? file.getOriginalFilename()
                    : "audio.aac";

            String nomeArquivo = UUID.randomUUID() + "_" + original;

            /*
             * 3. Define pasta de upload (dinâmica)
             */
            String pasta = System.getProperty("user.dir") + "/uploads/";
            File diretorio = new File(pasta);

            if (!diretorio.exists()) {
                diretorio.mkdirs();
            }

            /*
             * 4. Caminho final do arquivo
             */
            String caminhoCompleto = pasta + nomeArquivo;
            File destino = new File(caminhoCompleto);

            /*
             * 5. Salva arquivo no disco
             */
            file.transferTo(destino);

            /*
             * 6. Cria entidade Lecture
             */
            Lecture lecture = new Lecture();
            lecture.setTitulo(titulo);
            lecture.setDescricao(descricao);
            lecture.setAudioPath(destino.getAbsolutePath());
            lecture.setStatus("PROCESSANDO");

            /*
             * 7. Salva no banco
             */
            Lecture salva = repository.save(lecture);

            /*
             * 8. Inicia processamento assíncrono
             */
            transcriptionService.processar(salva);

            /*
             * 9. Retorna imediatamente
             */
            return salva;

        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Erro ao salvar arquivo");
        }
    }

    /*
     * Lista todas as lectures
     */
    public List<Lecture> listar() {
        return repository.findAll();
    }

    public Lecture buscarPorId(Long id) {
        return repository.findById(id).orElse(null);
    }

    /*
     * Atualiza uma lecture existente
     */
    public Lecture atualizar(Long id, Lecture novaLecture) {

        Lecture lectureExistente = repository.findById(id).orElse(null);

        // Se não existir, retorna null (pode melhorar depois com exception)
        if (lectureExistente == null) {
            return null;
        }

        // Atualiza campos
        lectureExistente.setTitulo(novaLecture.getTitulo());
        lectureExistente.setDescricao(novaLecture.getDescricao());
        lectureExistente.setAudioPath(novaLecture.getAudioPath());
        lectureExistente.setTranscricao(novaLecture.getTranscricao());
        lectureExistente.setResumo(novaLecture.getResumo());

        return repository.save(lectureExistente);
    }
}