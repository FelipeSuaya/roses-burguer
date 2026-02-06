# Applying Database Migrations

Since the Supabase CLI requires authentication that must be done manually, you'll need to apply the database migrations through the Supabase dashboard.

## Steps to Apply Migrations

### 1. Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Log in with your account
3. Select your project: `hdizvbyvtlmkwprhdnzr`

### 2. Open SQL Editor

1. Click on "SQL Editor" in the left sidebar
2. Click "New Query"

### 3. Apply Migration 1: Create Whitelist Table

Copy and paste the contents of `supabase/migrations/20260205151617_create_whitelist_table.sql` into the SQL editor and run it.

This will:
- Create the `email_whitelist` table
- Enable RLS
- Add policies for authenticated users
- Insert your email (`felipe@botec.tech`) as the first whitelisted user

### 4. Apply Migration 2: Update RLS Policies

Copy and paste the contents of `supabase/migrations/20260205151618_update_rls_policies_for_auth.sql` into the SQL editor and run it.

This will:
- Update the `orders` table policies to require authentication
- Update the `store_data` table policies to require authentication
- Keep service role access for n8n webhooks

### 5. Regenerate TypeScript Types

After applying the migrations, regenerate the TypeScript types to include the new `email_whitelist` table:

```bash
npx supabase gen types typescript --project-id hdizvbyvtlmkwprhdnzr > src/integrations/supabase/types.ts
```

This command **does** require Supabase CLI authentication. To authenticate:

```bash
npx supabase login
```

Follow the prompts to log in with your Supabase account.

### 6. Verify Migrations

After applying the migrations, verify they worked:

1. In the Supabase dashboard, go to "Table Editor"
2. You should see a new table called `email_whitelist`
3. It should contain one row with `felipe@botec.tech`
4. Check that the `orders` and `store_data` tables still exist

### 7. Test the App

```bash
npm run dev
```

1. You should be redirected to `/login`
2. Try to sign up with `felipe@botec.tech`
3. You should receive a confirmation email
4. Click the confirmation link
5. Log in and verify the app works

## Troubleshooting

### If migrations fail

- Check that you're connected to the right project
- Verify the SQL syntax is correct
- Check the browser console for errors

### If types don't regenerate

- Make sure you're logged in: `npx supabase login`
- Verify the project ID is correct
- Try running the command with `--debug` flag

### If authentication doesn't work

- Verify the migrations were applied successfully
- Check that the `.env` file has the correct Supabase URL and key
- Clear your browser's localStorage and try again
