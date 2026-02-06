import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase client with the auth token
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        // Verify the user is authenticated
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get the email to delete from the request body
        const { email } = await req.json();
        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create admin client with service role key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // Find user by email in auth.users
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            console.error('Error listing users:', listError);
        }

        const userToDelete = authUsers?.users?.find(u => u.email === email);

        // Delete from whitelist first
        const { error: whitelistError } = await supabaseAdmin
            .from('email_whitelist')
            .delete()
            .eq('email', email.toLowerCase());

        if (whitelistError) {
            console.error('Error deleting from whitelist:', whitelistError);
            return new Response(
                JSON.stringify({ error: 'Failed to delete from whitelist', details: whitelistError }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // If user exists in auth, delete them
        if (userToDelete) {
            const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(
                userToDelete.id
            );

            if (deleteUserError) {
                console.error('Error deleting auth user:', deleteUserError);
                return new Response(
                    JSON.stringify({
                        error: 'Deleted from whitelist but failed to delete user account',
                        details: deleteUserError
                    }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Email removed from whitelist and user account deleted',
                    deletedUser: true
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // User didn't exist in auth, only deleted from whitelist
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Email removed from whitelist (no user account found)',
                deletedUser: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
