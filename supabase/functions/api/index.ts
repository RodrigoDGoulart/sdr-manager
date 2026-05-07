import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@^4.1.12';

type Json = Record<string, unknown>;
type AuthUpdatePayload = {
  email?: string;
  user_metadata?: {
    name: string;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const signupSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.email().optional(),
  })
  .refine((value) => value.name || value.email, {
    message: 'Provide at least name or email',
  });

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1),
});

const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    autoMessageDestinationFunnelId: z.uuid().optional(),
  })
  .refine((value) => value.name || value.autoMessageDestinationFunnelId, {
    message: 'Provide at least name or autoMessageDestinationFunnelId',
  });

const defaultFunnels = [
  'Base',
  'Lead Mapeado',
  'Tentando contato',
  'conexão iniciada',
  'desqualificado',
  'qualificado',
  'reunião agendada',
];

const funnelSchema = z.object({
  name: z.string().trim().min(1),
});

const campaignSchema = z.object({
  name: z.string().trim().min(1),
  context: z.string().trim().min(1),
  generationPrompt: z.string().trim().min(1),
  triggerFunnelId: z.union([z.uuid(), z.literal(''), z.null()]).optional().transform((value) => value || null),
});

const llmSettingsSchema = z.object({
  model: z.string().trim().min(1),
  apiKey: z.string().trim().optional(),
});

const llmModelsSchema = z.object({
  apiKey: z.string().trim().optional(),
});

const moveLeadSchema = z.object({
  funnelId: z.uuid(),
});

const generateLeadMessagesSchema = z.object({
  campaignId: z.uuid(),
});

const sendLeadMessageSchema = z.object({
  message: z.string().trim().min(1),
});

const leadFieldTypeSchema = z.enum(['text', 'long_text', 'number', 'date']);

const customLeadFieldSchema = z.object({
  label: z.string().trim().min(1),
  type: leadFieldTypeSchema,
  value: z.union([z.string(), z.number()]).transform((value) => String(value).trim()).refine((value) => value.length > 0, {
    message: 'Custom field value is required',
  }),
});

const leadSchema = z.object({
  funnelId: z.uuid().optional(),
  name: z.string().trim().min(1),
  email: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  source: z.string().trim().min(1),
  notes: z.string().trim().min(1),
  customFields: z.array(customLeadFieldSchema).default([]),
});

const workspaceSelect = 'id,name,created_at,owner_id,auto_message_destination_funnel_id';
const leadSelect = 'id,workspace_id,funnel_id,name,email,phone,company,role,source,notes,custom_fields,generated_messages,notification,created_at';
const leadMessagePrompt = `Voce e um assistente de SDR especializado em criar mensagens comerciais personalizadas para leads.

Sua tarefa e gerar exatamente 3 sugestoes de mensagens para abordagem comercial, considerando:
- os dados do lead;
- o contexto da campanha;
- as instrucoes especificas de geracao.

As mensagens devem ser naturais, personalizadas e uteis. Nao invente informacoes que nao estejam disponiveis. Se algum dado do lead estiver ausente, simplesmente nao use esse dado.

Regras:
- Gere exatamente 3 mensagens.
- Cada mensagem deve ser diferente em abordagem, mas manter o mesmo objetivo.
- Nao use tom robotico ou generico.
- Nao mencione que a mensagem foi gerada por IA.
- Nao inclua explicacoes fora do JSON.
- Nao use campos vazios ou desconhecidos como se fossem informacao real.
- Se houver observacoes do lead, use apenas se forem relevantes para personalizar a abordagem.

Dados do lead:
Nome: {{lead.name}}
Email: {{lead.email}}
Telefone: {{lead.phone}}
Empresa: {{lead.company}}
Cargo: {{lead.role}}
Origem do lead: {{lead.source}}
Observacoes: {{lead.notes}}

Campos personalizados:
{{custom_fields}}

Contexto da campanha:
{{campaign.context}}

Prompt de geracao da campanha:
{{campaign.generation_prompt}}

Retorne somente neste formato JSON:

{
  "messages": [
    {
      "title": "Opcao 1",
      "message": "..."
    },
    {
      "title": "Opcao 2",
      "message": "..."
    },
    {
      "title": "Opcao 3",
      "message": "..."
    }
  ]
}`;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildGeneratedMessages(
  lead: { name: string; company: string; role: string },
  campaign: { name: string },
) {
  return [
    `Oi, ${lead.name}. Vi que você atua como ${lead.role} na ${lead.company} e acredito que a campanha ${campaign.name} pode abrir uma boa conversa sobre prioridades atuais do seu time. Podemos falar rapidamente esta semana?`,
    `Olá, ${lead.name}. Estou entrando em contato por causa da campanha ${campaign.name}. Pelo contexto da ${lead.company}, acredito que existe uma oportunidade de simplificar o processo comercial e gerar mais previsibilidade. Faz sentido conversarmos por alguns minutos?`,
    `${lead.name}, tudo bem? Separei uma abordagem direta ligada a campanha ${campaign.name}, pensando no seu papel como ${lead.role}. A ideia é entender se existe espaço para melhorar a rotina do time sem adicionar complexidade. Posso te enviar alguns horários?`,
  ];
}

