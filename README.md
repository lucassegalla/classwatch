# ClassWatch

Sistema acadêmico desenvolvido com React Native, Spring Boot, PostgreSQL, Python, Whisper e OpenAI para transformar aulas gravadas em transcrições revisadas e resumos organizados para estudo

O projeto integra aplicação mobile, API REST, banco de dados e processamento de Inteligência Artificial em um único fluxo, desde a gravação da aula até a exibição do material processado

## Sumário

- [Objetivo](#objetivo)
- [Demonstração](#demonstração)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Arquitetura](#arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Como executar](#como-executar)
- [Processamento de IA](#processamento-de-ia)
- [Comunicação remota](#comunicação-remota)
- [Tratamento de erros](#tratamento-de-erros)
- [Testes e validação](#testes-e-validação)
- [Endpoints](#endpoints)
- [Roadmap](#roadmap)
- [Autor](#autor)

## Objetivo

O ClassWatch foi criado como um projeto acadêmico para estudar a integração entre desenvolvimento mobile, backend, banco de dados, processamento de áudio e Inteligência Artificial, a aplicação permite gravar uma aula pelo celular, enviar o áudio para uma API Spring Boot, transcrever o conteúdo localmente com Whisper, organizar a transcrição utilizando a OpenAI e armazenar o resultado no PostgreSQL para consulta posterior

A proposta é transformar uma gravação de aula em um material de revisão acessível dentro do próprio aplicativo, mantendo o conteúdo original como referência e evitando que a IA complete trechos sem contexto por suposição

## Demonstração

O fluxo principal da aplicação funciona da seguinte forma:

```text
Gravação da aula
      ↓
Aplicação React Native
      ↓
Upload do áudio
      ↓
Spring Boot API
      ↓
PostgreSQL salva a aula como PROCESSANDO
      ↓
Fila de processamento
      ↓
Python + Whisper
      ↓
Transcrição bruta
      ↓
OpenAI
      ↓
Transcrição revisada + resumo
      ↓
PostgreSQL
      ↓
Aplicativo acompanha o status
      ↓
Resultado da aula
```

Quando o processamento é concluído a tela é aberta automaticamente com o resumo e a transcrição, se ocorrer uma falha o backend registra o estado `ERRO` e o aplicativo interrompe o polling e apresenta a mensagem correspondente

## Tecnologias utilizadas

### Mobile

- **React Native** - Construção da aplicação mobile
- **Expo** - Ambiente de desenvolvimento e execução
- **TypeScript** - Tipagem e desenvolvimento das telas
- **Expo Router** - Navegação da aplicação
- **Expo AV** - Gravação do áudio durante a fase acadêmica atual

### Backend

- **Java 17** - Linguagem utilizada pela API
- **Spring Boot** - Framework principal do backend
- **Spring Web** - Endpoints REST e upload multipart
- **Spring Data JPA** - Persistência das aulas
- **Maven** - Gerenciamento de dependências e build

### Banco de dados

- **PostgreSQL** - Persistência das aulas, transcrições, resumos, status e informações de processamento

### Inteligência Artificial

- **Python** - Execução do pipeline de processamento
- **OpenAI Whisper** - Transcrição local dos arquivos de áudio
- **OpenAI API** - Revisão da transcrição e geração dos resumos
- **gpt-4o-mini** - Modelo textual utilizado por padrão

### Ferramentas auxiliares

- **FFmpeg** - Decodificação e processamento dos arquivos de áudio utilizados pelo Whisper
- **ngrok** - Exposição temporária do backend local para testes e apresentações pela internet
- **Git** - Controle de versão
- **GitHub** - Hospedagem do repositório

## Arquitetura

O sistema separa as responsabilidades entre a aplicação mobile, a API, o processador Python e o banco de dados

```text
React Native / Expo
        ↓
Spring Boot API
        ↓
LectureService
        ↓
PostgreSQL
        ↓
TranscriptionService
        ↓
Executor assíncrono
        ↓
Python
   ├── Whisper
   └── OpenAI
        ↓
PostgreSQL
        ↓
React Native / Expo
```

### Mobile

Responsável pela gravação da aula, upload do arquivo, acompanhamento do processamento, histórico e visualização do resultado

A URL da API fica centralizada através da variável `EXPO_PUBLIC_API_URL`, evitando URLs de ngrok espalhadas pelas telas

### Controllers

Recebem as requisições HTTP, encaminham o upload para o service e retornam DTOs que expõem apenas os dados necessários ao aplicativo

O caminho interno do arquivo de áudio não é enviado ao cliente

### Services

`LectureService` concentra validação dos dados, armazenamento do áudio e persistência da aula

`TranscriptionService` executa o processador Python em background, controla timeout, verifica o código de saída do processo e atualiza a aula como `FINALIZADO` ou `ERRO`

### Processamento assíncrono

O projeto utiliza um executor dedicado com apenas um processamento simultâneo, impedindo que várias instâncias pesadas do Whisper sejam carregadas ao mesmo tempo no computador durante a apresentação

Aulas que permanecerem com status `PROCESSANDO` após uma interrupção do backend são recolocadas na fila quando a aplicação inicia novamente

### Repositories

Concentram a comunicação com o PostgreSQL através do Spring Data JPA

O histórico é retornado da aula mais recente para a mais antiga

### Python

O processador Python valida o arquivo e a chave da OpenAI, executa o Whisper, revisa o texto e gera o resumo

O resultado enviado de volta ao Java utiliza campos codificados em Base64 para impedir que quebras de linha ou conteúdo da transcrição interfiram no protocolo entre os dois processos

## Estrutura do projeto

```text
.
├── ai/
│   ├── requirements.txt              # Dependências do processamento Python
│   └── transcricao.py                # Whisper + OpenAI
├── backend/
│   └── classwatch-backend/
│       ├── src/main/java/com/classwatch/backend/
│       │   ├── config/               # Executor do processamento assíncrono
│       │   ├── controller/           # Endpoints REST
│       │   ├── dto/                  # Respostas públicas da API
│       │   ├── exception/            # Tratamento centralizado de erros
│       │   ├── model/                # Entidade e status das aulas
│       │   ├── repository/           # Persistência PostgreSQL
│       │   └── service/              # Regras de negócio e processamento
│       ├── src/main/resources/
│       │   └── application.properties
│       ├── uploads/                  # Áudios gerados localmente, ignorados pelo Git
│       ├── .env.example              # Exemplo das configurações locais
│       ├── mvnw
│       ├── mvnw.cmd
│       └── pom.xml
├── data/
│   ├── audio/
│   └── transcricao/
├── mobile/
│   ├── app/
│   │   ├── lecture/
│   │   │   ├── [id].tsx             # Resultado da aula
│   │   │   └── new.tsx              # Gravação e processamento
│   │   ├── _layout.tsx
│   │   ├── history.tsx               # Histórico
│   │   └── index.tsx                 # Tela inicial
│   ├── services/
│   │   └── api.ts                    # Comunicação centralizada com a API
│   ├── types/
│   │   └── lecture.ts                # Tipos TypeScript
│   ├── .env.example
│   ├── app.json
│   ├── package.json
│   └── package-lock.json
├── .gitattributes
├── .gitignore
└── README.md
```

## Funcionalidades

### Gravação e upload

- Gravação de aulas utilizando o microfone do dispositivo
- Solicitação e tratamento da permissão de microfone
- Upload multipart do arquivo para o backend
- Validação de título, descrição e formato do áudio
- Suporte a arquivos `M4A`, `AAC`, `MP3` e `WAV` no backend
- Limite de upload de `50 MB`
- Bloqueio de novas gravações enquanto uma aula está sendo enviada ou processada

### Processamento

- Processamento assíncrono para não bloquear a requisição de upload
- Fila limitada a um processamento de Whisper por vez
- Timeout configurável do processo Python
- Verificação do exit code do Python
- Recuperação de aulas interrompidas após reinicialização do backend
- Estado `PROCESSANDO`, `FINALIZADO` ou `ERRO`
- Mensagem de erro armazenada para facilitar diagnóstico

### Inteligência Artificial

- Transcrição automática utilizando Whisper
- Limpeza da transcrição antes do envio para o modelo textual
- Correção de ortografia, pontuação e concordância
- Organização de frases quebradas apenas quando houver contexto suficiente
- Proibição explícita de inventar conteúdo ausente
- Uso de `[trecho inaudível]` quando não houver segurança para reconstruir uma passagem
- Resumo automático em tópicos

### Histórico

- Listagem das aulas da mais recente para a mais antiga
- Atualização automática ao abrir novamente a tela
- Atualização manual por gesto de refresh
- Exibição do estado de cada aula
- Data e hora de criação para novas aulas
- Tratamento de lista vazia e falha de comunicação

### Interface mobile

- Tela inicial própria do ClassWatch
- Fluxo de gravação com estados visuais
- Mensagens de erro visíveis ao usuário
- Polling interrompido corretamente em sucesso ou erro
- Redirecionamento automático para o resultado quando a aula é finalizada
- Tela de resultado com resumo e transcrição
- Remoção das telas e componentes de exemplo do template padrão do Expo

### Segurança e configuração

- Senha do PostgreSQL e chave da OpenAI fora do código-fonte
- Caminho do Python configurável por ambiente
- Descoberta automática do `ai/transcricao.py` nas estruturas comuns do projeto
- Uploads e arquivos de áudio ignorados pelo Git
- DTOs impedem que caminhos internos do servidor sejam expostos pela API
- Tratamento centralizado das respostas de erro

## Como executar

O ambiente local precisa de Java, PostgreSQL, Python, Node.js e FFmpeg instalados

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd classwatch
```

### 2. Criar o banco PostgreSQL

Crie um banco chamado:

```text
classwatch
```

O banco pode ser criado pelo pgAdmin ou através do `psql`:

```sql
CREATE DATABASE classwatch;
```

O Hibernate cria e atualiza as tabelas utilizadas pelo projeto durante esta fase acadêmica através de:

```properties
spring.jpa.hibernate.ddl-auto=update
```

### 3. Configurar o backend

Entre na pasta:

```bash
cd backend/classwatch-backend
```

Crie o arquivo local de configuração a partir do exemplo

No Windows:

```cmd
copy .env.example .env
```

No Linux/macOS:

```bash
cp .env.example .env
```

Edite `.env`:

```env
DB_URL=jdbc:postgresql://localhost:5432/classwatch
DB_USER=postgres
DB_PASSWORD=sua_senha

OPENAI_API_KEY=sua_chave_openai
```

Também podem ser configurados opcionalmente:

```env
PYTHON_PATH=python
AI_SCRIPT_PATH=C:/caminho/para/classwatch/ai/transcricao.py
WHISPER_MODEL=small
OPENAI_MODEL=gpt-4o-mini
AI_TIMEOUT_SECONDS=1800
UPLOADS_DIR=uploads
PORT=8080
```

O arquivo `.env` é ignorado pelo Git

### 4. Configurar Python

Volte para a raiz do projeto e instale as dependências:

```bash
python -m pip install -r ai/requirements.txt
```

O FFmpeg também precisa estar disponível no `PATH` do sistema

Para verificar:

```bash
ffmpeg -version
```

E:

```bash
python --version
```

### 5. Iniciar o backend

Entre novamente em:

```bash
cd backend/classwatch-backend
```

No Windows:

```cmd
mvnw.cmd spring-boot:run
```

No Linux/macOS:

```bash
./mvnw spring-boot:run
```

Por padrão a API ficará disponível em:

```text
http://localhost:8080
```

O endpoint de saúde pode ser testado em:

```text
http://localhost:8080/health
```

Resposta esperada:

```json
{
  "status": "UP"
}
```

### 6. Configurar o aplicativo mobile

Em outro terminal entre em:

```bash
cd mobile
```

Instale as dependências:

```bash
npm ci
```

Crie o arquivo de configuração local

No Windows:

```cmd
copy .env.example .env
```

No Linux/macOS:

```bash
cp .env.example .env
```

Configure `EXPO_PUBLIC_API_URL` com a URL utilizada pelo celular:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.100:8080
```

O endereço deve apontar para o computador que está executando o Spring Boot

Depois inicie o Expo:

```bash
npx expo start
```

## Processamento de IA

Quando um áudio é enviado o backend cria a aula com status:

```text
PROCESSANDO
```

O `TranscriptionService` adiciona o trabalho a um executor dedicado e inicia o script Python

```text
Áudio
  ↓
Whisper
  ↓
Transcrição bruta
  ↓
Limpeza do texto
  ↓
OpenAI
  ↓
Transcrição revisada
  +
Resumo em tópicos
```

O prompt utilizado pela IA segue uma regra importante: nenhum conteúdo externo deve ser adicionado para completar partes incompreensíveis da aula

Se o processamento terminar corretamente:

```text
FINALIZADO
```

Se Python, Whisper, OpenAI ou o arquivo de áudio produzirem uma falha:

```text
ERRO
```

O aplicativo identifica os dois estados terminais e encerra o polling corretamente

## Comunicação remota

Durante testes e apresentações o ngrok pode ser utilizado para expor temporariamente o backend local

Com o backend na porta `8080` execute:

```bash
ngrok http 8080
```

O ngrok retornará uma URL semelhante a:

```text
https://exemplo.ngrok-free.app
```

Coloque essa URL em `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://exemplo.ngrok-free.app
```

Depois reinicie o Expo para que a variável seja carregada novamente

```text
Celular
   ↓
Internet
   ↓
ngrok
   ↓
Spring Boot
   ↓
Python / IA
   ↓
PostgreSQL
```

A camada de API do aplicativo envia também o header utilizado para evitar a página intermediária do ngrok em requisições da aplicação

## Tratamento de erros

O backend possui tratamento centralizado para evitar respostas inconsistentes

Exemplos:

```text
400 - Dados ou arquivo inválidos
404 - Aula não encontrada
413 - Arquivo maior que 50 MB
500 - Erro interno inesperado
```

Falhas internas do processador de IA não transformam mais a aula em falso sucesso, o código de saída do Python é verificado e somente respostas estruturadas válidas podem alterar o status para `FINALIZADO`

O conteúdo completo das transcrições também não é escrito nos logs do backend

## Testes e validação

O projeto contém um teste básico do módulo Java e os componentes também podem ser validados separadamente antes da apresentação

### Backend

No Windows:

```cmd
mvnw.cmd test
```

No Linux/macOS:

```bash
./mvnw test
```

### Mobile

```bash
npx tsc --noEmit
```

E para lint:

```bash
npm run lint
```

### Python

```bash
python -m py_compile ai/transcricao.py
```

Antes da apresentação é recomendado executar o fluxo completo várias vezes utilizando gravações curtas e pelo menos um teste proposital de falha para confirmar o tratamento de erro

## Endpoints

| Método | Endpoint | Status | Descrição |
| :----- | :------- | :----: | :-------- |
| `GET` | `/health` | `200` | Verifica se a API está em execução |
| `POST` | `/lectures/upload` | `202` | Cria a aula, salva o áudio e inicia o processamento |
| `GET` | `/lectures` | `200` | Lista as aulas da mais recente para a mais antiga |
| `GET` | `/lectures/{id}` | `200` | Busca uma aula e o estado atual do processamento |

O endpoint antigo que aceitava `audioPath` informado pelo cliente foi removido, o caminho do arquivo agora é definido exclusivamente pelo backend

## Roadmap

### Concluído

- [x] Aplicação mobile com React Native, Expo e TypeScript
- [x] Gravação de aulas pelo microfone
- [x] Upload de áudio para Spring Boot
- [x] Persistência com PostgreSQL
- [x] Transcrição automática com Whisper
- [x] Integração com OpenAI
- [x] Geração automática de resumo
- [x] Histórico de aulas
- [x] Processamento assíncrono
- [x] Fila limitada de processamento
- [x] Timeout e verificação do processo Python
- [x] Estado de erro persistido no banco
- [x] Recuperação de processamentos interrompidos
- [x] Configuração por variáveis de ambiente
- [x] URL da API centralizada no mobile
- [x] Tratamento do polling em sucesso e erro
- [x] Validação básica dos uploads
- [x] Tratamento centralizado de erros HTTP
- [x] DTOs para evitar exposição de caminhos internos
- [x] Limpeza dos arquivos gerados no Git
- [x] Interface preparada para demonstração
- [x] Endpoint de health check

### Próximos passos

- [ ] Implementar autenticação e autorização de alunos e professores
- [ ] Relacionar aulas a usuários, disciplinas e turmas
- [ ] Substituir `ddl-auto=update` por migrations versionadas com Flyway
- [ ] Criar testes unitários e de integração para o fluxo completo
- [ ] Migrar o armazenamento local dos áudios para object storage
- [ ] Evoluir o worker Python para um serviço persistente sem recarregar o Whisper a cada aula
- [ ] Migrar a gravação de `expo-av` para `expo-audio`
- [ ] Implementar paginação no histórico para grandes volumes de aulas
- [ ] Adicionar busca e filtros de aulas
- [ ] Gerar flashcards, quizzes e perguntas de revisão
- [ ] Criar uma plataforma web integrada
- [ ] Containerizar os componentes com Docker
- [ ] Criar pipeline de CI/CD
- [ ] Publicar oficialmente a aplicação

## Autor

Desenvolvido por **Lucas Wallace Segalla**

- GitHub: https://github.com/lucassegalla
- LinkedIn: https://linkedin.com/in/lucassegalla

Projeto acadêmico desenvolvido para estudos e apresentação universitária
