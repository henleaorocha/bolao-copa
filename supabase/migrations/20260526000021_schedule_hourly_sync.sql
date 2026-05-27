-- Enables pg_cron and pg_net extensions and registers an hourly job that
-- POSTs to /api/admin/sync-matches with service-role auth (ADR-003).
-- Target URL and service-role key are sourced from app settings at run time
-- so no secrets are stored in the migration.

-- Enable scheduling and outbound-HTTP extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing job with this name before re-creating (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sync-matches-hourly';

-- Register the hourly authenticated sync job (ADR-001, ADR-003)
SELECT cron.schedule(
  'sync-matches-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.site_url', true) || '/api/admin/sync-matches',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
               ),
    body    := '{}'::jsonb
  )
  $$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin / monitoring helpers (SECURITY DEFINER; service_role-only)
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns metadata for a named cron job; used by admin tooling and tests.
CREATE OR REPLACE FUNCTION public.admin_get_cron_job(p_jobname text)
RETURNS TABLE (
  jobname  text,
  schedule text,
  command  text,
  active   boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, cron
AS $$
  SELECT jobname::text, schedule::text, command::text, active
  FROM cron.job
  WHERE jobname = p_jobname;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_cron_job(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_get_cron_job(text) TO service_role;

-- Returns names of installed extensions matching the supplied list.
CREATE OR REPLACE FUNCTION public.admin_get_installed_extensions(p_names text[])
RETURNS TABLE (extname text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT extname::text
  FROM pg_extension
  WHERE extname = ANY(p_names);
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_installed_extensions(text[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_get_installed_extensions(text[]) TO service_role;
