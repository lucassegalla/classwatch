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
- PostgreSQL 14 ou superior (driver PostgreSQL do projeto).
- Python 3.10+ com FFmpeg instalado e disponível em `PATH`.
- Node.js compatível com Expo SDK 54 (Node 20.19+ recomendado) e npm.
- Uma chave da OpenAI para gerar materiais; Whisper também baixa o modelo selecionado na primeira execução e pode usar aceleração CUDA quando disponível.

## Configuração e inicialização

### 1. PostgreSQL

Crie o banco `classwatch` e um usuário com acesso. Na primeira inicialização, Flyway aplica a migração `V1` para criar usuários e adicionar `owner_id` anulável às aulas existentes. As aulas antigas permanecem sem proprietário conhecido e não são atribuídas automaticamente. Hibernate continua com `ddl-auto=update` para compatibilidade com as entidades já existentes. Faça backup antes de atualizar instalações com dados importantes.

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
CLASSWATCH_JWT_SECRET=<segredo-aleatorio-com-ao-menos-32-bytes>
```

Gere o segredo localmente (não o compartilhe nem o versione): `openssl rand -hex 32` (ou PowerShell: `[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`). O JWT expira em uma hora por padrão; ajuste `CLASSWATCH_JWT_TTL_SECONDS` (60–86400). Para criar uma conta professor de teste, configure temporariamente `CLASSWATCH_BOOTSTRAP_TEACHER_EMAIL` e `CLASSWATCH_BOOTSTRAP_TEACHER_PASSWORD` antes de iniciar a API. O backend cria essa conta somente se ainda não existir professor e o e-mail não pertencer a outra conta. A rotina nunca promove uma conta existente. Apague essas duas variáveis depois do primeiro início e preserve a senha apenas no seu ambiente local.

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
| `POST` | `/auth/register` | Cadastro público exclusivamente de estudante; retorna token e perfil |
| `POST` | `/auth/login` | Login por e-mail e senha; retorna JWT e perfil |
| `GET` | `/auth/me` | Perfil da identidade do token autenticado |
| `POST` | `/lectures/upload` | Recebe `file`, `titulo`, `descricao` e `requestId` como multipart e retorna `202`; repetição do mesmo `requestId` retorna a aula existente |
| `GET` | `/lectures?q=termo` | Lista leve, busca título/descrição; não inclui transcrição nem resumo |
| `GET` | `/lectures/{id}` | Detalhe com transcrição, resumo e estado |
| `POST` | `/lectures/{id}/retry` | Reagenda aula em erro se o áudio original ainda existir |
| `DELETE` | `/lectures/{id}` | Remove registro e, após confirmar a transação, o áudio armazenado |

Os endpoints `/lectures/**` exigem `Authorization: Bearer <token>`. A API usa JWT HS256 sem sessão no servidor; requisições inválidas ou expiradas retornam 401. Cadastro não aceita papel: novas contas são sempre `ESTUDANTE`. O token e o perfil do usuário são derivados no servidor; um usuário comum não consegue consultar, apagar ou reenviar aulas de outra conta. Professores podem consultar aulas legadas sem proprietário conhecido; estudantes não. Não há ainda operações exclusivas de disciplina/turma, nem endpoint público para promover usuários.

Exemplo para testar com `curl`:

```bash
curl -X POST http://localhost:8080/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Estudante de teste","email":"estudante@example.com","password":"senha-local-forte"}'
curl http://localhost:8080/auth/me -H 'Authorization: Bearer <accessToken>'
```

No aplicativo nativo, o token fica no `expo-secure-store` e o `/auth/me` valida a sessão na abertura. Logout remove o token local; JWTs são stateless e não podem ser revogados antes da expiração. Na web, a sessão é mantida apenas em memória. Não existe recuperação de senha por e-mail nesta etapa.

Os estados são `PROCESSANDO`, `FINALIZADO` e `ERRO`. O executor do servidor processa uma aula por vez, com fila limitada; trabalhos recusados ficam em erro e podem ser reenviados. Na inicialização, aulas que ficaram em processamento são reagendadas dentro da capacidade disponível.

Campos longos de transcrição e resumo são armazenados como `TEXT` no PostgreSQL. A migração Flyway V2 converte essas colunas somente quando ainda estão no tipo `oid`, lendo o conteúdo dos Large Objects existentes sem apagá-los. Se uma aula antiga exibir apenas um identificador numérico e não tiver resumo útil, os detalhes oferecem **Recuperar do áudio**; essa ação reexecuta Whisper usando o arquivo salvo. Ela exige que o áudio original ainda exista no diretório de uploads.

## Privacidade e limites atuais

- O backend agora tem autenticação e isolamento por conta para novas aulas. A autorização de professor/estudante está preparada no token e no modelo; recursos de turmas e permissões de participação ainda não existem. A API não possui revogação de token nem recuperação de senha por e-mail.
- Os áudios e materiais ficam em disco local e PostgreSQL sem criptografia em nível de aplicação. Proteja os discos, backups e credenciais do ambiente.
- A gravação pode ser pausada e retomada. Depois de finalizada, o áudio e os metadados são preservados no armazenamento do aplicativo até o backend confirmar o recebimento, inclusive se o app for fechado; a interrupção forçada durante a gravação ativa ainda pode impedir a recuperação.
- É possível gravar pelo aplicativo; seleção de arquivo de áudio existente e paginação do histórico ainda não estão implementadas. Busca por título/descrição está disponível.
- O backend limita uploads a 50 MB e aceita M4A, AAC, MP3 e WAV. Duração máxima de áudio e limitação de frequência por cliente não estão configuradas.
- O resumo inclui tópicos de revisão e perguntas fundamentadas na transcrição. Não há validação humana da fidelidade dos resultados.
- O processamento depende de internet para a OpenAI, além de Python, FFmpeg e modelo Whisper instalados. Os custos da OpenAI são responsabilidade do operador.
- O esquema é migrado de forma aditiva com Flyway, mantendo `ddl-auto=update` durante a transição. Linhas antigas continuam com `owner_id = NULL` e somente professoras/professores autenticados conseguem acessá-las.

## Materiais, aparência e escopo acadêmico

- A IA agora retorna o resumo como JSON estruturado em português (visão geral, ideias, conceitos, relações, exemplos e perguntas). O aplicativo renderiza cada tipo de conteúdo separadamente e oferece abas para resumo e transcrição. Resumos antigos em Markdown e dicionários Python são interpretados de forma limitada e segura; formatos desconhecidos permanecem como texto legível.
- Em Configurações, a preferência de tema pode ser Automático, Claro ou Escuro. Ela é guardada localmente no diretório privado do app e aplicada sem reiniciar.
- Espaços de matérias, matrículas, extração de tarefas e confirmação por professor ainda não estão implementados. Usuários e papéis já existem para servir de base; turmas e relacionamentos não são criados antecipadamente.
- Os materiais gerados continuam sendo conteúdo de apoio e devem ser revisados pelo usuário.

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
