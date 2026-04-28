package com.classwatch.backend.model;

import jakarta.persistence.*;
import lombok.Data;

/*
 * Lombok gera getters, setters, etc.
 */
@Data

/*
 * Entidade do banco
 */
@Entity

/*
 * Nome da tabela
 */
@Table(name = "users")
public class User {

    /*
     * ID único (chave primária)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Nome do usuário
     */
    private String nome;

    /*
     * Email (idealmente único)
     */
    private String email;

    /*
     * Senha (ATENÇÃO: problema aqui)
     */
    private String senha;

    /*
     * Tipo do usuário
     * Ex: PROFESSOR ou ALUNO
     */
    private String tipo;
}