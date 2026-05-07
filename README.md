# SDR CRM

Gerenciador de leads e campanhas para times de pré-vendas, com funil customizável por workspace e integração com IA LLM para geração de mensagens comerciais. A aplicação permite organizar leads, configurar etapas do processo SDR, criar campanhas com contexto e prompt próprios, e gerar abordagens personalizadas usando a API do Groq.

## Tecnologias Utilizadas

- React 19
- Vite
- TypeScript
- Supabase Auth
- Supabase Database / PostgreSQL
- Supabase Edge Functions
- Supabase CLI
- Material UI / MUI
- MUI Icons
- Emotion
- React Router DOM
- Axios
- Zod
- Vitest
- Testing Library
- Bolt AI Builder
- Codex
- Groq API

## Decisoes Técnicas

### Banco de dados

O banco foi estruturado com foco em isolamento por usuário, expansão gradual das regras do CRM e integridade entre as entidades principais. As migrations criam primeiro `profiles` e `workspaces`, depois conectam `leads`, `funnels`, `campaigns` e `workspace_llm_settings` ao workspace.

A entidade `workspaces` centraliza o escopo de uso da aplicação. Leads, funis, campanhas e configurações de LLM pertencem a um workspace, e o workspace pertence a um usuário. Essa modelagem facilita multi-workspace, evita misturar dados entre usuários e deixa simples aplicar regras de acesso via Row Level Security.

Os funis foram modelados em uma tabela propria (`funnels`) em vez de serem apenas valores fixos em uma coluna do lead. Isso permite editar etapas, ordenar o funil, remover/adicionar colunas e configurar campos obrigatórios por etapa. A migration tambem cria uma restrição composta entre `leads(workspace_id, funnel_id)` e `funnels(workspace_id, id)`, garantindo que um lead não seja movido para uma etapa de outro workspace.

As campanhas ficam em `campaigns` e podem ter uma etapa gatilho (`trigger_funnel_id`). A restrição e o índice único parcial garantem que, dentro de um mesmo workspace, uma etapa gatilho seja usada por no máximo uma campanha ativa como automação. Isso evita conflitos na geração automática de mensagens quando um lead entra em uma etapa.

Campos flexíveis foram armazenados em JSONB, como `custom_fields`, `generated_messages` e `required_fields`. Essa escolha permite evoluir o CRM sem criar uma migration para cada novo campo dinamico, mantendo constraints para garantir que esses dados sejam arrays.

### Integração LLM com Groq

A integração de IA roda na Supabase Edge Function `api`. O backend renderiza o prompt de mensagem do lead, combina dados do lead com contexto e prompt da campanha, chama a API do Groq em formato compativel com OpenAI (`/openai/v1/chat/completions`) e espera uma resposta JSON com exatamente tres mensagens.

Foi escolhido o Groq porque ele oferece uma experiência simples para uso com LLMs via API, baixa latência e um plano gratuito suficiente para testar e demonstrar o fluxo sem custo inicial. Para usar, o usuário precisa apenas gerar uma chave em `https://console.groq.com/keys`, cadastrar no workspace e escolher um modelo disponivel.

A listagem de modelos tambem passa pelo backend, usando a chave cadastrada ou informada no momento, o que permite validar se o token esta correto antes de salvar a configuração.

### Multi-tenancy

O multi-tenancy foi implementado de forma simples e direta: todas as entidades de negocio sao atreladas ao usuário por meio do workspace. Cada workspace possui um `owner_id`, e as tabelas relacionadas possuem `workspace_id`.

As policies de RLS usam esse relacionamento para permitir que o usuário autenticado acesse apenas os registros dos workspaces que pertencem a ele. Na prática, o isolamento acontece por ownership, sem a necessidade de uma estrutura mais complexa de organizações, permissões ou membros.

### Seguranca da chave de API

Um dos principais desafios foi armazenar a chave da API do Groq, pois ela é um dado sensivel e específico de cada usuário/workspace. A solucao foi salvar a chave criptografada em `workspace_llm_settings.api_key_ciphertext`, usando AES-GCM na Edge Function.

Para exibição no frontend, a API retorna apenas `apiKeyPreview`, uma versão mascarada do token. Assim, o usuário consegue reconhecer qual chave esta configurada, mas a aplicação nunca expõe o valor completo depois de salvo.

A chave de criptografia vem de `LLM_ENCRYPTION_KEY` e, como fallback local, da `SUPABASE_SERVICE_ROLE_KEY`. O frontend nunca descriptografa a chave: a descriptografia acontece somente no backend, no momento de consultar modelos ou gerar mensagens.

### Regras de transição e automação

As etapas do funil podem declarar campos obrigatorios. Ao criar, editar ou mover leads, o backend valida esses campos antes de permitir a transição. Isso evita que um lead avance no funil sem dados mínimos definidos para aquela etapa.

Quando um lead entra em uma etapa configurada como gatilho de campanha, a Edge Function busca a campanha correspondente, recupera a configuração LLM do workspace, gera mensagens automáticamente e marca o lead com notificação. Ao enviar uma mensagem, o lead pode ser movido para a etapa de destino configurada no workspace, com fallback para "Tentando contato".

## Funcionalidades Implementadas

- [x] Sistema de autenticacao
- [x] Workspaces por usuário
- [x] Gestao de leads
- [x] Funil de pré-vendas
- [x] Edição de funil
- [x] Multi-workspace
- [x] Campanhas
- [x] Geração de mensagens com IA
- [x] Geração automática de mensagem por etapa gatilho
- [x] Regras de transição entre etapas
- [x] Dashboard

## Como Rodar

Instale as dependencias:

```bash
npm install
```

Configure as variaveis de ambiente com base no `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
LLM_ENCRYPTION_KEY=
```

Rode o frontend:

```bash
npm run dev
```

Rode a Edge Function localmente:

```bash
npm run dev:backend
```

Execute as migrations locais:

```bash
npm run migrate
```

> É considerado que o setup do Supabase Edge Functions via Docker foi feito préviamente.

## Scripts Disponiveis

- `npm run dev`: inicia o Vite.
- `npm run dev:backend`: inicia a Supabase Edge Function local.
- `npm run migrate`: aplica as migrations locais do Supabase.
- `npm run build`: compila TypeScript e gera o build de producao.
- `npm run lint`: executa ESLint.
- `npm run test`: executa os testes com Vitest.
- `npm run preview`: serve o build localmente.
