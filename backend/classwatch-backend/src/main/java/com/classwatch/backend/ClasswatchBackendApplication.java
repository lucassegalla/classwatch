package com.classwatch.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class ClasswatchBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ClasswatchBackendApplication.class, args);
    }
}
