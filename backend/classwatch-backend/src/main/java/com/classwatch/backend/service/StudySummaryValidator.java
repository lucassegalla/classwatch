package com.classwatch.backend.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class StudySummaryValidator {
    private StudySummaryValidator() {}

    public static boolean hasStudySections(String rawSummary) {
        if (rawSummary == null || rawSummary.isBlank()) return false;
        String[] sectionNames = {
                "main_ideas", "mainIdeas", "key_points", "keyPoints", "ideias_centrais", "ideias_principais", "ideias principais",
                "concepts", "concepts_and_definitions", "conceptsAndDefinitions", "conceitos_definicoes", "conceitos_e_definicoes", "conceitos e definições",
                "relations", "relations_between_concepts", "relationsBetweenConcepts", "relacoes_entre_ideias", "relacoes_entre_conceitos", "relações entre ideias", "relações entre conceitos"
        };
        for (String name : sectionNames) {
            Pattern section = Pattern.compile(
                    "(?is)[\\\"']" + Pattern.quote(name) + "[\\\"']\\s*:\\s*(\\[[^\\]]*\\]|\\{[^}]*\\}|\\\"(?:\\\\.|[^\\\"\\\\])*\\\")");
            Matcher match = section.matcher(rawSummary);
            if (match.find()) {
                String payload = match.group(1).replaceAll("[\\s,{}\\[\\]\\\"':]", "");
                if (!payload.isBlank()) return true;
            }
        }
        // Preserve support for readable summaries stored as Markdown before structured JSON.
        return rawSummary.matches("(?is).*#{1,6}\\s*(ideias|conceitos|relações|relacoes|exemplos|perguntas).*" );
    }
}