async function loadLeadMessagePrompt() {
  return leadMessagePrompt;
}

function stringifyPromptValue(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function formatCustomFields(customFields: unknown) {
  if (!Array.isArray(customFields) || customFields.length === 0) {
    return 'Nenhum campo personalizado informado.';
  }

  const rows = customFields
    .map((field) => {
      if (!field || typeof field !== 'object') return '';
      const item = field as { label?: unknown; value?: unknown };
      const label = stringifyPromptValue(item.label);
      const value = stringifyPromptValue(item.value);
      if (!label || !value) return '';
      return `- ${label}: ${value}`;
    })
    .filter(Boolean);

  return rows.length > 0 ? rows.join('\n') : 'Nenhum campo personalizado informado.';
}

async function renderLeadMessagePrompt(
  lead: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    company?: unknown;
    role?: unknown;
    source?: unknown;
    notes?: unknown;
    custom_fields?: unknown;
  },
  campaign: {
    context?: unknown;
    generation_prompt?: unknown;
  },
) {
  const prompt = await loadLeadMessagePrompt();
  const replacements: Record<string, string> = {
    '{{lead.name}}': stringifyPromptValue(lead.name),
    '{{lead.email}}': stringifyPromptValue(lead.email),
    '{{lead.phone}}': stringifyPromptValue(lead.phone),
    '{{lead.company}}': stringifyPromptValue(lead.company),
    '{{lead.role}}': stringifyPromptValue(lead.role),
    '{{lead.source}}': stringifyPromptValue(lead.source),
    '{{lead.notes}}': stringifyPromptValue(lead.notes),
    '{{custom_fields}}': formatCustomFields(lead.custom_fields),
    '{{campaign.context}}': stringifyPromptValue(campaign.context),
    '{{campaign.generation_prompt}}': stringifyPromptValue(campaign.generation_prompt),
  };

  return Object.entries(replacements).reduce(
    (current, [placeholder, value]) => current.replaceAll(placeholder, value),
    prompt,
  );
}

function parseLeadMessages(content: string) {
  const trimmed = content.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const jsonText = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
  const payload = JSON.parse(jsonText) as {
    messages?: Array<{ message?: unknown }>;
  };
  const messages = (payload.messages || [])
    .map((item) => stringifyPromptValue(item.message))
    .filter(Boolean)
    .slice(0, 3);

  if (messages.length !== 3) {
    throw new Error('A LLM nao retornou exatamente 3 mensagens.');
  }

  return messages;
}

async function generateLeadMessagesWithGroq(apiKey: string, model: string, prompt: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    return { ok: false as const, messages: [] as string[] };
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('A LLM nao retornou conteudo.');

  return { ok: true as const, messages: parseLeadMessages(content) };
}

async function generateLeadMessages(
  llmSetting: { model: string; api_key_ciphertext: string },
  lead: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    company?: unknown;
    role?: unknown;
    source?: unknown;
    notes?: unknown;
    custom_fields?: unknown;
  },
  campaign: {
    context?: unknown;
    generation_prompt?: unknown;
  },
) {
  const apiKey = await decryptApiKey(llmSetting.api_key_ciphertext);
  const prompt = await renderLeadMessagePrompt(lead, campaign);
  const result = await generateLeadMessagesWithGroq(apiKey, llmSetting.model, prompt);

  if (!result.ok) {
    throw new Error('Nao foi possivel gerar mensagens com a LLM configurada.');
  }

  return result.messages;
}

