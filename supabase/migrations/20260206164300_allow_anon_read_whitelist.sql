-- Fix: Allow anonymous users to read whitelist during signup
-- Without this policy, users cannot register because they can't check if their email is whitelisted
-- since they are not yet authenticated

CREATE POLICY "Anonymous users can read whitelist for signup"
ON public.email_whitelist
FOR SELECT
TO anon
USING (true);

-- This policy is safe because:
-- 1. It only allows reading (SELECT), not modification
-- 2. The whitelist only contains email addresses (no sensitive data)
-- 3. It's necessary for the signup flow to work correctly
