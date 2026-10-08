CREATE TABLE ai_feedback(
 run_id uuid PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES workspaces(id),user_id text NOT NULL REFERENCES "user"(id),
 decision text NOT NULL CHECK(decision IN ('accepted','edited','rejected')),
 reason text NOT NULL CHECK(reason IN ('helpful','factual-error','citation-error','missing-context','other')),
 prompt_version text NOT NULL,context_hash text NOT NULL,model_digest text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER feedback_append_only BEFORE UPDATE OR DELETE ON ai_feedback FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
