-- Allow documents without an incorporation case (companies managed without
-- our incorporation service). The documents.documents.case_id column is
-- already nullable; these three tables still required it.

ALTER TABLE documents.document_events
  ALTER COLUMN case_id DROP NOT NULL;

ALTER TABLE documents.document_requests
  ALTER COLUMN case_id DROP NOT NULL;

ALTER TABLE documents.document_shares
  ALTER COLUMN case_id DROP NOT NULL;
