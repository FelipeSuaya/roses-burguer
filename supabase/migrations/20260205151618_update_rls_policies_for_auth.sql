-- Update RLS policies for authentication
-- This migration updates existing policies to require authentication

-- Drop existing public policies on orders table
DROP POLICY IF EXISTS "Allow webhook inserts" ON public.orders;
DROP POLICY IF EXISTS "Allow public read" ON public.orders;
DROP POLICY IF EXISTS "Allow public update for status changes" ON public.orders;

-- Create new authenticated policies for orders
CREATE POLICY "Authenticated users can read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (true);

-- Service role can do everything (for n8n webhooks)
CREATE POLICY "Service role full access to orders"
ON public.orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update policies for store_data table
CREATE POLICY "Authenticated users can read store_data"
ON public.store_data
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert store_data"
ON public.store_data
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update store_data"
ON public.store_data
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete store_data"
ON public.store_data
FOR DELETE
TO authenticated
USING (true);

-- Keep n8n_chat_histories policies as-is for external access
-- (These tables are used by n8n webhooks and need public access)

-- Add comment for documentation
COMMENT ON POLICY "Service role full access to orders" ON public.orders IS 'Allows n8n webhooks to create orders via service role key';
