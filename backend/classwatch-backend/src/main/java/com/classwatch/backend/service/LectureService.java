package com.classwatch.backend.service;

import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.LectureUpdateRequest;
import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class LectureService {

    private final LectureRepository lectureRepository;
    private final TranscriptionService transcriptionService;
    private final AudioStorageService audioStorageService;

    public LectureService(
            LectureRepository lectureRepository,
            TranscriptionService transcriptionService,
            AudioStorageService audioStorageService
    ) {
        this.lectureRepository = lectureRepository;
        this.transcriptionService = transcriptionService;
        this.audioStorageService = audioStorageService;
    }

    public LectureResponse criarComArquivo(MultipartFile file, String titulo, String descricao) {
        String audioKey = audioStorageService.armazenar(file);
        Long savedId = null;

        try {
            Lecture lecture = new Lecture();
            lecture.setTitulo(titulo.trim());
            lecture.setDescricao(descricao == null ? "" : descricao.trim());
            lecture.setAudioPath(audioKey);
            lecture.setStatus(LectureStatus.RECEBIDO);

            Lecture saved = lectureRepository.save(lecture);
            savedId = saved.getId();
            transcriptionService.processar(saved.getId());
            return LectureResponse.from(saved);
        } catch (RuntimeException exception) {
            if (savedId != null) {
                lectureRepository.deleteById(savedId);
            }
            audioStorageService.remover(audioKey);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<LectureResponse> listar() {
        return lectureRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(LectureResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public LectureResponse buscarPorId(Long id) {
        return LectureResponse.from(buscarEntidade(id));
    }

    @Transactional
    public LectureResponse atualizar(Long id, LectureUpdateRequest request) {
        Lecture lecture = buscarEntidade(id);
        lecture.setTitulo(request.titulo().trim());
        lecture.setDescricao(request.descricao() == null ? "" : request.descricao().trim());
        return LectureResponse.from(lectureRepository.save(lecture));
    }

    @Transactional
    public void remover(Long id) {
        Lecture lecture = buscarEntidade(id);
        lectureRepository.delete(lecture);
        audioStorageService.remover(lecture.getAudioPath());
    }

    private Lecture buscarEntidade(Long id) {
        return lectureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aula " + id + " não encontrada"));
    }
}
