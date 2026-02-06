-- Create email_whitelist table
CREATE TABLE IF NOT EXISTS public.email_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_whitelist ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read the whitelist
CREATE POLICY "Authenticated users can read whitelist"
ON public.email_whitelist
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert to whitelist
CREATE POLICY "Authenticated users can add to whitelist"
ON public.email_whitelist
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can delete from whitelist
CREATE POLICY "Authenticated users can remove from whitelist"
ON public.email_whitelist
FOR DELETE
TO authenticated
USING (true);

-- Insert initial email
INSERT INTO public.email_whitelist (email, added_by)
VALUES ('felipe@botec.tech', NULL);

-- Create index on email for faster lookups
CREATE INDEX idx_email_whitelist_email ON public.email_whitelist(email);

-- Add comment for documentation
COMMENT ON TABLE public.email_whitelist IS 'Stores emails allowed to register for the application';
