package com.classwatch.backend.repository;

import com.classwatch.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

/*
 * Interface de acesso ao banco para User
 *
 * JpaRepository já fornece automaticamente:
 * - save()
 * - findAll()
 * - findById()
 * - deleteById()
 */
public interface UserRepository extends JpaRepository<User, Long> {
}