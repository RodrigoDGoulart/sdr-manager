import axios from 'axios';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/api` : '/functions/v1/api');

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  if (SUPABASE_ANON_KEY) {
    config.headers.apikey = SUPABASE_ANON_KEY;
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  userId: string;
  autoMessageDestinationFunnelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadFieldType = 'text' | 'long_text' | 'number' | 'date';

export interface LeadCustomField {
  label: string;
  type: LeadFieldType;
  value: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  funnelId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  source: string;
  notes: string;
  customFields: LeadCustomField[];
  generatedMessages: string[];
  notification: boolean;
  createdAt: string;
}

export interface Funnel {
  id: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  triggerFunnelId: string | null;
  name: string;
  context: string;
  generationPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LlmModel {
  id: string;
  ownedBy?: string;
}

export interface WorkspaceLlmSettings {
  provider: 'groq';
  model: string;
  apiKeyPreview: string;
  isConfigured: boolean;
  validatedAt: string | null;
  updatedAt: string | null;
}

export type CreateLeadPayload = Omit<Lead, 'id' | 'workspaceId' | 'funnelId' | 'generatedMessages' | 'notification' | 'createdAt'> & {
  funnelId?: string;
};
export type UpdateLeadPayload = CreateLeadPayload;
export type CreateCampaignPayload = Omit<Campaign, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;
export type UpdateCampaignPayload = CreateCampaignPayload;

interface SupabaseAuthResponse {
  access_token: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface SupabaseWorkspace {
  id: string;
  name: string;
  owner_id: string;
  auto_message_destination_funnel_id: string | null;
  created_at: string;
}

interface SupabaseWorkspaceListResponse {
  workspaces: SupabaseWorkspace[];
}

interface SupabaseLead {
  id: string;
  workspace_id: string;
  funnel_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  source: string;
  notes: string;
  custom_fields: LeadCustomField[];
  generated_messages: string[];
  notification: boolean;
  created_at: string;
}

interface SupabaseLeadListResponse {
  leads: SupabaseLead[];
}

interface SupabaseFunnel {
  id: string;
  workspace_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

interface SupabaseFunnelListResponse {
  funnels: SupabaseFunnel[];
}

interface SupabaseCampaign {
  id: string;
  workspace_id: string;
  trigger_funnel_id: string | null;
  name: string;
  context: string;
  generation_prompt: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseCampaignListResponse {
  campaigns: SupabaseCampaign[];
}

interface SupabaseLlmSettings {
  provider: 'groq';
  model: string | null;
  apiKeyPreview: string | null;
  isConfigured: boolean;
  validatedAt: string | null;
  updatedAt: string | null;
}

interface SupabaseLlmModelsResponse {
  models: LlmModel[];
}

interface OkResponse {
  ok: true;
}

function mapAuthResponse(data: SupabaseAuthResponse): AuthResponse {
  return {
    token: data.access_token,
    name: data.user.name || '',
    email: data.user.email || '',
  };
}

function mapWorkspace(data: SupabaseWorkspace): Workspace {
  return {
    id: data.id,
    name: data.name,
    userId: data.owner_id,
    autoMessageDestinationFunnelId: data.auto_message_destination_funnel_id || null,
    createdAt: data.created_at,
    updatedAt: data.created_at,
  };
}

function mapLead(data: SupabaseLead): Lead {
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    funnelId: data.funnel_id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    role: data.role,
    source: data.source,
    notes: data.notes,
    customFields: data.custom_fields || [],
    generatedMessages: data.generated_messages || [],
    notification: data.notification || false,
    createdAt: data.created_at,
  };
}

function mapFunnel(data: SupabaseFunnel): Funnel {
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    sortOrder: data.sort_order,
    createdAt: data.created_at,
  };
}

function mapCampaign(data: SupabaseCampaign): Campaign {
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    triggerFunnelId: data.trigger_funnel_id,
    name: data.name,
    context: data.context,
    generationPrompt: data.generation_prompt,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapLlmSettings(data: SupabaseLlmSettings): WorkspaceLlmSettings {
  return {
    provider: data.provider,
    model: data.model || '',
    apiKeyPreview: data.apiKeyPreview || '',
    isConfigured: data.isConfigured,
    validatedAt: data.validatedAt,
    updatedAt: data.updatedAt,
  };
}

function mapCreateLeadPayload(data: CreateLeadPayload) {
  return {
    funnelId: data.funnelId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    role: data.role,
    source: data.source,
    notes: data.notes,
    customFields: data.customFields,
  };
}

function mapCampaignPayload(data: CreateCampaignPayload) {
  return {
    name: data.name,
    context: data.context,
    generationPrompt: data.generationPrompt,
    triggerFunnelId: data.triggerFunnelId || null,
  };
}

export const userService = {
  login: (email: string, password: string) =>
    api
      .post<SupabaseAuthResponse>('/user/auth', { email, password })
      .then((res) => ({ ...res, data: mapAuthResponse(res.data) })),

  register: (name: string, email: string, password: string) =>
    api
      .post<SupabaseAuthResponse>('/user', { name, email, password })
      .then((res) => ({ ...res, data: mapAuthResponse(res.data) })),

  getById: (id: string) => api.get<UserProfile>(`/user/${id}`),

  update: (id: string, data: { name?: string; email?: string }) =>
    api.put<OkResponse>(`/user/${id}`, data),

  remove: (id: string) => api.delete(`/user/${id}`),
};

export const workspaceService = {
  list: () =>
    api
      .get<SupabaseWorkspaceListResponse>('/workspace')
      .then((res) => ({ ...res, data: res.data.workspaces.map(mapWorkspace) })),

  getById: (id: string) =>
    api
      .get<SupabaseWorkspace>(`/workspace/${id}`)
      .then((res) => ({ ...res, data: mapWorkspace(res.data) })),

  create: (name: string) =>
    api
      .post<SupabaseWorkspace>('/workspace', { name })
      .then((res) => ({ ...res, data: mapWorkspace(res.data) })),

  update: (id: string, name: string) =>
    api
      .put<SupabaseWorkspace>(`/workspace/${id}`, { name })
      .then((res) => ({ ...res, data: mapWorkspace(res.data) })),

  updateAutoMessageDestination: (id: string, funnelId: string) =>
    api
      .put<SupabaseWorkspace>(`/workspace/${id}`, { autoMessageDestinationFunnelId: funnelId })
      .then((res) => ({ ...res, data: mapWorkspace(res.data) })),

  remove: (id: string) => api.delete(`/workspace/${id}`),
};

export const leadService = {
  list: (workspaceId: string) =>
    api
      .get<SupabaseLeadListResponse>(`/workspace/${workspaceId}/leads`)
      .then((res) => ({ ...res, data: res.data.leads.map(mapLead) })),

  create: (workspaceId: string, data: CreateLeadPayload) =>
    api
      .post<SupabaseLead>(`/workspace/${workspaceId}/leads`, mapCreateLeadPayload(data))
      .then((res) => ({ ...res, data: mapLead(res.data) })),

  update: (workspaceId: string, leadId: string, data: UpdateLeadPayload) =>
    api
      .put<SupabaseLead>(`/workspace/${workspaceId}/leads/${leadId}`, mapCreateLeadPayload(data))
      .then((res) => ({ ...res, data: mapLead(res.data) })),

  remove: (workspaceId: string, leadId: string) => api.delete<OkResponse>(`/workspace/${workspaceId}/leads/${leadId}`),

  moveToFunnel: (workspaceId: string, leadId: string, funnelId: string) =>
    api
      .put<SupabaseLead>(`/workspace/${workspaceId}/leads/${leadId}/funnel`, { funnelId })
      .then((res) => ({ ...res, data: mapLead(res.data) })),

  generateMessages: (workspaceId: string, leadId: string, campaignId: string) =>
    api
      .post<SupabaseLead>(`/workspace/${workspaceId}/leads/${leadId}/messages`, { campaignId })
      .then((res) => ({ ...res, data: mapLead(res.data) })),

  sendMessage: (workspaceId: string, leadId: string, message: string) =>
    api
      .post<SupabaseLead>(`/workspace/${workspaceId}/leads/${leadId}/send-message`, { message })
      .then((res) => ({ ...res, data: mapLead(res.data) })),

  clearNotification: (workspaceId: string, leadId: string) =>
    api
      .put<SupabaseLead>(`/workspace/${workspaceId}/leads/${leadId}/notification`, { notification: false })
      .then((res) => ({ ...res, data: mapLead(res.data) })),
};

export const funnelService = {
  list: (workspaceId: string) =>
    api
      .get<SupabaseFunnelListResponse>(`/workspace/${workspaceId}/funnels`)
      .then((res) => ({ ...res, data: res.data.funnels.map(mapFunnel) })),

  create: (workspaceId: string, name = 'Novo funil') =>
    api
      .post<SupabaseFunnel>(`/workspace/${workspaceId}/funnels`, { name })
      .then((res) => ({ ...res, data: mapFunnel(res.data) })),

  update: (workspaceId: string, funnelId: string, name: string) =>
    api
      .put<SupabaseFunnel>(`/workspace/${workspaceId}/funnels/${funnelId}`, { name })
      .then((res) => ({ ...res, data: mapFunnel(res.data) })),

  remove: (workspaceId: string, funnelId: string) => api.delete<OkResponse>(`/workspace/${workspaceId}/funnels/${funnelId}`),
};

export const campaignService = {
  list: (workspaceId: string) =>
    api
      .get<SupabaseCampaignListResponse>(`/workspace/${workspaceId}/campaigns`)
      .then((res) => ({ ...res, data: res.data.campaigns.map(mapCampaign) })),

  create: (workspaceId: string, data: CreateCampaignPayload) =>
    api
      .post<SupabaseCampaign>(`/workspace/${workspaceId}/campaigns`, mapCampaignPayload(data))
      .then((res) => ({ ...res, data: mapCampaign(res.data) })),

  update: (workspaceId: string, campaignId: string, data: UpdateCampaignPayload) =>
    api
      .put<SupabaseCampaign>(`/workspace/${workspaceId}/campaigns/${campaignId}`, mapCampaignPayload(data))
      .then((res) => ({ ...res, data: mapCampaign(res.data) })),

  remove: (workspaceId: string, campaignId: string) =>
    api.delete<OkResponse>(`/workspace/${workspaceId}/campaigns/${campaignId}`),
};

export const llmSettingsService = {
  get: (workspaceId: string) =>
    api
      .get<SupabaseLlmSettings>(`/workspace/${workspaceId}/llm`)
      .then((res) => ({ ...res, data: mapLlmSettings(res.data) })),

  listModels: (workspaceId: string, apiKey?: string) =>
    api
      .post<SupabaseLlmModelsResponse>(`/workspace/${workspaceId}/llm/models`, { apiKey })
      .then((res) => ({ ...res, data: res.data.models })),

  save: (workspaceId: string, data: { model: string; apiKey?: string }) =>
    api
      .put<SupabaseLlmSettings>(`/workspace/${workspaceId}/llm`, data)
      .then((res) => ({ ...res, data: mapLlmSettings(res.data) })),
};

export default api;
