-- =============================================================================
-- Migration 0015: Allow custom payment method types
-- Converts payment_methods.type from an enum to free text so admins can add
-- their own payment method names (e.g. "Coins.ph", "PayPal").
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- Convert the enum column to text ---------------------------------------------
alter table public.payment_methods
  alter column type type text using type::text;

-- The old enum type is no longer referenced; drop it if nothing else uses it.
do $$ begin
  drop type if exists payment_method_type;
exception when dependent_objects_still_exist then null; end $$;
