import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@^4.1.12';

type Json = Record<string, unknown>;

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

          if (patch.name) updatePayload.name = patch.name;
          if (patch.email) updatePayload.email = patch.email;

          if (patch.email) {
            const { error } = await supabase.auth.updateUser({ email: patch.email });
            if (error) return jsonResponse({ error: error.message }, 400);
          }

          if (patch.name) {
            const { error } = await supabase.auth.updateUser({
              data: { name: patch.name },
            });

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
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return jsonResponse({ error: message }, 400);
  }
});
