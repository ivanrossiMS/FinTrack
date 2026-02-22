-- FinTrack Database Schema
-- Run this in the Supabase SQL Editor

-- 1. PROFILES Table (Extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  avatar TEXT,
  plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PREMIUM')),
  is_admin BOOLEAN DEFAULT FALSE,
  is_authorized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. CATEGORIES Table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('INCOME', 'EXPENSE')),
  color TEXT,
  icon TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own categories." ON categories FOR SELECT USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "Users can manage own categories." ON categories FOR ALL USING (auth.uid() = user_id);

-- 3. PAYMENT METHODS Table
CREATE TABLE payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own methods." ON payment_methods FOR ALL USING (auth.uid() = user_id);

-- 4. TRANSACTIONS Table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  supplier_id UUID, -- Optional for now
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions." ON transactions FOR ALL USING (auth.uid() = user_id);

-- 5. COMMITMENTS Table
CREATE TABLE commitments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('PENDING', 'PAID')),
  payment_date DATE,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own commitments." ON commitments FOR ALL USING (auth.uid() = user_id);

-- 6. SAVINGS GOALS Table
CREATE TABLE savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  target_date TIMESTAMP WITH TIME ZONE,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goals." ON savings_goals FOR ALL USING (auth.uid() = user_id);
