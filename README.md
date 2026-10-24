# ClassWatch

Aplicativo mobile para gravar aulas e consultar a transcrição e materiais de revisão produzidos a partir do áudio. O repositório contém o aplicativo Expo, uma API Spring Boot, PostgreSQL e um processo Python que executa Whisper e usa a API da OpenAI para organizar o conteúdo.

## Arquitetura

```text
Expo / React Native → API Spring Boot → PostgreSQL
                              └→ Python → FFmpeg / Whisper → OpenAI API
```

- `mobile/`: interface, gravação, consulta e envio multipart.
- `backend/classwatch-backend/`: API REST, persistência JPA, armazenamento dos áudios e executor assíncrono limitado.
- `ai/transcricao.py`: transcrição e geração dos materiais; lê a chave OpenAI somente do ambiente.
- `data/` e `backend/classwatch-backend/uploads/`: diretórios locais, sem gravações versionadas.

## Requisitos

- Java 17 ou superior e Maven (o wrapper Maven está incluído).
- PostgreSQL compatível com o driver PostgreSQL do projeto.
- Python 3.10+ com FFmpeg instalado e disponível em `PATH`.
- Node.js compatível com Expo SDK 54 (Node 20.19+ recomendado) e npm.
- Uma chave da OpenAI para gerar materiais; Whisper também baixa o modelo selecionado na primeira execução e pode usar aceleração CUDA quando disponível.

## Configuração e inicialização

### 1. PostgreSQL

Crie um banco vazio chamado `classwatch` e um usuário com acesso a ele. A aplicação atualmente usa `spring.jpa.hibernate.ddl-auto=update` para compatibilidade com o esquema existente; ainda não há migrações versionadas. Faça backup antes de atualizar instalações com dados importantes.

### 2. Dependências Python

