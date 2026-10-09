CREATE TABLE qa_workflows(run_id uuid PRIMARY KEY REFERENCES qa_runs(id),workflow jsonb NOT NULL,workflow_mac text NOT NULL);
CREATE TABLE qa_checks(run_id uuid PRIMARY KEY REFERENCES qa_runs(id),receipt jsonb NOT NULL,receipt_mac text NOT NULL);
CREATE TABLE qa_approvals(id uuid PRIMARY KEY,run_id uuid NOT NULL UNIQUE REFERENCES qa_runs(id),approval jsonb NOT NULL,approval_mac text NOT NULL);
CREATE TABLE qa_reports(run_id uuid PRIMARY KEY REFERENCES qa_runs(id),approval_id uuid NOT NULL UNIQUE REFERENCES qa_approvals(id),report jsonb NOT NULL,report_mac text NOT NULL);
CREATE TRIGGER qa_checks_immutable BEFORE UPDATE OR DELETE ON qa_checks FOR EACH ROW EXECUTE FUNCTION qa_append_only();
CREATE TRIGGER qa_approvals_immutable BEFORE UPDATE OR DELETE ON qa_approvals FOR EACH ROW EXECUTE FUNCTION qa_append_only();
CREATE TRIGGER qa_reports_immutable BEFORE UPDATE OR DELETE ON qa_reports FOR EACH ROW EXECUTE FUNCTION qa_append_only();
