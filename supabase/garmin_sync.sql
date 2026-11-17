-- "Sync Garmin now" button: asks GitHub to run the sync workflow.
-- The GitHub token lives in sync_state (key 'github_dispatch', value {"token": "..."}), which the app can never read.
create extension if not exists http with schema extensions;

create or replace function public.request_garmin_sync()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare tok text; res extensions.http_response;
begin
  select value->>'token' into tok from public.sync_state where key = 'github_dispatch';
  if tok is null or tok = '' then return 'no_token'; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '15000');
  select * into res from extensions.http((
    'POST',
    'https://api.github.com/repos/oaklawn1/health-hub/actions/workflows/sync.yml/dispatches',
    array[extensions.http_header('Authorization', 'Bearer ' || tok),
          extensions.http_header('Accept', 'application/vnd.github+json'),
          extensions.http_header('User-Agent', 'health-hub')],
    'application/json',
    '{"ref":"main"}')::extensions.http_request);
  return case when res.status = 204 then 'ok' else 'error ' || res.status end;
end;
$$;

revoke all on function public.request_garmin_sync() from public, anon;
grant execute on function public.request_garmin_sync() to authenticated;
