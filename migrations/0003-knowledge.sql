CREATE TABLE audit_events(
 seq bigserial PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),
 actor_id text NOT NULL REFERENCES "user"(id),action text NOT NULL,
 object_type text NOT NULL CHECK(object_type IN ('incident','runbook','workspace')),object_id uuid,
 revision integer NOT NULL,request_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_workspace_order ON audit_events(workspace_id,seq DESC);
CREATE FUNCTION deny_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit events are append-only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
CREATE TABLE runbooks(
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),service_id uuid,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),latest_version integer NOT NULL DEFAULT 1,published_version integer,
 FOREIGN KEY(service_id,workspace_id) REFERENCES services(id,workspace_id)
);
CREATE TABLE runbook_versions(
 runbook_id uuid NOT NULL REFERENCES runbooks(id),number integer NOT NULL CHECK(number>=1),
 title text NOT NULL CHECK(char_length(title) BETWEEN 5 AND 120),
 body text NOT NULL CHECK(char_length(body) BETWEEN 10 AND 10000),
 category text NOT NULL CHECK(category IN ('operations','recovery','security')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','withdrawn')),
 content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
 created_by text NOT NULL REFERENCES "user"(id),created_at timestamptz NOT NULL DEFAULT now(),
 search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig,title || ' ' || body)) STORED,
 PRIMARY KEY(runbook_id,number)
);
ALTER TABLE runbooks ADD FOREIGN KEY(id,published_version) REFERENCES runbook_versions(runbook_id,number);
CREATE INDEX runbook_search ON runbook_versions USING gin(search_vector);
CREATE INDEX runbook_workspace ON runbooks(workspace_id);
CREATE FUNCTION keep_runbook_content() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Version content is immutable' USING ERRCODE='23514'; END IF;
 IF ROW(NEW.runbook_id,NEW.number,NEW.title,NEW.body,NEW.category,NEW.content_hash,NEW.created_by,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.runbook_id,OLD.number,OLD.title,OLD.body,OLD.category,OLD.content_hash,OLD.created_by,OLD.created_at)
 THEN RAISE EXCEPTION 'Version content is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER runbook_immutable BEFORE UPDATE OR DELETE ON runbook_versions FOR EACH ROW EXECUTE FUNCTION keep_runbook_content();
CREATE FUNCTION keep_runbook_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.id,NEW.workspace_id,NEW.service_id) IS DISTINCT FROM ROW(OLD.id,OLD.workspace_id,OLD.service_id)
 THEN RAISE EXCEPTION 'Runbook scope is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER runbook_scope BEFORE UPDATE ON runbooks FOR EACH ROW EXECUTE FUNCTION keep_runbook_scope();
