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
  createdAt: string;
  updatedAt: string;
}

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
  created_at: string;
}

interface SupabaseWorkspaceListResponse {
  workspaces: SupabaseWorkspace[];
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
    createdAt: data.created_at,
    updatedAt: data.created_at,
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

  remove: (id: string) => api.delete(`/workspace/${id}`),
};

export default api;
