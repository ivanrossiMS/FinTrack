-- FINTRACK PRODUCTION SCHEMA
-- Author: Antigravity (Elite Full-Stack Engineer)
-- Source of Truth: Supabase

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Profiles Table
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    name text,
    avatar_url text,
    role text default 'USER' check (role in ('USER', 'ADMIN')),
    is_authorized boolean default true,
    plan text default 'FREE' check (plan in ('FREE', 'PREMIUM')),
    phone text,
    profession text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories Table
create table if not exists public.categories (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    type text not null check (type in ('INCOME', 'EXPENSE')),
    color text,
    icon text,
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Suppliers Table
create table if not exists public.suppliers (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    contact text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Payment Methods Table
create table if not exists public.payment_methods (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    type text, -- e.g., 'CREDIT_CARD', 'CASH', 'PIX'
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions Table
create table if not exists public.transactions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    type text not null check (type in ('INCOME', 'EXPENSE')),
    amount decimal(12,2) not null,
    date date not null,
    description text not null,
    category_id uuid references public.categories(id) on delete set null,
    supplier_id uuid references public.suppliers(id) on delete set null,
    payment_method_id uuid references public.payment_methods(id) on delete set null,
    installment_id uuid,
    installment_number integer,
    total_installments integer,
    is_recurring boolean default false,
    recurrence_count integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Commitments Table (Compromissos)
create table if not exists public.commitments (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    amount decimal(12,2) not null,
    due_date date not null,
    description text not null,
    status text default 'PENDING' check (status in ('PENDING', 'PAID', 'OVERDUE')),
    category_id uuid references public.categories(id) on delete set null,
    supplier_id uuid references public.suppliers(id) on delete set null,
    payment_method_id uuid references public.payment_methods(id) on delete set null,
    transaction_id uuid references public.transactions(id) on delete set null,
    payment_date date,
    installment_id uuid,
    installment_number integer,
    total_installments integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Savings Goals Table
create table if not exists public.savings_goals (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    name text not null,
    target_amount decimal(12,2) not null,
    current_amount decimal(12,2) default 0,
    target_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ROW LEVEL SECURITY (RLS)

-- Profiles
alter table public.profiles enable row level security;

-- Helper function to avoid RLS recursion
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'ADMIN'
  );
end;
$$ language plpgsql security definer;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin(auth.uid()));
create policy "Admins can update all profiles" on public.profiles for update using (public.is_admin(auth.uid()));
create policy "Admins can delete all profiles" on public.profiles for delete using (public.is_admin(auth.uid()));

-- Generic RLS for User Data
do $$
declare
    t text;
begin
    for t in select table_name 
             from information_schema.tables 
             where table_schema = 'public' 
             and table_name in ('categories', 'suppliers', 'payment_methods', 'transactions', 'commitments', 'savings_goals')
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format('create policy "Users can access own %I" on public.%I for all using (auth.uid() = user_id)', t, t, t);
        execute format('create policy "Admins can access all %I" on public.%I for all using (public.is_admin(auth.uid()))', t, t);
    end loop;
end;
$$;

-- 4. FUNCTIONS & TRIGGERS

-- Automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, name, role)
    values (
        new.id, 
        new.email, 
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        case when new.email = 'ivanrossi@outlook.com' then 'ADMIN' else 'USER' end
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Updated at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles for each row execute procedure update_updated_at_column();
create trigger update_transactions_updated_at before update on public.transactions for each row execute procedure update_updated_at_column();
create trigger update_commitments_updated_at before update on public.commitments for each row execute procedure update_updated_at_column();
create trigger update_savings_goals_updated_at before update on public.savings_goals for each row execute procedure update_updated_at_column();

-- 5. PERFORMANCE INDICES
create index if not exists idx_transactions_user_date on public.transactions(user_id, date);
create index if not exists idx_commitments_user_due on public.commitments(user_id, due_date);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_profiles_role on public.profiles(role);

-- 6. RPC: Permantently delete user (Auth + Profile + Data)
create or replace function public.delete_user_permanently(target_id uuid)
returns void as $$
begin
  -- Check if the executor is an admin
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Only admins can delete users permanently.';
  end if;

  -- Protect the main admin account from accidental deletion
  if exists (select 1 from public.profiles where id = target_id and email = 'ivanrossi@outlook.com') then
    raise exception 'Cannot delete the primary administrator account.';
  end if;

  -- Deleting from auth.users triggers cascading deletes in public.profiles (due to references auth.users on delete cascade)
  -- and cascading deletes in other tables referenced by public.profiles.
  delete from auth.users where id = target_id;
end;
$$ language plpgsql security definer;

-- 7. SPECIAL STORAGE BUCKET (Run this in Supabase Dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- create policy "Avatar images are publicly accessible" on storage.objects for select using (bucket_id = 'avatars');
-- create policy "Users can upload their own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
