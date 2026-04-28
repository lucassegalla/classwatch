package com.classwatch.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/*
 * Classe principal da aplicação Spring Boot
 */
@EnableAsync
@SpringBootApplication
public class ClasswatchBackendApplication {

    /*
     * Método que inicia toda a aplicação
     */
    public static void main(String[] args) {

        /*
         * Sobe:
         * - servidor (Tomcat embutido)
         * - controllers
         * - services
         * - repositories
         * - configurações do Spring
         */
        SpringApplication.run(ClasswatchBackendApplication.class, args);
    }

}