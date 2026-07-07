-- Reduz a frequência do sync do openfootball de 1/1h para 6/6h.
--
-- Motivo: cortar invocações da Vercel Fluid (Active CPU) durante a Copa. O job
-- POSTa para /api/admin/sync-matches com auth service-role (ADR-003); a URL e a
-- chave vêm das app settings em tempo de execução (nenhum segredo na migration),
-- idêntico a 20260526000021_schedule_hourly_sync.sql.
--
-- TRADE-OFF: resultados/ranking podem levar até 6h para atualizar após o fim de
-- um jogo. Para voltar ao horário, reaplique com o schedule '0 * * * *' (ou use
-- scripts/cron-sync-toggle.mjs para pausar/inspecionar). O nome do job segue
-- 'sync-matches-hourly' para manter a tooling (toggle/testes) apontando para ele.

-- Garante as extensões (idempotente; já habilitadas na 021).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove o job existente antes de recriar (idempotente).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sync-matches-hourly';

-- Recria o job com intervalo de 6 horas (00:00, 06:00, 12:00, 18:00 UTC).
SELECT cron.schedule(
  'sync-matches-hourly',
  '0 */6 * * *',
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
