CREATE TABLE workspaces(id uuid PRIMARY KEY,name text NOT NULL);
CREATE TABLE memberships(
  user_id text NOT NULL REFERENCES "user"(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
  role text NOT NULL CHECK(role IN ('reporter','responder','lead','editor','admin')),active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(user_id,workspace_id)
);
CREATE TABLE services(id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),name text NOT NULL,active boolean NOT NULL DEFAULT true,UNIQUE(id,workspace_id));
CREATE TABLE incidents(
  id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),service_id uuid NOT NULL,
  reporter_id text NOT NULL REFERENCES "user"(id),title text NOT NULL CHECK(char_length(title) BETWEEN 5 AND 120),
  description text NOT NULL CHECK(char_length(description) BETWEEN 10 AND 5000),
  severity text NOT NULL CHECK(severity IN ('low','medium','high','critical')),
  state text NOT NULL DEFAULT 'reported' CHECK(state='reported'),
  revision integer NOT NULL DEFAULT 1 CHECK(revision=1),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(service_id,workspace_id) REFERENCES services(id,workspace_id)
);
CREATE INDEX incident_workspace_order ON incidents(workspace_id,created_at DESC,id DESC);
