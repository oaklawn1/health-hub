-- Reliable sync timer. GitHub's own schedule skips or delays runs, so the database starts the sync instead.
-- Every 15 minutes, fetching today and yesterday. (GitHub's 4-a-day runs still refetch 3 days as a backup.)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'garmin-sync';
select cron.schedule('garmin-sync', '*/15 * * * *', $$select public.request_garmin_sync(2)$$);
select jobname, schedule, command from cron.job;
