import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to generate ESC/POS cancel ticket
function generateCancelTicket(type: 'kitchen' | 'cashier', orderNumber: number, nombre: string): Uint8Array {
  const bytes: number[] = [];
  
  // ESC/POS commands
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;
  const CENTER = [ESC, 0x61, 0x01];
  const LEFT = [ESC, 0x61, 0x00];
  const BOLD_ON = [ESC, 0x45, 0x01];
  const BOLD_OFF = [ESC, 0x45, 0x00];
  const DOUBLE_SIZE = [ESC, 0x21, 0x30]; // Double width and height
  const NORMAL_SIZE = [ESC, 0x21, 0x00]; // Normal size
  const CUT = [GS, 0x56, 0x00];
  
  const addBytes = (...b: number[]) => bytes.push(...b);
  const addText = (text: string) => {
    const encoder = new TextEncoder();
    addBytes(...Array.from(encoder.encode(text)));
  };
  const addLine = () => {
    addText('================================');
    addBytes(LF);
  };
  const newLine = () => addBytes(LF);
  
  // Initialize with center alignment
  addBytes(...CENTER);
  
  // Header
  addBytes(...DOUBLE_SIZE, ...BOLD_ON);
  addText(type === 'kitchen' ? 'COCINA' : 'CAJA');
  addBytes(...BOLD_OFF, LF);
  addLine();
  
  // Order number
  addBytes(...BOLD_ON);
  addText(`PEDIDO #${orderNumber}`);
  addBytes(...BOLD_OFF, LF);
  addLine();
  newLine();
  
  // CANCELADO in big letters
  addBytes(...DOUBLE_SIZE, ...BOLD_ON);
  addText('*** CANCELADO ***');
  addBytes(...BOLD_OFF, LF, ...NORMAL_SIZE);
  newLine();
  
  // Customer name
  addBytes(...LEFT);
  addText(`Cliente: ${nombre}`);
  newLine();
  
  addBytes(LF, LF, LF, LF, LF);
  addBytes(...CUT);
  
  return new Uint8Array(bytes);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let raw;
    try {
      const rawBody = await req.text();
      console.log('Raw request body:', rawBody);
      raw = JSON.parse(rawBody);
      console.log('Parsed JSON successfully:', JSON.stringify(raw, null, 2));
    } catch (parseError: unknown) {
      console.error('JSON Parse Error:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON format', 
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { order_number } = raw;

    if (!order_number) {
      return new Response(
        JSON.stringify({ error: 'order_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find today's latest order by order_number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data: orders, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', order_number)
      .gte('created_at', todayISO)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError || !orders || orders.length === 0) {
      console.error('Order not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Order not found', details: findError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingOrder = orders[0];

    // Check if order was created within last 15 minutes
    const orderCreatedAt = new Date(existingOrder.created_at);
    const now = new Date();
    const timeDiffMinutes = (now.getTime() - orderCreatedAt.getTime()) / (1000 * 60);

    if (timeDiffMinutes > 15) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot delete order', 
          details: 'Order is older than 15 minutes and cannot be deleted'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate cancellation ESC/POS tickets and notify printers
    const kitchenWebhookUrl = 'https://n8nwebhookx.botec.tech/webhook/crearFacturaCocina';
    const cashierWebhookUrl = 'https://n8nwebhookx.botec.tech/webhook/crearFacturaCaja';

try {
      const kitchenTicketBytes = generateCancelTicket('kitchen', existingOrder.order_number, existingOrder.nombre);
      const cashierTicketBytes = generateCancelTicket('cashier', existingOrder.order_number, existingOrder.nombre);
      
      // Convert to base64
      const kitchenB64 = btoa(String.fromCharCode(...kitchenTicketBytes));
      const cashierB64 = btoa(String.fromCharCode(...cashierTicketBytes));

      console.log('Sending cancellation tickets to printers...');

      const kitchenPromise = fetch(kitchenWebhookUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ order_number, ticket: kitchenB64, nombre: existingOrder.nombre, type: 'cancel' }) 
      });
      
      const cashierPromise = fetch(cashierWebhookUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ order_number, ticket: cashierB64, nombre: existingOrder.nombre, type: 'cancel' }) 
      });

      const [kitchenRes, cashierRes] = await Promise.all([kitchenPromise, cashierPromise]);
      
      console.log('Kitchen webhook response:', kitchenRes.status);
      console.log('Cashier webhook response:', cashierRes.status);
    } catch (e) {
      console.error('Cancel print error:', e);
    }

    // Delete the order by id
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', existingOrder.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete order', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order deleted successfully:', order_number);

    return new Response(
      JSON.stringify({ success: true, message: 'Order deleted successfully', order_number }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in delete-order function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
