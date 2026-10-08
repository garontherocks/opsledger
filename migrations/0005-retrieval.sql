CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE knowledge_chunks(
 id uuid PRIMARY KEY,runbook_id uuid NOT NULL,version integer NOT NULL,
 content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
 model text NOT NULL,digest text NOT NULL CHECK(digest ~ '^sha256:[a-f0-9]{64}$'),
 index_version text NOT NULL CHECK(index_version='chunk-v1-768'),
 start_offset integer NOT NULL CHECK(start_offset>=0),end_offset integer NOT NULL CHECK(end_offset>start_offset),
 chunk_text text NOT NULL CHECK(char_length(chunk_text) BETWEEN 1 AND 1200),embedding vector(768) NOT NULL,
 FOREIGN KEY(runbook_id,version) REFERENCES runbook_versions(runbook_id,number),
 UNIQUE(runbook_id,version,digest,index_version,start_offset)
);
CREATE INDEX knowledge_chunks_source ON knowledge_chunks(runbook_id,version);
CREATE FUNCTION purge_obsolete_chunks() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 DELETE FROM knowledge_chunks WHERE runbook_id=NEW.id AND version IS DISTINCT FROM NEW.published_version;
 RETURN NEW;
END $$;
CREATE TRIGGER chunks_publication AFTER UPDATE OF published_version ON runbooks FOR EACH ROW EXECUTE FUNCTION purge_obsolete_chunks();