Na raiz do repositório:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r ai/requirements.txt
ffmpeg -version
```

Whisper baixa o modelo configurado na primeira transcrição. Em CPU, modelos maiores exigem bastante memória e podem levar tempo.

### 3. Backend

Copie `backend/classwatch-backend/.env.example` para `.env` nessa mesma pasta e preencha as variáveis localmente. O arquivo `.env` é ignorado pelo Git.

```env
DB_URL=jdbc:postgresql://localhost:5432/classwatch
DB_USER=classwatch
DB_PASSWORD=senha-local-do-banco
OPENAI_API_KEY=chave-da-sua-conta
```

Opcionalmente configure `PYTHON_PATH`, `AI_SCRIPT_PATH`, `WHISPER_MODEL`, `OPENAI_MODEL`, `AI_TIMEOUT_SECONDS`, `UPLOADS_DIR` e `PORT`. O backend encontra `ai/transcricao.py` automaticamente quando executado a partir da raiz ou da pasta do backend; configure `AI_SCRIPT_PATH` se seu diretório de trabalho for diferente.

Na pasta `backend/classwatch-backend`, inicie a API:

```powershell
.\mvnw.cmd spring-boot:run
```

```bash
./mvnw spring-boot:run
```

Por padrão, a API escuta na porta 8080 e em todas as interfaces de rede para permitir acesso pelo celular na rede local. `/health` confirma que a API está ativa. O endpoint ainda não faz health check do banco, Python, FFmpeg ou OpenAI.

### 4. Aplicativo Expo

Copie `mobile/.env.example` para `mobile/.env` e aponte para o computador que executa o backend. Use o IP local do computador no celular físico; `localhost` no telefone aponta para o próprio telefone.

```env
EXPO_PUBLIC_API_URL=http://192.168.0.100:8080
```

Na pasta `mobile`:

```bash
npm ci
npm start
```

Abra o projeto no Expo Go ou em um development build. A permissão de microfone é solicitada ao iniciar uma gravação.

## API

| Método | Caminho | Resultado |
| --- | --- | --- |
| `GET` | `/health` | Estado básico da API |
| `POST` | `/lectures/upload` | Recebe `file`, `titulo`, `descricao` e `requestId` como multipart e retorna `202`; repetição do mesmo `requestId` retorna a aula existente |
| `GET` | `/lectures?q=termo` | Lista leve, busca título/descrição; não inclui transcrição nem resumo |
| `GET` | `/lectures/{id}` | Detalhe com transcrição, resumo e estado |
| `POST` | `/lectures/{id}/retry` | Reagenda aula em erro se o áudio original ainda existir |
| `DELETE` | `/lectures/{id}` | Remove registro e, após confirmar a transação, o áudio armazenado |

Os estados são `PROCESSANDO`, `FINALIZADO` e `ERRO`. O executor do servidor processa uma aula por vez, com fila limitada; trabalhos recusados ficam em erro e podem ser reenviados. Na inicialização, aulas que ficaram em processamento são reagendadas dentro da capacidade disponível.

## Privacidade e limites atuais

- A instalação atual é de uso individual e não tem autenticação nem isolamento entre usuários. Todos os clientes que alcançam a API podem consultar, apagar e enviar aulas. **Não exponha esta API a uma rede pública ou a usuários não confiáveis.** Autenticação e controle de acesso por usuário são necessários antes de qualquer implantação multiusuário.
- Os áudios e materiais ficam em disco local e PostgreSQL sem criptografia em nível de aplicação. Proteja os discos, backups e credenciais do ambiente.
- A gravação pode ser pausada e retomada. Depois de finalizada, o áudio e os metadados são preservados no armazenamento do aplicativo até o backend confirmar o recebimento, inclusive se o app for fechado; a interrupção forçada durante a gravação ativa ainda pode impedir a recuperação.
- É possível gravar pelo aplicativo; seleção de arquivo de áudio existente e paginação do histórico ainda não estão implementadas. Busca por título/descrição está disponível.
- O backend limita uploads a 50 MB e aceita M4A, AAC, MP3 e WAV. Duração máxima de áudio e limitação de frequência por cliente não estão configuradas.
- O resumo inclui tópicos de revisão e perguntas fundamentadas na transcrição. Não há validação humana da fidelidade dos resultados.
- O processamento depende de internet para a OpenAI, além de Python, FFmpeg e modelo Whisper instalados. Os custos da OpenAI são responsabilidade do operador.
- O schema existente não foi migrado: Hibernate mantém `ddl-auto=update`; adote migrações versionadas antes de mudanças de esquema em produção.

## Materiais, aparência e escopo acadêmico

- A IA agora retorna o resumo como JSON estruturado em português (visão geral, ideias, conceitos, relações, exemplos e perguntas). O aplicativo renderiza cada tipo de conteúdo separadamente e oferece abas para resumo e transcrição. Resumos antigos em Markdown e dicionários Python são interpretados de forma limitada e segura; formatos desconhecidos permanecem como texto legível.
- Em Configurações, a preferência de tema pode ser Automático, Claro ou Escuro. Ela é guardada localmente no diretório privado do app e aplicada sem reiniciar.
- Espaços de matérias, matrículas, extração de tarefas e confirmação por professor ainda não estão implementados. O repositório não possui autenticação ou entidades de usuário; criar operações administrativas sem isso permitiria que qualquer cliente da API alterasse dados compartilhados. A próxima etapa para esses recursos é implementar login/identidade, papéis de professor e estudante, autorização por recurso e migrações incrementais antes das telas e endpoints de espaços e tarefas.
- O papel de “professor” não está separado do uso individual atual. Portanto, os materiais gerados devem ser tratados como conteúdo de apoio sujeito à revisão do usuário.

## Verificações

```bash
# backend/classwatch-backend
./mvnw test

# mobile
npm ci
npm test
npm run lint
npx tsc --noEmit

# raiz
python -m py_compile ai/transcricao.py
python -m unittest discover -s ai -p "test_*.py"
```

Os testes do backend exigem que o Maven consiga usar seu repositório local de dependências. As verificações de build não substituem um teste ponta a ponta com PostgreSQL, FFmpeg, pesos Whisper, credenciais e dispositivo Expo configurados.
