create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  gallery_name text default 'My Gallery',
  gallery_description text default '이미지와 영상 작업물을 전시하는 개인 미술관입니다.',
  gallery_code text unique not null default ('ART-' || upper(substr(md5(gen_random_uuid()::text), 1, 4))),
  created_at timestamptz not null default now()
);

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Gallery',
  description text,
  gallery_code text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.theme_rooms (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  theme_room_id uuid not null references public.theme_rooms(id) on delete cascade,
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  tools text,
  year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  code text := 'ART-' || upper(substr(md5(new.id::text), 1, 4));
  profile_username text := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'My');
  gallery_title text := profile_username || ' Gallery';
begin
  insert into public.profiles (id, email, username, gallery_name, gallery_description, gallery_code)
  values (
    new.id,
    new.email,
    profile_username,
    gallery_title,
    '이미지와 영상 작업물을 전시하는 개인 미술관입니다.',
    code
  )
  on conflict (id) do nothing;

  insert into public.galleries (user_id, name, description, gallery_code)
  values (
    new.id,
    gallery_title,
    '이미지와 영상 작업물을 전시하는 개인 미술관입니다.',
    code
  )
  on conflict (gallery_code) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.galleries enable row level security;
alter table public.theme_rooms enable row level security;
alter table public.artworks enable row level security;

drop policy if exists "profiles owner select" on public.profiles;
create policy "profiles owner select" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "galleries public read" on public.galleries;
create policy "galleries public read" on public.galleries
for select using (true);

drop policy if exists "galleries owner insert" on public.galleries;
create policy "galleries owner insert" on public.galleries
for insert with check (auth.uid() = user_id);

drop policy if exists "galleries owner update" on public.galleries;
create policy "galleries owner update" on public.galleries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "galleries owner delete" on public.galleries;
create policy "galleries owner delete" on public.galleries
for delete using (auth.uid() = user_id);

drop policy if exists "theme rooms public read" on public.theme_rooms;
create policy "theme rooms public read" on public.theme_rooms
for select using (true);

drop policy if exists "theme rooms owner insert" on public.theme_rooms;
create policy "theme rooms owner insert" on public.theme_rooms
for insert with check (auth.uid() = user_id);

drop policy if exists "theme rooms owner update" on public.theme_rooms;
create policy "theme rooms owner update" on public.theme_rooms
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "theme rooms owner delete" on public.theme_rooms;
create policy "theme rooms owner delete" on public.theme_rooms
for delete using (auth.uid() = user_id);

drop policy if exists "artworks public read" on public.artworks;
create policy "artworks public read" on public.artworks
for select using (true);

drop policy if exists "artworks owner insert" on public.artworks;
create policy "artworks owner insert" on public.artworks
for insert with check (auth.uid() = user_id);

drop policy if exists "artworks owner update" on public.artworks;
create policy "artworks owner update" on public.artworks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "artworks owner delete" on public.artworks;
create policy "artworks owner delete" on public.artworks
for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artwork-media',
  'artwork-media',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "artwork media public read" on storage.objects;
create policy "artwork media public read" on storage.objects
for select using (bucket_id = 'artwork-media');

drop policy if exists "artwork media owner insert" on storage.objects;
create policy "artwork media owner insert" on storage.objects
for insert with check (
  bucket_id = 'artwork-media'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "artwork media owner update" on storage.objects;
create policy "artwork media owner update" on storage.objects
for update using (
  bucket_id = 'artwork-media'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'artwork-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "artwork media owner delete" on storage.objects;
create policy "artwork media owner delete" on storage.objects
for delete using (
  bucket_id = 'artwork-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
