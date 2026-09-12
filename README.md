# ClassWatch

Aplicação mobile desenvolvida com React Native, Spring Boot, PostgreSQL e inteligência artificial para gravar aulas, transcrever o áudio e gerar resumos automaticamente.

## Sumário

* [Objetivo](#objetivo)
* [Tecnologias utilizadas](#tecnologias-utilizadas)
* [Arquitetura](#arquitetura)
* [Estrutura do projeto](#estrutura-do-projeto)
* [Funcionalidades](#funcionalidades)
* [Como executar](#como-executar)
* [Testes automatizados](#testes-automatizados)
* [CI](#ci)
* [Endpoints](#endpoints)
* [Roadmap](#roadmap)
* [Autor](#autor)

## Objetivo

O ClassWatch foi criado como projeto acadêmico e de portfólio com a ideia de transformar aulas gravadas em material de estudo.

O usuário grava uma aula pelo celular, envia o áudio para a API e o conteúdo é processado utilizando Whisper e OpenAI para gerar uma transcrição revisada e um resumo da aula.

O projeto também serve para aplicar na prática conceitos de desenvolvimento mobile, APIs REST, banco de dados, processamento assíncrono, integração entre Java e Python, inteligência artificial, testes e CI.

## Tecnologias utilizadas

### Mobile

* **TypeScript** - Linguagem utilizada no aplicativo
* **React Native** - Desenvolvimento da interface mobile
* **Expo** - Ambiente de desenvolvimento e execução do aplicativo
* **Expo Router** - Navegação entre as telas
* **expo-audio** - Gravação das aulas

### Backend

* **Java 17** - Linguagem utilizada na API
* **Spring Boot** - Framework utilizado no backend
* **Spring Web** - Construção da API REST
* **Spring Data JPA** - Comunicação com o banco de dados
* **PostgreSQL** - Banco de dados relacional
* **Flyway** - Controle das migrations
* **Maven** - Gerenciamento de dependências e build

### Inteligência artificial

* **Python** - Execução do pipeline de processamento
* **Whisper** - Transcrição dos arquivos de áudio
* **OpenAI API** - Revisão da transcrição e geração dos resumos
* **FFmpeg** - Suporte ao processamento dos arquivos de áudio

### Desenvolvimento

* **Docker Compose** - Execução local do PostgreSQL
* **GitHub Actions** - Automação dos testes e validações do projeto

## Arquitetura

O projeto é dividido em três partes principais:

```text
Mobile
  ↓
Spring Boot API
  ↓
PostgreSQL

Spring Boot
  ↓
Python
  ↓
Whisper
  ↓
OpenAI
```

### Mobile

Responsável pela gravação das aulas, envio dos arquivos e exibição do histórico, transcrições e resumos.

### Backend

Responsável por receber os arquivos, armazenar os dados das aulas, iniciar o processamento e disponibilizar os resultados para o aplicativo.

A API utiliza uma organização em camadas:

```text
Controllers
    ↓
Services
    ↓
Repositories
    ↓
PostgreSQL
```

### Python

Responsável pelo processamento do áudio.

O Whisper realiza a transcrição e o conteúdo é enviado para a OpenAI para corrigir problemas de escrita e gerar um resumo utilizando apenas as informações presentes na aula.

## Estrutura do projeto

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── ai/
│   ├── tests/
│   ├── requirements.txt
│   └── transcricao.py
│
├── backend/
│   └── classwatch-backend/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/
│       │   │   └── resources/
│       │   └── test/
│       └── pom.xml
│
├── mobile/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── types/
│   └── package.json
│
├── compose.yaml
└── README.md
```

## Funcionalidades

### Gravação

O aplicativo permite gravar uma aula utilizando o microfone do celular e enviar o arquivo diretamente para o backend.

### Processamento

Depois do upload a aula passa pelos seguintes estados:

```text
RECEBIDO
   ↓
PROCESSANDO
   ↓
FINALIZADO
```

Caso ocorra algum problema durante o processamento:

```text
ERRO
```

O processamento é executado de forma assíncrona para que o upload não precise aguardar toda a transcrição.

### Transcrição

O áudio é processado pelo Whisper, que transforma a fala em texto.

Depois a OpenAI revisa a transcrição corrigindo pontuação, ortografia e frases quebradas quando o significado estiver claro.

O modelo é orientado a não adicionar informações que não estejam presentes na gravação.

### Resumo

Além da transcrição revisada, é gerado um resumo em tópicos com os principais pontos apresentados durante a aula.

### Histórico

O aplicativo permite visualizar as aulas gravadas e acompanhar o status de cada processamento.

Quando a aula é finalizada, a transcrição e o resumo ficam disponíveis para consulta.

## Como executar

### Pré-requisitos

Para executar o projeto são necessários:

* Java 17
* Node.js
* Python
* Docker
* FFmpeg
* chave da OpenAI

### Banco de dados

Na raiz do projeto:

```bash
docker compose up -d database
```

O PostgreSQL ficará disponível na porta `5432`.

### Python

Entre na pasta:

```bash
cd ai
```

Crie um ambiente virtual:

```bash
python -m venv .venv
```

Ative o ambiente e instale as dependências:

```bash
pip install -r requirements.txt
```

Configure a variável:

```env
OPENAI_API_KEY=sua_chave
```

### Backend

Entre na pasta:

```bash
cd backend/classwatch-backend
```

Configure as variáveis necessárias para o banco, OpenAI e execução do Python.

Depois inicie a API:

#### Windows

```powershell
.\mvnw.cmd spring-boot:run
```

#### Linux

```bash
./mvnw spring-boot:run
```

A API ficará disponível em:

```text
http://localhost:8080
```

### Mobile

Entre na pasta:

```bash
cd mobile
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env`:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:8080
```

Depois execute:

```bash
npx expo start
```

Em um celular físico é necessário utilizar o IP do computador na rede local em vez de `localhost`.

## Testes automatizados

O projeto possui testes e validações para os três componentes principais.

### Backend

```bash
./mvnw verify
```

No Windows:

```powershell
.\mvnw.cmd verify
```

### Python

```bash
python -m unittest discover -s tests
```

### Mobile

```bash
npm run typecheck
npm run lint
```

## CI

O projeto utiliza GitHub Actions para validar automaticamente alterações enviadas para a branch `main`.

O pipeline executa:

* testes do backend;
* testes do código Python;
* verificação do TypeScript;
* lint do aplicativo.

Caso alguma dessas etapas falhe, o workflow também falha.

## Endpoints

| Método   | Endpoint           | Status | Descrição           |
| :------- | :----------------- | :----: | :------------------ |
| `POST`   | `/lectures/upload` |  `201` | Envia uma nova aula |
| `GET`    | `/lectures`        |  `200` | Lista as aulas      |
| `GET`    | `/lectures/{id}`   |  `200` | Busca uma aula      |
| `PUT`    | `/lectures/{id}`   |  `200` | Atualiza uma aula   |
| `DELETE` | `/lectures/{id}`   |  `204` | Remove uma aula     |

## Roadmap

### Concluído

* [x] Aplicativo mobile com React Native e Expo
* [x] Gravação de áudio
* [x] Upload das aulas
* [x] API REST com Spring Boot
* [x] PostgreSQL
* [x] Migrations com Flyway
* [x] Processamento assíncrono
* [x] Integração entre Java e Python
* [x] Transcrição com Whisper
* [x] Revisão utilizando OpenAI
* [x] Geração de resumos
* [x] Histórico de aulas
* [x] Testes automatizados
* [x] CI com GitHub Actions

### Próximos passos

* [ ] Autenticação e gerenciamento de usuários

## Autor

Desenvolvido por **Lucas Wallace Segalla**

* GitHub: https://github.com/lucassegalla
* LinkedIn: https://linkedin.com/in/lucassegalla
