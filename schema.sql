-- SQL Database Schema for Hunter System Tracker

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text,
  avatar_url text,
  xp integer default 0 not null,
  level integer default 1 not null,
  rank text default 'E' not null,
  daily_streak integer default 0 not null,
  last_active_at timestamp with time zone
);

alter table public.profiles enable row level security;

-- QUESTS
create table if not exists public.quests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  type text check (type in ('daily', 'weekly')) not null,
  category text check (category in ('AI/RAG', 'Web Dev', 'Automation', 'Fitness', 'Custom')) default 'Custom' not null,
  difficulty text check (difficulty in ('E', 'D', 'C', 'B', 'A', 'S')) default 'E' not null,
  xp_reward integer not null,
  is_completed boolean default false not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_system boolean default false not null
);

alter table public.quests enable row level security;

-- SLEEP LOGS
create table if not exists public.sleep_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  hours numeric(3,1) check (hours >= 4.0 and hours <= 9.0) not null,
  xp_bonus integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_sleep_date unique (user_id, date)
);

alter table public.sleep_logs enable row level security;

-- ACHIEVEMENTS
create table if not exists public.user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  code text not null,
  title text not null,
  description text not null,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_achievement unique (user_id, code)
);

alter table public.user_achievements enable row level security;

-- DAILY ATTENDANCE LOGS
create table if not exists public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  webdev_completed boolean default false not null,
  jog_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_log_date unique (user_id, date)
);

alter table public.daily_logs enable row level security;

-- Row Level Security (RLS) Rules

-- Profiles
create policy "Users can view all profiles" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Quests
create policy "Users can view their own quests" on public.quests
  for select using (auth.uid() = user_id);

create policy "Users can insert their own quests" on public.quests
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own quests" on public.quests
  for update using (auth.uid() = user_id);

create policy "Users can delete their own quests" on public.quests
  for delete using (auth.uid() = user_id);

-- Sleep Logs
create policy "Users can view their own sleep logs" on public.sleep_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own sleep logs" on public.sleep_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own sleep logs" on public.sleep_logs
  for update using (auth.uid() = user_id);

create policy "Users can delete their own sleep logs" on public.sleep_logs
  for delete using (auth.uid() = user_id);

-- Achievements
create policy "Users can view their own achievements" on public.user_achievements
  for select using (auth.uid() = user_id);

create policy "Users can insert their own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own achievements" on public.user_achievements
  for delete using (auth.uid() = user_id);

-- Daily Logs
create policy "Users can view their own daily logs" on public.daily_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own daily logs" on public.daily_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own daily logs" on public.daily_logs
  for update using (auth.uid() = user_id);

create policy "Users can delete their own daily logs" on public.daily_logs
  for delete using (auth.uid() = user_id);


-- Profile trigger on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url, xp, level, rank)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    0,
    1,
    'E'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to hook up function on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
