-- All application data is accessed through the authenticated Edge Function.
-- Browser clients must never read or mutate the backing KV table directly.
alter table if exists public.kv_store_1f83fbc0 enable row level security;
alter table if exists public.kv_store_1f83fbc0 force row level security;

revoke all on table public.kv_store_1f83fbc0 from anon;
revoke all on table public.kv_store_1f83fbc0 from authenticated;

create table if not exists public.security_rate_limits (
  bucket text primary key,
  request_count integer not null,
  expires_at timestamptz not null
);

alter table public.security_rate_limits enable row level security;
alter table public.security_rate_limits force row level security;
revoke all on table public.security_rate_limits from anon;
revoke all on table public.security_rate_limits from authenticated;

create or replace function public.check_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_bucket) > 160 then
    return false;
  end if;

  insert into public.security_rate_limits (bucket, request_count, expires_at)
  values (
    p_bucket,
    1,
    now() + make_interval(secs => p_window_seconds)
  )
  on conflict (bucket) do update
  set
    request_count = case
      when security_rate_limits.expires_at <= now() then 1
      else security_rate_limits.request_count + 1
    end,
    expires_at = case
      when security_rate_limits.expires_at <= now()
        then now() + make_interval(secs => p_window_seconds)
      else security_rate_limits.expires_at
    end
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Storage originals and display variants live in a private bucket. These
-- policies are intentionally service-role only; the Edge Function proxies
-- the approved display image and never exposes the original object path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'findmystuff-private',
  'findmystuff-private',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read FindMyStuff files" on storage.objects;
drop policy if exists "Authenticated can upload FindMyStuff files" on storage.objects;
