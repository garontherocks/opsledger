CREATE TABLE qa_runs(
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,owner_id text NOT NULL,
 state jsonb NOT NULL,state_mac text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(owner_id,workspace_id) REFERENCES memberships(user_id,workspace_id),
 UNIQUE(id,workspace_id,owner_id)
);
CREATE TABLE qa_history(
 run_id uuid NOT NULL REFERENCES qa_runs(id),sequence integer NOT NULL CHECK(sequence BETWEEN 1 AND 32),
 operation_key uuid NOT NULL,request_hash text NOT NULL,event jsonb NOT NULL,previous_mac text NOT NULL,event_mac text NOT NULL,
 PRIMARY KEY(run_id,sequence),UNIQUE(run_id,operation_key)
);
CREATE TABLE qa_memory(
 id uuid PRIMARY KEY,run_id uuid NOT NULL REFERENCES qa_runs(id),operation_key uuid NOT NULL,
 finding jsonb NOT NULL,finding_mac text NOT NULL,UNIQUE(run_id,operation_key)
);
CREATE FUNCTION qa_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN RAISE EXCEPTION 'QA ledger is append-only'; END $$;
CREATE TRIGGER qa_history_immutable BEFORE UPDATE OR DELETE ON qa_history FOR EACH ROW EXECUTE FUNCTION qa_append_only();
CREATE TRIGGER qa_memory_immutable BEFORE UPDATE OR DELETE ON qa_memory FOR EACH ROW EXECUTE FUNCTION qa_append_only();
