package com.classwatch.backend.service;

import com.classwatch.backend.model.User;
import com.classwatch.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

/*
 * Camada de regra de negócio para User
 */
@Service
public class UserService {

    /*
     * Repository para acesso ao banco
     */
    private final UserRepository userRepository;

    /*
     * Injeção por construtor (padronizado com o resto do projeto)
     */
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /*
     * Salva um usuário no banco
     */
    public User salvar(User user) {
        return userRepository.save(user);
    }
}