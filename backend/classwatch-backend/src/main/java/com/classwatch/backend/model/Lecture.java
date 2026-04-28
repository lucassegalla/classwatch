package com.classwatch.backend.model;

import jakarta.persistence.*;
import lombok.Data;

/*
 * @Data (Lombok)
 * Gera automaticamente:
 * - getters
 * - setters
 * - toString()
 * - equals() e hashCode()
 */
@Data

/*
 * Marca essa classe como uma entidade do banco
 * Ou seja, isso vira uma tabela automaticamente
 */
@Entity

/*
 * Define o nome da tabela no banco
 */
@Table(name = "lectures")
public class Lecture {

    /*
     * Identificador único da entidade (chave primária)
     */
    @Id

    /*
     * Define que o ID será gerado automaticamente pelo banco
     * IDENTITY = auto incremento
     */
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Título da aula
     */
    private String titulo;

    /*
     * Descrição da aula
     */
    private String descricao;

    /*
     * Caminho do arquivo de áudio na máquina
     * (futuro: pode virar URL de storage)
     */
    private String audioPath;

    /*
     * @Lob (Large Object)
     * Usado para textos grandes (transcrição pode ser longa)
     */
    @Lob
    private String transcricao;

    /*
     * Resumo gerado da aula
     * Também pode ser grande
     */
    @Lob
    private String resumo;

    /*
     * status do processamento da transcricao
     */
    private String status;
}