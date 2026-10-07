ALTER TABLE incidents ADD CONSTRAINT incident_workspace_unique UNIQUE(id,workspace_id);
CREATE TABLE domain_outbox(
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),incident_id uuid NOT NULL REFERENCES incidents(id),
 revision integer NOT NULL,recipients text[] NOT NULL,payload jsonb NOT NULL,dispatched boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(incident_id,revision),UNIQUE(id,workspace_id,incident_id),
 FOREIGN KEY(incident_id,workspace_id) REFERENCES incidents(id,workspace_id)
);
CREATE TABLE private_files(
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),incident_id uuid NOT NULL REFERENCES incidents(id),
 owner_id text NOT NULL REFERENCES "user"(id),kind text NOT NULL CHECK(kind IN ('export','attachment')),
 filename text NOT NULL CHECK(filename ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\.(txt|json)$'),size integer NOT NULL CHECK(size BETWEEN 1 AND 262144),sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ready','deleting','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,workspace_id,incident_id),
 CHECK(kind<>'attachment' OR size<=16384),
 FOREIGN KEY(incident_id,workspace_id) REFERENCES incidents(id,workspace_id)
);
CREATE TABLE async_operations(
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),incident_id uuid NOT NULL REFERENCES incidents(id),
 user_id text NOT NULL REFERENCES "user"(id),kind text NOT NULL CHECK(kind IN ('export','attach','cleanup','notify')),
 request_key text NOT NULL,input_hash text NOT NULL,payload jsonb NOT NULL,file_id uuid REFERENCES private_files(id),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','completed','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0,manual_retries integer NOT NULL DEFAULT 0 CHECK(manual_retries BETWEEN 0 AND 2),job_id uuid,last_error text,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,user_id,request_key),
 FOREIGN KEY(incident_id,workspace_id) REFERENCES incidents(id,workspace_id),
 FOREIGN KEY(file_id,workspace_id,incident_id) REFERENCES private_files(id,workspace_id,incident_id)
);
CREATE INDEX async_user_order ON async_operations(workspace_id,user_id,created_at DESC,id DESC);
CREATE TABLE operation_timeline(
 seq bigserial PRIMARY KEY,operation_id uuid NOT NULL REFERENCES async_operations(id),event text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications(
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),incident_id uuid NOT NULL REFERENCES incidents(id),
 user_id text NOT NULL REFERENCES "user"(id),event_id uuid NOT NULL REFERENCES domain_outbox(id),message text NOT NULL,
 read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,event_id),
 FOREIGN KEY(event_id,workspace_id,incident_id) REFERENCES domain_outbox(id,workspace_id,incident_id)
);
CREATE INDEX private_files_scope ON private_files(workspace_id,incident_id);
CREATE INDEX async_file ON async_operations(file_id);
CREATE INDEX notification_scope ON notifications(workspace_id,user_id,created_at DESC,id DESC);
