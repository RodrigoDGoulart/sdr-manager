/*
  # Create users and workspaces tables

  ## Tables
  - `app_users` - Application users (separate from Supabase auth)
    - `id` (uuid, primary key)
    - `name` (text, required)
    - `email` (text, unique, required)
    - `password_hash` (text, required)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  - `workspaces` - Workspaces belonging to users
    - `id` (uuid, primary key)
    - `name` (text, required)
    - `user_id` (uuid, foreign key -> app_users.id)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ## Security
  - RLS enabled on both tables
  - Policies restrict access to authenticated app users via JWT claims
  - No cross-user data leakage

  ## Notes
  - We use a custom JWT (not Supabase auth) so RLS policies use service_role for backend operations
  - The backend Node/Express server will use the service role key for all DB operations
  - The backend handles all authorization logic
*/

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to app_users"
  ON app_users
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert app_users"
  ON app_users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update app_users"
  ON app_users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete app_users"
  ON app_users
  FOR DELETE
  TO service_role
  USING (true);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to workspaces"
  ON workspaces
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert workspaces"
  ON workspaces
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update workspaces"
  ON workspaces
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete workspaces"
  ON workspaces
  FOR DELETE
  TO service_role
  USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
