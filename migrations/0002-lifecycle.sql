ALTER TABLE incidents DROP CONSTRAINT incidents_state_check;
ALTER TABLE incidents DROP CONSTRAINT incidents_revision_check;
ALTER TABLE incidents ADD CHECK(state IN ('reported','triaged','investigating','resolved','closed'));
ALTER TABLE incidents ADD CHECK(revision>=1);
ALTER TABLE incidents ADD COLUMN assignee_id text;
ALTER TABLE incidents ADD COLUMN resolution_summary text;
ALTER TABLE incidents ADD FOREIGN KEY(assignee_id,workspace_id) REFERENCES memberships(user_id,workspace_id);
ALTER TABLE incidents ADD CHECK(state='reported' OR assignee_id IS NOT NULL);
ALTER TABLE incidents ADD CHECK(state NOT IN ('resolved','closed') OR (resolution_summary IS NOT NULL AND char_length(resolution_summary) BETWEEN 10 AND 5000));
CREATE TABLE incident_activity(
 id uuid PRIMARY KEY,incident_id uuid NOT NULL REFERENCES incidents(id),revision integer NOT NULL,
 actor_id text NOT NULL REFERENCES "user"(id),kind text NOT NULL CHECK(kind IN ('triage','assign','investigate','resolve','close','reopen','comment')),
 from_state text NOT NULL,to_state text NOT NULL,note text,assignee_id text,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(incident_id,revision)
);
CREATE TABLE incident_comments(
 id uuid PRIMARY KEY,incident_id uuid NOT NULL REFERENCES incidents(id),activity_id uuid NOT NULL UNIQUE REFERENCES incident_activity(id),
 author_id text NOT NULL REFERENCES "user"(id),body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incident_activity_order ON incident_activity(incident_id,revision DESC);
