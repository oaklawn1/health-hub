-- Packaged-food search through the database (Open Food Facts blocks direct searches from websites).
create extension if not exists http with schema extensions;

create or replace function public.food_search(q text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare res extensions.http_response;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '15000');
  select * into res from extensions.http((
    'GET',
    'https://search.openfoodfacts.org/search?page_size=25&fields=product_name,brands,nutriments&q=' || extensions.urlencode(q),
    array[extensions.http_header('User-Agent', 'HealthHub/1.0 (personal app)')],
    null, null)::extensions.http_request);
  if res.status <> 200 then
    raise exception 'Open Food Facts returned %', res.status;
  end if;
  return res.content::jsonb;
end;
$$;

revoke all on function public.food_search(text) from public, anon;
grant execute on function public.food_search(text) to authenticated;
