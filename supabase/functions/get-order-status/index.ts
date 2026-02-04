import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_number } = await req.json();

    if (!order_number) {
      return new Response(
        JSON.stringify({ error: 'order_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking status for order #${order_number}`);

    // Get the most recent order with this order_number from today
    const { data: order, error } = await supabase
      .from('orders')
      .select('order_number, status, cadete_salio, nombre, direccion_envio, created_at')
      .eq('order_number', order_number)
      .gte('fecha', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ 
          found: false,
          message: `No se encontró el pedido #${order_number} de hoy` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if it's a pickup order
    const direccion = order.direccion_envio?.toLowerCase() || '';
    const isPickup = direccion.includes('retira') || direccion.includes('retiro') || direccion === 'local';

    let message: string;
    if (order.cadete_salio) {
      if (isPickup) {
        message = `El pedido #${order.order_number} está listo para retirar en el local`;
      } else {
        message = `El cadete ya salió con el pedido #${order.order_number}`;
      }
    } else {
      if (order.status === 'completed') {
        message = isPickup 
          ? `El pedido #${order.order_number} está listo` 
          : `El pedido #${order.order_number} está listo pero el cadete aún no salió`;
      } else {
        message = `El pedido #${order.order_number} está en preparación`;
      }
    }

    return new Response(
      JSON.stringify({
        found: true,
        order_number: order.order_number,
        status: order.status,
        cadete_salio: order.cadete_salio,
        listo_para_retirar: isPickup && order.cadete_salio,
        es_retiro: isPickup,
        nombre: order.nombre,
        direccion_envio: order.direccion_envio,
        message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
