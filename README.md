# ClassWatch

Sistema acadêmico desenvolvido para transformar aulas gravadas em materiais de estudo organizados utilizando Inteligência Artificial.

O projeto permite gravar ou enviar aulas em áudio, processar automaticamente a transcrição utilizando IA e gerar resumos estruturados para auxiliar estudantes durante os estudos.

---

# Objetivo do Projeto

O ClassWatch foi criado como um projeto acadêmico com foco em integração entre:

* Aplicação Mobile
* Backend
* Banco de Dados
* Inteligência Artificial
* Processamento de Áudio

A proposta principal é facilitar a revisão de conteúdos apresentados em aula, transformando gravações em materiais organizados e acessíveis.

---

# Demonstração do Fluxo

```text
Gravação de Aula
        ↓
Upload do Áudio
        ↓
Backend Spring Boot
        ↓
Processamento Python + Whisper
        ↓
IA reorganiza e corrige transcrição
        ↓
IA gera resumo em tópicos
        ↓
PostgreSQL salva os dados
        ↓
Aplicativo exibe resultado
```

---

# Funcionalidades Atuais

## Mobile

* Gravação de aulas em áudio
* Upload de áudio para o backend
* Histórico de aulas processadas
* Visualização de transcrição
* Visualização de resumo
* Comunicação remota via internet utilizando ngrok
* Interface mobile utilizando React Native + Expo

## Backend

* API REST com Spring Boot
* Upload de arquivos de áudio
* Integração com Python
* Processamento assíncrono das aulas
* Persistência com PostgreSQL
* Armazenamento de:

  * transcrição
  * resumo
  * status
  * informações da aula

## IA

* Transcrição automática com Whisper
* Correção contextual da transcrição
* Reescrita inteligente do conteúdo
* Geração automática de resumo em tópicos

---

# Tecnologias Utilizadas

## Mobile

* React Native
* Expo
* TypeScript
* Expo Router
* Expo AV

## Backend

* Java
* Spring Boot
* Spring Web
* Spring Data JPA
* Maven

## Banco de Dados

* PostgreSQL

## Inteligência Artificial

* Python
* OpenAI Whisper
* OpenAI API

## Ferramentas Auxiliares

* FFmpeg
* ngrok
* Git
* GitHub

---

# Estrutura do Projeto

```text
classwatch/
│
├── ai/
│   └── transcricao.py
│
├── backend/
│   └── classwatch-backend/
│
├── data/
│   ├── audio/
│   └── transcricao/
│
├── mobile/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── constants/
│   └── package.json
│
└── README.md
```

---

# Arquitetura do Sistema

```text
React Native App
        ↓
Spring Boot API
        ↓
Python + Whisper + OpenAI
        ↓
PostgreSQL
```

O aplicativo mobile se comunica com o backend através de requisições HTTP.

O backend é responsável por:

* receber os arquivos de áudio
* armazenar informações da aula
* iniciar o processamento Python
* salvar os resultados no banco de dados

O script Python realiza:

* transcrição do áudio
* reconstrução contextual da fala
* geração de resumo inteligente

---

# Como Executar o Projeto

# 1. Clonar Repositório

```bash
git clone <URL_DO_REPOSITORIO>
```

---

# 2. Configurar PostgreSQL

Crie um banco chamado:

```text
classwatch
```

Exemplo de configuração utilizada:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/classwatch
spring.datasource.username=postgres
spring.datasource.password=1234
```

---

# 3. Configurar Backend

Acesse:

```text
backend/classwatch-backend
```

Execute:

```bash
mvn spring-boot:run
```

---

# 4. Configurar Python

Instale as dependências:

```bash
pip install openai-whisper
pip install openai
```

Também é necessário instalar:

* FFmpeg

---

# 5. Configurar OpenAI API Key

Configure a variável de ambiente:

```text
OPENAI_API_KEY
```

---

# 6. Executar Aplicação Mobile

Acesse:

```text
mobile/
```

Instale dependências:

```bash
npm install
```

Execute:

```bash
npx expo start
```

---

# Configuração Atual do Backend

Arquivo:

```text
application.properties
```

Principais configurações:

```properties
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB

server.address=0.0.0.0
```

---

# Funcionamento da IA

O sistema utiliza Whisper para gerar a transcrição inicial do áudio.

Após isso, a OpenAI recebe um prompt responsável por:

* corrigir erros da transcrição
* reconstruir frases quebradas
* melhorar coerência textual
* manter o significado original
* gerar um resumo estruturado em tópicos

Modelo utilizado atualmente:

```text
gpt-4o-mini
```

---

# Comunicação Remota

Durante os testes remotos e apresentações, o projeto utiliza:

* ngrok

O ngrok expõe o backend local para acesso via internet.

Fluxo remoto:

```text
Notebook/App
      ↓
Internet
      ↓
ngrok
      ↓
Backend local
      ↓
PostgreSQL
```

---

# Próximos Passos

* Aprimorar os prompts utilizados pela IA para gerar materiais de estudo mais completos, organizados e contextualizados a partir das transcrições das aulas.

* Evoluir o sistema de histórico de aulas, permitindo maior personalização e organização por parte dos professores.

* Implementar autenticação de usuários com separação entre professores e alunos.

* Melhorar a interface e experiência do usuário (UI/UX) do aplicativo.

* Disponibilizar oficialmente o aplicativo em plataformas digitais.

* Adicionar geração automática de:

  * flashcards
  * quizzes
  * perguntas de revisão
  * materiais complementares

* Criar uma plataforma web integrada ao sistema.

---

# Status do Projeto

```text
Em desenvolvimento acadêmico
```

O projeto encontra-se funcional e já possui:

* frontend mobile
* backend integrado
* banco de dados
* processamento com IA
* funcionamento remoto via internet

---

# Autor

Lucas Segalla

Projeto acadêmico desenvolvido para estudos e apresentação universitária.

---

# Licença

Este projeto possui fins acadêmicos e educacionais.
