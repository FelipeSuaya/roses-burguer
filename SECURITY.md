# Security Best Practices

## Overview

This document outlines security best practices for the Roses Burgers Kitchen Display application.

## Environment Variables

### Never Commit Secrets

- **NEVER** commit `.env` files to version control
- The `.env` file contains sensitive credentials that should remain private
- Always ensure `.env` is listed in `.gitignore`

### Current Status

> [!WARNING]
> The Supabase credentials are currently hardcoded in `src/integrations/supabase/client.ts`. While this has been done for convenience, it means the credentials are exposed in the repository history and can be accessed by anyone with access to the code.

### Recommended Actions

1. **Rotate Supabase Keys** (if the repository is public or shared):
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Generate new anon/public key
   - Update the `.env` file with the new key
   - Never commit the `.env` file

2. **Keep `.env` in `.gitignore`**:
   - Verify `.env` is in `.gitignore`
   - If not, add it immediately

3. **Use Environment Variables**:
   - The app now uses environment variables from `.env`
   - These are loaded via Vite as `import.meta.env.VITE_*`

## Row Level Security (RLS)

### Current Setup

All tables now have RLS enabled with the following policies:

1. **orders** table:
   - Authenticated users can read, insert, update, and delete
   - Service role (for n8n webhooks) has full access

2. **store_data** table:
   - Authenticated users can read, insert, update, and delete

3. **email_whitelist** table:
   - Anonymous users can read (required to check whitelist during signup)
   - Authenticated users can read (to check during signup)
   - Authenticated users can insert/delete (to manage the whitelist)

### Best Practices

- **Always enable RLS** on new tables
- **Default deny**: Start with no access, then add specific policies
- **Principle of least privilege**: Only grant necessary permissions
- **Test policies**: Verify they work as expected before deploying

##Authentication

### Email Confirmation

- New users must confirm their email before they can log in
- Confirmation emails are sent by Supabase Auth
- Users who haven't confirmed cannot access the app

### Whitelist System

- Only emails in the `email_whitelist` table can register
- Initial email: `felipe@botec.tech`
- Additional emails can be added through the admin panel at `/admin/whitelist`

### Session Management

- Sessions persist in localStorage
- Auto-refresh tokens keep users logged in
- Default session duration: configurable in Supabase Auth settings

## API Security

### Service Role vs Anon Key

- **Anon Key** (Public):
  - Used by the frontend
  - Limited by RLS policies
  - Safe to expose in client code

- **Service Role Key** (Secret):
  - Bypasses RLS
  - Used by Edge Functions for n8n webhooks
  - **NEVER** expose in client code
  - Should only be in server-side environment variables

### Edge Functions

Current edge functions have `verify_jwt = false` in `supabase/config.toml`. This means:
- They don't require authentication
- They use the service role key for database access
- This is necessary for n8n webhooks to work

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do NOT** open a public GitHub issue
2. Email the security contact directly
3. Provide details about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Regular Security Tasks

### Monthly
- Review user access in whitelist
- Check for unused accounts
- Review RLS policies

### Quarterly
- Rotate API keys (if repository is public)
- Review and update dependencies
- Audit authentication logs in Supabase dashboard

### Annually
- Full security audit
- Review and update this document
- Update team on security best practices

## Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
