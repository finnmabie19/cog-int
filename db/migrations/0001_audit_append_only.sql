-- Make audit_log append-only at the database level: even the writable `app`
-- role cannot rewrite history.
CREATE OR REPLACE FUNCTION reject_audit_log_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION reject_audit_log_change();
