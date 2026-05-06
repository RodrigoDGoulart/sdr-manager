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

const workspaceSchema = z.object({
  name: z.string().trim().min(1),
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
  name: z.string().trim().min(1),
  email: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  source: z.string().trim().min(1),
  notes: z.string().trim().min(1),
  customFields: z.array(customLeadFieldSchema).default([]),
});

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
            .select('id,name,created_at,owner_id')
            .order('created_at', { ascending: false });

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ workspaces: data });
        }

        if (req.method === 'POST') {
          const { name } = workspaceSchema.parse(await readJson(req));
          const { data, error } = await supabase
            .from('workspaces')
            .insert({ name, owner_id: authUserId })
            .select('id,name,created_at,owner_id')
            .single();

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse(data, 201);
        }
      }

      if (resource === 'workspace' && parts.length === 2) {
        const targetId = subresource;

        if (req.method === 'GET') {
          const { data, error } = await supabase
            .from('workspaces')
            .select('id,name,created_at,owner_id')
            .eq('id', targetId)
            .single();

          if (error) return jsonResponse({ error: error.message }, 404);

          return jsonResponse(data);
        }

        if (req.method === 'PUT') {
          const { name } = workspaceSchema.parse(await readJson(req));
          const { data, error } = await supabase
            .from('workspaces')
            .update({ name })
            .eq('id', targetId)
            .select('id,name,created_at,owner_id')
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
            .select('id,workspace_id,name,email,phone,company,role,source,notes,custom_fields,created_at')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

          if (error) return jsonResponse({ error: error.message }, 400);

          return jsonResponse({ leads: data });
        }

        if (req.method === 'POST') {
          const lead = leadSchema.parse(await readJson(req));
          const { data, error } = await supabase
            .from('leads')
            .insert({
              workspace_id: workspaceId,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              role: lead.role,
              source: lead.source,
              notes: lead.notes,
              custom_fields: lead.customFields,
            })
            .select('id,workspace_id,name,email,phone,company,role,source,notes,custom_fields,created_at')
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
            .select('id,workspace_id,name,email,phone,company,role,source,notes,custom_fields,created_at')
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
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return jsonResponse({ error: message }, 400);
  }
});
