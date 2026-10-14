# ClassWatch

Sistema desenvolvido com React Native, Spring Boot, PostgreSQL, Python e Inteligência Artificial para transformar gravações de aulas em transcrições revisadas e resumos organizados para estudo.

O projeto integra aplicativo mobile, API, banco de dados e processamento de áudio em um único fluxo, desde a gravação até a consulta do material pelo estudante.

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
- [Endpoints](#endpoints)
- [Testes](#testes)
- [Roadmap](#roadmap)
- [Autor](#autor)

## Objetivo

O ClassWatch nasceu como um projeto acadêmico e evoluiu para uma aplicação voltada à organização e revisão de conteúdos de aulas. A proposta é permitir que o usuário grave uma aula pelo celular, gere uma transcrição revisada e obtenha um resumo organizado por meio de Inteligência Artificial.

O material processado fica armazenado no banco de dados e pode ser consultado posteriormente pelo aplicativo. Dessa forma, o ClassWatch busca simplificar a revisão de conteúdos e reduzir o trabalho manual de organizar anotações.

## Demonstração

O funcionamento da aplicação pode ser resumido nas seguintes etapas:

```text
Gravação da aula pelo celular
          ↓
Aplicativo React Native
          ↓
Envio do áudio para a API
          ↓
Backend Spring Boot
          ↓
Salvamento da aula no PostgreSQL
          ↓
Processamento com Python e Whisper
          ↓
Revisão do texto e geração do resumo
          ↓
OpenAI API
          ↓
Salvamento do resultado
          ↓
Exibição no aplicativo
```

Durante o processamento, o aplicativo acompanha o status da aula. Quando o processamento termina, o usuário pode consultar o resumo e a transcrição na tela de resultado.

## Tecnologias utilizadas

### Mobile

- **React Native:** desenvolvimento da aplicação para dispositivos móveis.
- **Expo:** ferramentas para executar e desenvolver o aplicativo.
- **TypeScript:** tipagem do código e definição dos dados utilizados pela aplicação.
- **Expo Router:** organização da navegação entre as telas.
- **Expo AV:** gravação de áudio na implementação atual.

### Backend

- **Java:** linguagem utilizada no backend.
- **Spring Boot:** framework responsável pela API e pela integração entre os componentes.
- **Spring Web:** criação dos endpoints HTTP e recebimento dos arquivos de áudio.
- **Spring Data JPA:** comunicação entre a aplicação e o banco de dados.
- **Maven:** gerenciamento das dependências e execução dos comandos de build e teste.

### Banco de dados

- **PostgreSQL:** armazenamento das aulas, transcrições, resumos e estados do processamento.

### Inteligência Artificial

- **Python:** execução do processamento de áudio.
- **OpenAI Whisper:** conversão do áudio em texto.
- **OpenAI API:** revisão da transcrição e geração do resumo.
- **GPT-4o mini:** modelo textual utilizado por padrão para organizar o conteúdo.

### Ferramentas auxiliares

- **FFmpeg:** suporte à leitura e ao processamento dos arquivos de áudio.
- **Git:** controle de versão do código.
- **GitHub:** hospedagem do repositório.
- **ngrok:** exposição temporária do backend para acesso remoto durante testes.

## Arquitetura

O projeto separa as responsabilidades para facilitar a manutenção e permitir que cada componente execute uma função específica.

```text
React Native / Expo
        ↓
Spring Boot API
        ↓
Controllers
        ↓
LectureService
        ↓
PostgreSQL
        ↓
Processamento assíncrono
        ↓
Python
  ├── Whisper
  └── OpenAI
        ↓
PostgreSQL
        ↓
Aplicativo mobile
```

### Aplicativo mobile

É a interface utilizada pelo usuário. Permite gravar aulas, enviar os arquivos, acompanhar o processamento, consultar o histórico e visualizar os resultados.

### Controllers

Recebem as requisições do aplicativo e encaminham os dados para os serviços responsáveis pelo processamento. Também definem as respostas enviadas pela API.

### Services

Concentram as regras de negócio.

O `LectureService` é responsável pelas operações relacionadas às aulas, incluindo validação, armazenamento do áudio e persistência dos dados.

O `TranscriptionService` coordena a execução do processamento Python e atualiza o status da aula conforme o resultado.

### Processamento assíncrono

O processamento do áudio acontece em segundo plano, permitindo que a requisição de envio termine sem precisar aguardar toda a transcrição.

Uma fila controla a execução dos trabalhos para evitar que vários processamentos pesados do Whisper sejam executados simultaneamente.

### Python e Inteligência Artificial

O script Python utiliza o Whisper para gerar a transcrição inicial e a OpenAI para revisar o texto e organizar o resumo.

O resultado é devolvido ao backend, que salva as informações no PostgreSQL.

### Repositories

Utilizam o Spring Data JPA para realizar as operações de consulta e persistência no banco de dados.

## Estrutura do projeto

```text
classwatch/
├── ai/
│   ├── requirements.txt
│   └── transcricao.py
├── backend/
│   └── classwatch-backend/
│       ├── src/main/java/com/classwatch/backend/
│       │   ├── config/
│       │   ├── controller/
│       │   ├── dto/
│       │   ├── exception/
│       │   ├── model/
│       │   ├── repository/
│       │   └── service/
│       ├── src/main/resources/
│       ├── uploads/
│       ├── .env.example
│       ├── mvnw
│       ├── mvnw.cmd
│       └── pom.xml
├── data/
│   ├── audio/
│   └── transcricao/
├── mobile/
│   ├── app/
│   │   ├── lecture/
│   │   ├── _layout.tsx
│   │   ├── history.tsx
│   │   └── index.tsx
│   ├── services/
│   ├── types/
│   ├── .env.example
│   ├── app.json
│   └── package.json
├── .gitattributes
├── .gitignore
└── README.md
```

As pastas principais são:

- `mobile/`: telas, navegação e comunicação com a API.
- `backend/`: API, regras de negócio e integração com o banco.
- `ai/`: script Python responsável pela transcrição e pelo resumo.
- `data/`: diretório destinado a dados utilizados pelo projeto.
- `uploads/`: arquivos recebidos pelo backend durante a execução.

## Funcionalidades

### Gravação e envio

- Gravação de áudio pelo microfone do celular.
- Solicitação de permissão para utilizar o microfone.
- Envio do arquivo para o backend.
- Validação das informações da aula e do arquivo recebido.

### Processamento de áudio

- Transcrição automática com Whisper.
- Revisão do texto utilizando Inteligência Artificial.
- Geração de resumos organizados em tópicos.
- Processamento em segundo plano.
- Acompanhamento do estado de processamento.

### Histórico de aulas

- Listagem das aulas cadastradas.
- Ordenação da mais recente para a mais antiga.
- Consulta do status de cada aula.
- Acesso à transcrição e ao resumo das aulas processadas.

### Tratamento de erros

- Validação dos dados enviados.
- Registro do estado de erro quando o processamento falha.
- Verificação do resultado da execução do script Python.
- Interrupção do acompanhamento quando o processamento termina.
- Mensagens de erro para situações que impedem a conclusão da tarefa.

### Configuração e segurança

- Configurações do ambiente separadas do código-fonte.
- Chave da OpenAI e credenciais do banco configuradas localmente.
- Arquivos de áudio enviados ignorados pelo Git.
- Caminho interno dos arquivos de áudio mantido no backend.

## Como executar

Para executar o projeto localmente, é necessário ter Java, PostgreSQL, Python, Node.js e FFmpeg instalados.

### 1. Clonar o repositório

```bash
git clone https://github.com/lucassegalla/classwatch.git
cd classwatch
```

### 2. Criar o banco de dados

Crie um banco PostgreSQL chamado `classwatch`.

É possível fazer isso pelo pgAdmin ou pelo terminal:

```sql
CREATE DATABASE classwatch;
```

Na configuração atual, o Hibernate gerencia a estrutura das tabelas conforme as entidades da aplicação.

### 3. Configurar o backend

Entre na pasta do backend:

```bash
cd backend/classwatch-backend
```

Crie o arquivo local de configuração a partir do exemplo.

No Windows:

```cmd
copy .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com as informações do seu ambiente:

```env
DB_URL=jdbc:postgresql://localhost:5432/classwatch
DB_USER=postgres
DB_PASSWORD=sua_senha

OPENAI_API_KEY=sua_chave_openai
```

Outras configurações disponíveis incluem:

```env
PYTHON_PATH=python
AI_SCRIPT_PATH=C:/caminho/para/classwatch/ai/transcricao.py
WHISPER_MODEL=small
OPENAI_MODEL=gpt-4o-mini
AI_TIMEOUT_SECONDS=1800
UPLOADS_DIR=uploads
PORT=8080
```

Utilize o caminho real do projeto caso precise configurar `AI_SCRIPT_PATH`. A variável `OPENAI_API_KEY` deve conter sua própria chave e nunca deve ser publicada no GitHub.

### 4. Instalar as dependências Python

Volte para a raiz do projeto e execute:

```bash
python -m pip install -r ai/requirements.txt
```

O FFmpeg também precisa estar instalado e disponível no `PATH` do sistema.

Para verificar a instalação:

```bash
ffmpeg -version
```

### 5. Iniciar o backend

Entre novamente na pasta:

```bash
cd backend/classwatch-backend
```

No Windows:

```cmd
mvnw.cmd spring-boot:run
```

No Linux ou macOS:

```bash
./mvnw spring-boot:run
```

A API ficará disponível, por padrão, em:

```text
http://localhost:8080
```

Para verificar se o backend está em execução, acesse:

```text
http://localhost:8080/health
```

A resposta esperada é:

```json
{
  "status": "UP"
}
```

Mantenha o terminal do backend aberto enquanto estiver utilizando o aplicativo.

### 6. Configurar o aplicativo mobile

Abra outro terminal e entre na pasta:

```bash
cd mobile
```

Instale as dependências:

```bash
npm ci
```

Crie o arquivo de configuração local.

No Windows:

```cmd
copy .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Edite `mobile/.env` e configure o endereço do backend:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.100:8080
```

Substitua `192.168.0.100` pelo endereço IPv4 do computador que executa o backend.

Quando o aplicativo estiver sendo executado em um celular físico, o endereço precisa ser acessível pela rede do dispositivo. O uso de `localhost` no celular aponta para o próprio celular, não para o computador.

Inicie o Expo:

```bash
npx expo start
```

Abra o aplicativo pelo Expo Go ou pelo ambiente de execução utilizado no desenvolvimento.

## Processamento de IA

Quando uma aula é enviada, o backend salva suas informações e inicia o processamento em segundo plano.

O fluxo é:

1. O Whisper transforma o áudio em uma transcrição inicial.
2. O texto passa por uma limpeza básica.
3. A OpenAI revisa a transcrição e gera um resumo.
4. O backend valida o resultado e salva os dados.
5. O aplicativo identifica a conclusão e apresenta o material.

O processador utiliza instruções para preservar o conteúdo original da aula. A IA deve corrigir a escrita e organizar as informações sem acrescentar explicações externas ou inventar trechos que não estejam sustentados pela transcrição.

O processamento possui três estados principais:

- `PROCESSANDO`: a aula ainda está sendo processada.
- `FINALIZADO`: a transcrição e o resumo foram gerados.
- `ERRO`: ocorreu uma falha durante o processamento.

## Comunicação remota

Durante testes ou quando o celular não está na mesma rede do computador, o ngrok pode ser utilizado para disponibilizar temporariamente o backend pela internet.

Com a API executando na porta `8080`, inicie o túnel:

```bash
ngrok http 8080
```

O ngrok fornecerá uma URL HTTPS semelhante a:

```text
https://exemplo.ngrok-free.app
```

Configure essa URL no arquivo `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://exemplo.ngrok-free.app
```

Reinicie o Expo para carregar a nova configuração.

O túnel permite que o celular acesse o backend sem precisar estar na mesma rede local. A disponibilidade do endereço depende da sessão e das condições do serviço ngrok.

## Endpoints

A API disponibiliza os seguintes endpoints:

| Método | Endpoint           | Status | Descrição                                 |
| ------ | ------------------ | ------ | ----------------------------------------- |
| `GET`  | `/health`          | `200`  | Verifica se a API está em execução.       |
| `POST` | `/lectures/upload` | `202`  | Recebe uma aula e inicia o processamento. |
| `GET`  | `/lectures`        | `200`  | Lista as aulas cadastradas.               |
| `GET`  | `/lectures/{id}`   | `200`  | Consulta uma aula pelo identificador.     |

O endpoint de upload retorna uma resposta indicando que a solicitação foi aceita para processamento. O resultado final deve ser consultado posteriormente.

## Testes

O projeto pode ser validado por componente antes de executar uma demonstração completa.

### Backend

Na pasta `backend/classwatch-backend`, execute:

No Windows:

```cmd
mvnw.cmd test
```

No Linux ou macOS:

```bash
./mvnw test
```

### Mobile

Na pasta `mobile`, execute:

```bash
npx tsc --noEmit
```

Para executar o lint, caso o script esteja configurado no projeto:

```bash
npm run lint
```

### Python

Na raiz do projeto, execute:

```bash
python -m py_compile ai/transcricao.py
```

Além das verificações individuais, é importante testar o fluxo completo: gravar uma aula, enviar o áudio, aguardar o processamento e consultar o resultado pelo aplicativo.

## Roadmap

### Concluído

- [x] Aplicativo mobile com React Native e Expo.
- [x] Gravação de aulas pelo celular.
- [x] Upload de áudio para o backend.
- [x] Persistência das aulas no PostgreSQL.
- [x] Transcrição automática com Whisper.
- [x] Integração com a OpenAI.
- [x] Geração automática de resumos.
- [x] Histórico e consulta das aulas.
- [x] Processamento assíncrono.
- [x] Acompanhamento dos estados de processamento.
- [x] Tratamento básico de erros.
- [x] Configuração por variáveis de ambiente.

### Próximos passos

- [ ] Implementar autenticação de usuários.
- [ ] Relacionar aulas a usuários, disciplinas e turmas.
- [ ] Criar testes automatizados para o fluxo completo.
- [ ] Adicionar busca, filtros e paginação ao histórico.
- [ ] Gerar flashcards e questões de revisão.
- [ ] Evoluir o processamento para lidar com volumes maiores de áudio.
- [ ] Implementar migrations versionadas para o banco de dados.
- [ ] Containerizar a aplicação com Docker.
- [ ] Criar pipeline de integração e entrega contínuas.
- [ ] Publicar oficialmente a aplicação.

## Autor

Desenvolvido por **Lucas Wallace Segalla**.

- GitHub: https://github.com/lucassegalla
- LinkedIn: https://linkedin.com/in/lucassegalla