function maskApiKey(apiKey: string) {
  if (apiKey.length <= 10) return `${apiKey.slice(0, 3)}...${apiKey.slice(-2)}`;
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function getLlmEncryptionKey() {
  const secret = Deno.env.get('LLM_ENCRYPTION_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptApiKey(apiKey: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getLlmEncryptionKey();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(apiKey),
  );

  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

async function decryptApiKey(encrypted: string) {
  const [ivBase64, ciphertextBase64] = encrypted.split('.');
  if (!ivBase64 || !ciphertextBase64) throw new Error('Invalid encrypted API key');

  const key = await getLlmEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivBase64) },
    key,
    base64ToBytes(ciphertextBase64),
  );

  return new TextDecoder().decode(plaintext);
}

async function fetchGroqModels(apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      models: [] as Array<{ id: string; ownedBy?: string }>,
    };
  }

  const payload = await response.json() as {
    data?: Array<{ id?: string; owned_by?: string }>;
  };
  const models = (payload.data || [])
    .filter((model) => Boolean(model.id))
    .map((model) => ({ id: String(model.id), ownedBy: model.owned_by }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { ok: true, status: response.status, models };
}

async function getWorkspaceLlmSetting(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_llm_settings')
    .select('workspace_id,provider,model,api_key_ciphertext,api_key_preview,validated_at,updated_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function mapLlmSettingResponse(setting: {
  provider?: string | null;
  model?: string | null;
  api_key_preview?: string | null;
  validated_at?: string | null;
  updated_at?: string | null;
} | null) {
  return {
    provider: 'groq',
    model: setting?.model || null,
    apiKeyPreview: setting?.api_key_preview || null,
    isConfigured: Boolean(setting?.model && setting?.api_key_preview),
    validatedAt: setting?.validated_at || null,
    updatedAt: setting?.updated_at || null,
  };
}

async function getTriggerCampaign(
  supabase: SupabaseClient,
  workspaceId: string,
  funnelId: string,
) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id,name,context,generation_prompt')
    .eq('workspace_id', workspaceId)
    .eq('trigger_funnel_id', funnelId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

async function readJson(req: Request) {
  return await req.json().catch(() => ({}));
}

function getPathParts(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const functionIndex = parts.findIndex((part) => part === 'api');

  if (functionIndex >= 0) return parts.slice(functionIndex + 1);

  return parts;
}

function createAnonClient(authHeader?: string) {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

function createAdminClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAuthHeader(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');
  return authHeader;
}

function getBearerToken(authHeader: string) {
  return authHeader.replace(/^Bearer\s+/i, '');
}

async function getAuthedUser(supabase: SupabaseClient, authHeader: string) {
  const { data, error } = await supabase.auth.getUser(getBearerToken(authHeader));

  if (error || !data.user) {
    throw new Error(error?.message || 'Invalid Authorization header');
  }

  return data.user;
}

function isPublicRoute(method: string, pathKey: string) {
  return method === 'POST' && (pathKey === 'user/auth' || pathKey === 'user');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const parts = getPathParts(req);
    const [resource, subresource] = parts;
    const pathKey = parts.join('/');

    if (pathKey === 'user/auth' && req.method === 'POST') {
      const { email, password } = loginSchema.parse(await readJson(req));
      const supabase = createAnonClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return jsonResponse({ error: error.message }, 401);
      if (!data.session || !data.user) {
        return jsonResponse({ error: 'No session returned' }, 401);
      }

      const authedClient = createAnonClient(`Bearer ${data.session.access_token}`);
      const { data: profile } = await authedClient
        .from('profiles')
        .select('name,email')
        .eq('id', data.user.id)
        .maybeSingle();

      return jsonResponse({
        access_token: data.session.access_token,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: {
          id: data.user.id,
          name: profile?.name ?? data.user.user_metadata?.name ?? null,
          email: profile?.email ?? data.user.email,
        },
      });
    }

    if (pathKey === 'user' && req.method === 'POST') {
      const { name, email, password } = signupSchema.parse(await readJson(req));
      const supabase = createAnonClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) return jsonResponse({ error: error.message }, 400);
      if (!data.session || !data.user) {
        return jsonResponse({
          error: 'Signup created, but no session was returned.',
        }, 400);
      }

      const authedClient = createAnonClient(`Bearer ${data.session.access_token}`);
      const { error: profileError } = await authedClient.from('profiles').insert({
        id: data.user.id,
        name,
        email,
      });

      if (profileError) {
        await createAdminClient().auth.admin.deleteUser(data.user.id);
        return jsonResponse({ error: profileError.message }, 400);
      }

      return jsonResponse({
        access_token: data.session.access_token,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: {
          id: data.user.id,
          name,
          email,
        },
      }, 201);
    }

    if (!isPublicRoute(req.method, pathKey)) {
      const authHeader = getAuthHeader(req);
      const supabase = createAnonClient(authHeader);
      const user = await getAuthedUser(supabase, authHeader);
      const authUserId = user.id;

      if (resource === 'user' && parts.length === 2) {
        const targetId = subresource;
        if (targetId !== authUserId) {
          return jsonResponse({ error: 'Forbidden' }, 403);
        }

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('profiles')
            .select('name,email')
            .eq('id', targetId)
            .single();

          if (error) return jsonResponse({ error: error.message }, 404);

          return jsonResponse({
            name: data.name,
            email: data.email,
          });
        }

        if (req.method === 'PUT') {
          const patch = updateUserSchema.parse(await readJson(req));
          const updatePayload: Json = {};
          const authUpdatePayload: AuthUpdatePayload = {};

          if (patch.name) updatePayload.name = patch.name;
          if (patch.email) {
            updatePayload.email = patch.email;
            authUpdatePayload.email = patch.email;
          }

          if (patch.name) {
            authUpdatePayload.user_metadata = { name: patch.name };
          }

          if (Object.keys(authUpdatePayload).length > 0) {
            const { error } = await createAdminClient().auth.admin.updateUserById(
              targetId,
              authUpdatePayload,
            );

            if (error) return jsonResponse({ error: error.message }, 400);
          }

          const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', targetId);

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ ok: true });
        }

        if (req.method === 'DELETE') {
          const { error } = await createAdminClient().auth.admin.deleteUser(targetId);

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ ok: true });
        }
      }

      if (resource === 'workspace' && parts.length === 1) {
        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('workspaces')
            .select(workspaceSelect)
            .order('created_at', { ascending: false });

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ workspaces: data });
        }

        if (req.method === 'POST') {
          const { name } = createWorkspaceSchema.parse(await readJson(req));
          const { data, error } = await supabase
            .from('workspaces')
            .insert({ name, owner_id: authUserId })
            .select(workspaceSelect)
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);

          const { error: funnelError } = await supabase.from('funnels').insert(
            defaultFunnels.map((funnelName, index) => ({
              workspace_id: data.id,
              name: funnelName,
              sort_order: index,
            })),
          );

          if (funnelError) return jsonResponse({ error: funnelError.message }, 400);

          const { data: destinationFunnel, error: destinationFunnelError } = await supabase
            .from('funnels')
            .select('id')
            .eq('workspace_id', data.id)
            .eq('name', 'Tentando contato')
            .maybeSingle();

          if (destinationFunnelError) return jsonResponse({ error: destinationFunnelError.message }, 400);

          if (destinationFunnel) {
            const { data: updatedWorkspace, error: destinationUpdateError } = await supabase
              .from('workspaces')
              .update({ auto_message_destination_funnel_id: destinationFunnel.id })
              .eq('id', data.id)
              .select(workspaceSelect)
              .single();

            if (destinationUpdateError) return jsonResponse({ error: destinationUpdateError.message }, 400);
            return jsonResponse(updatedWorkspace, 201);
          }

          return jsonResponse(data, 201);
        }
      }

      if (resource === 'workspace' && parts.length === 2) {
        const targetId = subresource;

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('workspaces')
            .select(workspaceSelect)
            .eq('id', targetId)
            .single();

          if (error) return jsonResponse({ error: error.message }, 404);

          return jsonResponse(data);
        }

        if (req.method === 'PUT') {
          const payload = updateWorkspaceSchema.parse(await readJson(req));
          const updatePayload: Json = {};

          if (payload.name) updatePayload.name = payload.name;

          if (payload.autoMessageDestinationFunnelId) {
            const { data: funnel, error: funnelError } = await supabase
              .from('funnels')
              .select('id')
              .eq('id', payload.autoMessageDestinationFunnelId)
              .eq('workspace_id', targetId)
              .maybeSingle();

            if (funnelError) return jsonResponse({ error: funnelError.message }, 400);
            if (!funnel) return jsonResponse({ error: 'Funil não encontrado' }, 404);

            updatePayload.auto_message_destination_funnel_id = payload.autoMessageDestinationFunnelId;
          }

          const { data, error } = await supabase
            .from('workspaces')
            .update(updatePayload)
            .eq('id', targetId)
            .select(workspaceSelect)
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse(data);
        }

        if (req.method === 'DELETE') {
          const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', targetId);

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ ok: true });
        }
      }

      if (resource === 'workspace' && parts.length === 3 && parts[2] === 'llm') {
        const workspaceId = subresource;
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        if (req.method === 'GET') {
          const setting = await getWorkspaceLlmSetting(supabase, workspaceId);
          return jsonResponse(mapLlmSettingResponse(setting));
        }

        if (req.method === 'PUT') {
          const payload = llmSettingsSchema.parse(await readJson(req));
          const existing = await getWorkspaceLlmSetting(supabase, workspaceId);
          const apiKey = payload.apiKey || (existing ? await decryptApiKey(existing.api_key_ciphertext) : '');

          if (!apiKey) {
            return jsonResponse({ error: 'Informe uma chave de API Groq.' }, 400);
          }

          const modelsResponse = await fetchGroqModels(apiKey);
          if (!modelsResponse.ok) {
            return jsonResponse({ error: 'Chave de API Groq inválida.' }, 400);
          }

          const hasModel = modelsResponse.models.some((model) => model.id === payload.model);
          if (!hasModel) {
            return jsonResponse({ error: 'Modelo não disponível para esta chave Groq.' }, 400);
          }

          const encryptedApiKey = payload.apiKey
            ? await encryptApiKey(apiKey)
            : existing!.api_key_ciphertext;
          const apiKeyPreview = payload.apiKey
            ? maskApiKey(apiKey)
            : existing!.api_key_preview;
          const now = new Date().toISOString();

          const { data, error } = await adminClient
            .from('workspace_llm_settings')
            .upsert({
              workspace_id: workspaceId,
              provider: 'groq',
              model: payload.model,
              api_key_ciphertext: encryptedApiKey,
              api_key_preview: apiKeyPreview,
              validated_at: now,
              updated_at: now,
            }, { onConflict: 'workspace_id' })
            .select('provider,model,api_key_preview,validated_at,updated_at')
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse(mapLlmSettingResponse(data));
        }
      }

      if (resource === 'workspace' && parts.length === 4 && parts[2] === 'llm' && parts[3] === 'models') {
        const workspaceId = subresource;

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        if (req.method === 'POST') {
          const payload = llmModelsSchema.parse(await readJson(req));
          const existing = await getWorkspaceLlmSetting(supabase, workspaceId);
          const apiKey = payload.apiKey || (existing ? await decryptApiKey(existing.api_key_ciphertext) : '');

          if (!apiKey) {
            return jsonResponse({ error: 'Informe uma chave de API Groq para listar modelos.' }, 400);
          }

          const modelsResponse = await fetchGroqModels(apiKey);
          if (!modelsResponse.ok) {
            return jsonResponse({ error: 'Chave de API Groq inválida.' }, 400);
          }

          return jsonResponse({ models: modelsResponse.models });
        }
      }

      if (resource === 'workspace' && parts.length === 3 && parts[2] === 'funnels') {
        const workspaceId = subresource;

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('funnels')
            .select('id,workspace_id,name,sort_order,created_at')
            .eq('workspace_id', workspaceId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ funnels: data });
        }

        if (req.method === 'POST') {
          const { name } = funnelSchema.parse(await readJson(req));
          const { data: lastFunnel, error: lastFunnelError } = await supabase
            .from('funnels')
            .select('sort_order')
            .eq('workspace_id', workspaceId)
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastFunnelError) return jsonResponse({ error: lastFunnelError.message }, 400);

          const { data, error } = await supabase
            .from('funnels')
            .insert({
              workspace_id: workspaceId,
              name,
              sort_order: (lastFunnel?.sort_order ?? -1) + 1,
            })
            .select('id,workspace_id,name,sort_order,created_at')
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse(data, 201);
        }
      }

      if (resource === 'workspace' && parts.length === 4 && parts[2] === 'funnels') {
        const workspaceId = subresource;
        const funnelId = parts[3];
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        const { data: funnel, error: funnelError } = await supabase
          .from('funnels')
          .select('id')
          .eq('id', funnelId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (funnelError) return jsonResponse({ error: funnelError.message }, 400);
        if (!funnel) return jsonResponse({ error: 'Funil não encontrado' }, 404);

        if (req.method === 'PUT') {
          const { name } = funnelSchema.parse(await readJson(req));
          const { data, error } = await adminClient
            .from('funnels')
            .update({ name })
            .eq('id', funnelId)
            .eq('workspace_id', workspaceId)
            .select('id,workspace_id,name,sort_order,created_at')
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 400);
          if (!data) return jsonResponse({ error: 'Funil não encontrado' }, 404);

          return jsonResponse(data);
        }

        if (req.method === 'DELETE') {
          const { count, error: countError } = await adminClient
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('funnel_id', funnelId);

          if (countError) return jsonResponse({ error: countError.message }, 400);
          if ((count ?? 0) > 0) {
            return jsonResponse({ error: 'Esvazie o funil antes de excluí-lo' }, 400);
          }

          const { data, error } = await adminClient
            .from('funnels')
            .delete()
            .eq('id', funnelId)
            .eq('workspace_id', workspaceId)
            .select('id')
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 400);
          if (!data) return jsonResponse({ error: 'Funil não encontrado' }, 404);

          return jsonResponse({ ok: true });
        }
      }

      if (resource === 'workspace' && parts.length === 3 && parts[2] === 'campaigns') {
        const workspaceId = subresource;

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace nÃ£o encontrado' }, 404);

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('campaigns')
            .select('id,workspace_id,trigger_funnel_id,name,context,generation_prompt,created_at,updated_at')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ campaigns: data });
        }

        if (req.method === 'POST') {
          const campaign = campaignSchema.parse(await readJson(req));

          if (campaign.triggerFunnelId) {
            const { data: funnel, error: funnelError } = await supabase
              .from('funnels')
              .select('id')
              .eq('id', campaign.triggerFunnelId)
              .eq('workspace_id', workspaceId)
              .maybeSingle();

            if (funnelError) return jsonResponse({ error: funnelError.message }, 400);
        if (!funnel) return jsonResponse({ error: 'Funil nÃ£o encontrado' }, 404);

          }

          const { data, error } = await supabase
            .from('campaigns')
            .insert({
              workspace_id: workspaceId,
              trigger_funnel_id: campaign.triggerFunnelId,
              name: campaign.name,
              context: campaign.context,
              generation_prompt: campaign.generationPrompt,
            })
            .select('id,workspace_id,trigger_funnel_id,name,context,generation_prompt,created_at,updated_at')
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse(data, 201);
        }
      }

      if (resource === 'workspace' && parts.length === 4 && parts[2] === 'campaigns') {
        const workspaceId = subresource;
        const campaignId = parts[3];
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace nÃ£o encontrado' }, 404);

        const { data: existingCampaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id')
          .eq('id', campaignId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (campaignError) return jsonResponse({ error: campaignError.message }, 400);
        if (!existingCampaign) return jsonResponse({ error: 'Campanha nÃ£o encontrada' }, 404);

        if (req.method === 'PUT') {
          const campaign = campaignSchema.parse(await readJson(req));

          if (campaign.triggerFunnelId) {
            const { data: funnel, error: funnelError } = await supabase
              .from('funnels')
              .select('id')
              .eq('id', campaign.triggerFunnelId)
              .eq('workspace_id', workspaceId)
              .maybeSingle();

            if (funnelError) return jsonResponse({ error: funnelError.message }, 400);
            if (!funnel) return jsonResponse({ error: 'Funil nÃ£o encontrado' }, 404);
          }

          const { data, error } = await adminClient
            .from('campaigns')
            .update({
              trigger_funnel_id: campaign.triggerFunnelId,
              name: campaign.name,
              context: campaign.context,
              generation_prompt: campaign.generationPrompt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', campaignId)
            .eq('workspace_id', workspaceId)
            .select('id,workspace_id,trigger_funnel_id,name,context,generation_prompt,created_at,updated_at')
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 400);
          if (!data) return jsonResponse({ error: 'Campanha nÃ£o encontrada' }, 404);

          return jsonResponse(data);
        }

        if (req.method === 'DELETE') {
          const { data, error } = await adminClient
            .from('campaigns')
            .delete()
            .eq('id', campaignId)
            .eq('workspace_id', workspaceId)
            .select('id')
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 400);
          if (!data) return jsonResponse({ error: 'Campanha nÃ£o encontrada' }, 404);

          return jsonResponse({ ok: true });
        }
      }

      if (resource === 'workspace' && parts.length === 3 && parts[2] === 'leads') {
        const workspaceId = subresource;

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('leads')
            .select(leadSelect)
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ leads: data });
        }

        if (req.method === 'POST') {
          const lead = leadSchema.parse(await readJson(req));
          const funnelQuery = supabase
            .from('funnels')
            .select('id')
            .eq('workspace_id', workspaceId);

          const { data: targetFunnel, error: targetFunnelError } = await (
            lead.funnelId
              ? funnelQuery.eq('id', lead.funnelId)
              : funnelQuery.order('sort_order', { ascending: true }).limit(1)
          )
            .maybeSingle();

          if (targetFunnelError) return jsonResponse({ error: targetFunnelError.message }, 400);
          const triggerCampaign = targetFunnel
            ? await getTriggerCampaign(supabase, workspaceId, targetFunnel.id)
            : null;
          const llmSetting = triggerCampaign
            ? await getWorkspaceLlmSetting(supabase, workspaceId)
            : null;
          const generatedMessages = triggerCampaign
            && llmSetting?.model
            && llmSetting?.api_key_ciphertext
            ? await generateLeadMessages(
              llmSetting,
              {
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                role: lead.role,
                source: lead.source,
                notes: lead.notes,
                custom_fields: lead.customFields,
              },
              triggerCampaign,
            )
            : [];
          if (!targetFunnel) return jsonResponse({ error: 'Funil não encontrado' }, 404);

          const { data, error } = await supabase
            .from('leads')
            .insert({
              workspace_id: workspaceId,
              funnel_id: targetFunnel.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              role: lead.role,
              source: lead.source,
              notes: lead.notes,
              custom_fields: lead.customFields,
              generated_messages: generatedMessages,
              notification: Boolean(triggerCampaign && llmSetting?.model && llmSetting?.api_key_ciphertext),
            })
            .select(leadSelect)
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse(data, 201);
        }
      }

      if (resource === 'workspace' && parts.length === 4 && parts[2] === 'leads') {
        const workspaceId = subresource;
        const leadId = parts[3];
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        if (req.method === 'PUT') {
          const lead = leadSchema.parse(await readJson(req));
          const { data, error } = await adminClient
            .from('leads')
            .update({
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              role: lead.role,
              source: lead.source,
              notes: lead.notes,
              custom_fields: lead.customFields,
            })
            .eq('id', leadId)
            .eq('workspace_id', workspaceId)
            .select(leadSelect)
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 400);
          if (!data) return jsonResponse({ error: 'Lead não encontrado' }, 404);

          return jsonResponse(data);
        }

        if (req.method === 'DELETE') {
          const { data, error } = await adminClient
            .from('leads')
            .delete()
            .eq('id', leadId)
            .eq('workspace_id', workspaceId)
            .select('id')
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 400);
          if (!data) return jsonResponse({ error: 'Lead não encontrado' }, 404);

          return jsonResponse({ ok: true });
        }
      }

      if (resource === 'workspace' && parts.length === 5 && parts[2] === 'leads' && parts[4] === 'funnel') {
        const workspaceId = subresource;
        const leadId = parts[3];
        const { funnelId } = moveLeadSchema.parse(await readJson(req));
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        const { data: funnel, error: funnelError } = await supabase
          .from('funnels')
          .select('id')
          .eq('id', funnelId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (funnelError) return jsonResponse({ error: funnelError.message }, 400);
        if (!funnel) return jsonResponse({ error: 'Funil não encontrado' }, 404);

        const { data: existingLead, error: existingLeadError } = await supabase
          .from('leads')
          .select('id,name,email,phone,company,role,source,notes,custom_fields')
          .eq('id', leadId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (existingLeadError) return jsonResponse({ error: existingLeadError.message }, 400);
        if (!existingLead) return jsonResponse({ error: 'Lead nÃ£o encontrado' }, 404);

        const triggerCampaign = await getTriggerCampaign(supabase, workspaceId, funnelId);
        const llmSetting = triggerCampaign
          ? await getWorkspaceLlmSetting(supabase, workspaceId)
          : null;
        const updatePayload: Json = { funnel_id: funnelId };

        if (triggerCampaign && llmSetting?.model && llmSetting?.api_key_ciphertext) {
          updatePayload.generated_messages = await generateLeadMessages(
            llmSetting,
            existingLead,
            triggerCampaign,
          );
          updatePayload.notification = true;
        }

        const { data, error } = await adminClient
          .from('leads')
          .update(updatePayload)
          .eq('id', leadId)
          .eq('workspace_id', workspaceId)
          .select(leadSelect)
          .maybeSingle();

        if (error) return jsonResponse({ error: error.message }, 400);
        if (!data) return jsonResponse({ error: 'Lead não encontrado' }, 404);

        return jsonResponse(data);
      }

      if (resource === 'workspace' && parts.length === 5 && parts[2] === 'leads' && parts[4] === 'messages') {
        const workspaceId = subresource;
        const leadId = parts[3];
        const { campaignId } = generateLeadMessagesSchema.parse(await readJson(req));
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace nÃ£o encontrado' }, 404);

        const llmSetting = await getWorkspaceLlmSetting(supabase, workspaceId);
        if (!llmSetting?.model || !llmSetting?.api_key_ciphertext) {
          return jsonResponse({ error: 'Configure a LLM do workspace antes de gerar mensagens.' }, 400);
        }

        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('id,name,email,phone,company,role,source,notes,custom_fields')
          .eq('id', leadId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (leadError) return jsonResponse({ error: leadError.message }, 400);
        if (!lead) return jsonResponse({ error: 'Lead nÃ£o encontrado' }, 404);

        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id,name,context,generation_prompt')
          .eq('id', campaignId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (campaignError) return jsonResponse({ error: campaignError.message }, 400);
        if (!campaign) return jsonResponse({ error: 'Campanha nÃ£o encontrada' }, 404);

        const generatedMessages = await generateLeadMessages(llmSetting, lead, campaign);


        const { data, error } = await adminClient
          .from('leads')
          .update({ generated_messages: generatedMessages })
          .eq('id', leadId)
          .eq('workspace_id', workspaceId)
          .select(leadSelect)
          .maybeSingle();

        if (error) return jsonResponse({ error: error.message }, 400);
        if (!data) return jsonResponse({ error: 'Lead nÃ£o encontrado' }, 404);

        return jsonResponse(data);
      }

      if (resource === 'workspace' && parts.length === 5 && parts[2] === 'leads' && parts[4] === 'send-message') {
        const workspaceId = subresource;
        const leadId = parts[3];
        sendLeadMessageSchema.parse(await readJson(req));
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id,auto_message_destination_funnel_id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace não encontrado' }, 404);

        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('id')
          .eq('id', leadId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (leadError) return jsonResponse({ error: leadError.message }, 400);
        if (!lead) return jsonResponse({ error: 'Lead não encontrado' }, 404);

        let destinationFunnelId = workspace.auto_message_destination_funnel_id as string | null;

        if (destinationFunnelId) {
          const { data: configuredFunnel, error: configuredFunnelError } = await supabase
            .from('funnels')
            .select('id')
            .eq('id', destinationFunnelId)
            .eq('workspace_id', workspaceId)
            .maybeSingle();

          if (configuredFunnelError) return jsonResponse({ error: configuredFunnelError.message }, 400);
          if (!configuredFunnel) destinationFunnelId = null;
        }

        if (!destinationFunnelId) {
          const { data: defaultFunnel, error: defaultFunnelError } = await supabase
            .from('funnels')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('name', 'Tentando contato')
            .maybeSingle();

          if (defaultFunnelError) return jsonResponse({ error: defaultFunnelError.message }, 400);
          destinationFunnelId = defaultFunnel?.id || null;
        }

        if (!destinationFunnelId) {
          return jsonResponse({ error: 'Coluna de destino não encontrada' }, 404);
        }

        const { data, error } = await adminClient
          .from('leads')
          .update({ funnel_id: destinationFunnelId })
          .eq('id', leadId)
          .eq('workspace_id', workspaceId)
          .select(leadSelect)
          .maybeSingle();

        if (error) return jsonResponse({ error: error.message }, 400);
        if (!data) return jsonResponse({ error: 'Lead não encontrado' }, 404);

        return jsonResponse(data);
      }

      if (resource === 'workspace' && parts.length === 5 && parts[2] === 'leads' && parts[4] === 'notification') {
        const workspaceId = subresource;
        const leadId = parts[3];
        const adminClient = createAdminClient();

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('id', workspaceId)
          .eq('owner_id', authUserId)
          .maybeSingle();

        if (workspaceError) return jsonResponse({ error: workspaceError.message }, 400);
        if (!workspace) return jsonResponse({ error: 'Workspace nÃ£o encontrado' }, 404);

        if (req.method === 'PUT') {
          const { data, error } = await adminClient
            .from('leads')
            .update({ notification: false })
            .eq('id', leadId)
            .eq('workspace_id', workspaceId)
            .select(leadSelect)
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 400);
          if (!data) return jsonResponse({ error: 'Lead nÃ£o encontrado' }, 404);

          return jsonResponse(data);
        }
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return jsonResponse({ error: message }, 400);
  }
});
