import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Clock, DollarSign, Printer } from "lucide-react";
import { formatPaymentMethod } from "@/lib/formatPaymentMethod";

interface OrderItem {
  quantity: number;
  burger_type: string;
  patty_size: string;
  combo: boolean;
  additions?: string[] | null;
  removals?: string[] | null;
  observations?: string | null;
}

interface ExtraItem {
  name: string;
  quantity: number;
  price?: number;
}

interface ItemStatus {
  burger_type: string;
  quantity: number;
  patty_size: string;
  combo: boolean;
  completed: boolean;
}

interface Order {
  id: string;
  order_number: number;
  nombre: string;
  monto: number;
  fecha: string;
  status: string;
  created_at: string;
  items?: OrderItem[];
  item_status?: ItemStatus[];
  direccion_envio?: string;
  metodo_pago?: string;
  cadete_salio?: boolean;
  hora_programada?: string;
  telefono?: string;
  paga_con?: number | null;
  vuelto?: number | null;
  extras?: ExtraItem[] | null;
}

const Kitchen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch initial pending orders
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        const typedOrders = (data || []).map(order => ({
          ...order,
          items: Array.isArray(order.items) ? order.items as unknown as OrderItem[] : undefined,
          item_status: Array.isArray(order.item_status) ? order.item_status as unknown as ItemStatus[] : undefined,
          extras: Array.isArray(order.extras) ? order.extras as unknown as ExtraItem[] : null
        }));
        setOrders(typedOrders);
      }
    };

    fetchOrders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order INSERT:', payload);
          const newOrder = payload.new as Order;
          if (newOrder.status === 'pending') {
            setOrders(prev => [...prev, newOrder]);
            const itemsDesc = newOrder.items?.map(i => `${i.quantity}x ${i.burger_type}`).join(', ') || '';
            toast({
              title: "¡Nuevo Pedido!",
              description: `${newOrder.nombre} - ${itemsDesc}`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order UPDATE:', payload);
          const raw = payload.new as any;
          const updatedOrder: Order = {
            ...raw,
            items: Array.isArray(raw.items) ? (raw.items as OrderItem[]) : undefined,
            item_status: Array.isArray(raw.item_status) ? (raw.item_status as ItemStatus[]) : undefined,
          };
          if (updatedOrder.status === 'completed') {
            setOrders(prev => prev.filter(order => order.id !== updatedOrder.id));
          } else if (updatedOrder.status === 'pending') {
            setOrders(prev => prev.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order DELETE:', payload);
          const deletedOrder = payload.old as Order;
          setOrders(prev => prev.filter(order => order.id !== deletedOrder.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const toggleItemCompleted = async (orderId: string, itemIndex: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.item_status) return;

    const updatedItemStatus = [...order.item_status];
    updatedItemStatus[itemIndex] = {
      ...updatedItemStatus[itemIndex],
      completed: !updatedItemStatus[itemIndex].completed
    };

    const { error } = await supabase
      .from('orders')
      .update({ item_status: updatedItemStatus as any })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating item status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del item",
        variant: "destructive"
      });
    } else {
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, item_status: updatedItemStatus }
          : o
      ));
      
      const item = updatedItemStatus[itemIndex];
      const itemDesc = `${item.quantity}x ${item.burger_type} ${item.patty_size}`;
      const action = item.completed ? "completado" : "pendiente";
      toast({
        title: `Item ${action}`,
        description: `${itemDesc} marcado como ${action}`,
      });
    }
  };

  const markAsCompleted = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar el pedido como completado",
        variant: "destructive"
      });
    } else {
      // Optimistic local update while waiting for realtime
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast({
        title: "Pedido Completado",
        description: "El pedido ha sido marcado como listo",
        variant: "default"
      });
    }
  };

  const markCadeteSalio = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const { error } = await supabase
      .from('orders')
      .update({ cadete_salio: true })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating cadete status:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar el estado",
        variant: "destructive"
      });
      return;
    }

    // Determine if it's pickup or delivery
    const direccion = order.direccion_envio?.toLowerCase() || '';
    const isPickup = direccion.includes('retira') || direccion.includes('retiro') || direccion === 'local';

    // Notify webhook (via Edge Function to avoid browser CORS/no-cors limitations)
    try {
      const webhookPayload = {
        order_number: order.order_number,
        nombre: order.nombre,
        telefono: order.telefono,
        tipo: isPickup ? 'retiro' : 'envio',
        estado: isPickup ? 'listo_para_retirar' : 'cadete_salio',
        direccion_envio: order.direccion_envio,
      };

      console.log('Notifying order status webhook:', webhookPayload);

      const { data, error } = await supabase.functions.invoke('notify-order-status', {
        body: webhookPayload,
      });

      if (error) throw error;
      console.log('Webhook notify result:', data);
    } catch (webhookError) {
      console.error('Error notifying webhook:', webhookError);
      toast({
        title: 'Aviso',
        description: 'El pedido se marcó como listo, pero no se pudo notificar al webhook.',
      });
    }

    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, cadete_salio: true } : o
    ));
    
    toast({
      title: isPickup ? "Listo para retirar" : "Cadete en camino",
      description: isPickup ? "El cliente será notificado" : "El cadete ha salido con el pedido",
    });
  };

  const reprintTicket = async (order: Order) => {
    try {
      // Generate ESC/POS ticket for cashier
      const generateCashierTicket = (): Uint8Array => {
        const bytes: number[] = [];
        
        // ESC/POS commands
        const ESC = 0x1B;
        const GS = 0x1D;
        const LF = 0x0A;
        const CENTER = [ESC, 0x61, 0x01];
        const BOLD_ON = [ESC, 0x45, 0x01];
        const BOLD_OFF = [ESC, 0x45, 0x00];
        const DOUBLE_SIZE = [ESC, 0x21, 0x30];
        const MEDIUM_SIZE = [ESC, 0x21, 0x10];
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
        
        addBytes(...CENTER);
        addBytes(...DOUBLE_SIZE, ...BOLD_ON);
        addText('CAJA');
        addBytes(...BOLD_OFF, LF);
        addLine();
        addBytes(...BOLD_ON);
        addText(`PEDIDO #${order.order_number}`);
        addBytes(...BOLD_OFF, LF, ...MEDIUM_SIZE);
        addLine();
        newLine();
        addText(`Cliente: ${order.nombre}`);
        newLine();
        if (order.direccion_envio) {
          newLine();
          addText(`Entrega:`);
          newLine();
          addText(`${order.direccion_envio}`);
          newLine();
        }
        newLine();
        addLine();
        newLine();
        
        if (order.items) {
          order.items.forEach((item: OrderItem) => {
            let itemDesc = `${item.quantity}x ${item.burger_type} ${item.patty_size}`;
            if (item.combo) {
              itemDesc += ' (combo)';
            }
            newLine();
            addText(itemDesc);
            newLine();
            
            if (item.additions && item.additions.length > 0) {
              addText(`+ ${item.additions.join(', ')}`);
              newLine();
            }
            if (item.removals && item.removals.length > 0) {
              addText(`- ${item.removals.join(', ')}`);
              newLine();
            }
          });
        }
        
        addLine();
        newLine();
        addBytes(...BOLD_ON);
        addText(`TOTAL: $${parseFloat(order.monto.toString()).toLocaleString('es-AR')}`);
        addBytes(...BOLD_OFF, LF);
        newLine();
        addText(`Pago: ${order.metodo_pago || 'efectivo'}`);
        newLine();
        
        addBytes(LF, LF, LF, LF, LF);
        addBytes(...CUT);
        
        return new Uint8Array(bytes);
      };

      const ticketBytes = generateCashierTicket();
      const ticketBase64 = btoa(String.fromCharCode(...ticketBytes));

      // Send to cashier webhook only
      const cashierWebhookUrl = 'https://n8nwebhookx.botec.tech/webhook/crearFacturaCaja';
      
      const response = await fetch(cashierWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_number: order.order_number,
          ticket: ticketBase64,
          nombre: order.nombre,
          monto: order.monto,
          metodo_pago: order.metodo_pago,
          items: order.items,
          direccion_envio: order.direccion_envio
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al reimprimir: ${response.status}`);
      }

      toast({
        title: "Ticket reimpreso",
        description: `Pedido #${order.order_number} enviado a impresora de caja`,
      });
    } catch (error) {
      console.error('Error reprinting ticket:', error);
      toast({
        title: "Error al reimprimir",
        description: "No se pudo reimprimir el ticket",
        variant: "destructive"
      });
    }
  };

  const getOrderAge = (createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return { text: "Recién llegado", urgent: false };
    if (diffInMinutes < 15) return { text: `${diffInMinutes} min`, urgent: false };
    if (diffInMinutes < 30) return { text: `${diffInMinutes} min`, urgent: true };
    return { text: `${diffInMinutes} min`, urgent: true };
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            🍔 Dashboard de Cocina
          </h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {orders.length} pedidos pendientes
            </Badge>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {new Date().toLocaleDateString('es-ES')}
            </Badge>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Clock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay pedidos pendientes</h3>
              <p className="text-muted-foreground">
                Los nuevos pedidos aparecerán aquí automáticamente
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => {
              const orderAge = getOrderAge(order.created_at);
              return (
                <Card 
                  key={order.id} 
                  className={`transition-all duration-300 hover:shadow-lg ${
                    orderAge.urgent 
                      ? 'border-kitchen-urgent shadow-md' 
                      : 'border-border'
                  }`}
                >
                  <CardHeader className="pb-3">
                    {/* Scheduled order banner */}
                    {order.hora_programada && (
                      <div className="bg-amber-100 border border-amber-300 text-amber-800 px-3 py-2 rounded-md mb-3 text-center">
                        <span className="font-bold text-lg">🕐 PROGRAMADO: {order.hora_programada}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{order.nombre}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          Pedido #{order.order_number}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge 
                          variant={orderAge.urgent ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {orderAge.text}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ${order.monto}
                        </Badge>
                        <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                          {formatPaymentMethod(order.metodo_pago)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                   <CardContent className="space-y-4">
                     {/* Show delivery address if available */}
                     {order.direccion_envio && (
                       <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                         <p className="font-medium text-sm text-blue-700 mb-1">
                           🚚 Dirección de Envío:
                         </p>
                         <p className="text-blue-900 text-sm">
                           {order.direccion_envio}
                         </p>
                       </div>
                     )}

                      {/* Show items TO-DO list if parsed, otherwise show full pedido */}
                      {order.item_status && order.item_status.length > 0 ? (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="font-medium text-sm text-muted-foreground mb-3">
                            📋 TO-DO Items:
                          </p>
                          <div className="space-y-2">
                            {order.item_status.map((item, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <Button
                                  variant={item.completed ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleItemCompleted(order.id, index)}
                                  className={`flex items-center gap-2 ${
                                    item.completed 
                                      ? "bg-success text-success-foreground hover:bg-success/90" 
                                      : "hover:bg-muted-foreground/10"
                                   }`}
                                 >
                                   <Check className={`w-3 h-3 ${item.completed ? "opacity-100" : "opacity-30"}`} />
                                   <span className={`text-xs ${item.completed ? "line-through" : ""}`}>
                                     {item.quantity}x {item.burger_type} {item.patty_size} {item.combo ? "combo" : ""}
                                     {order.items?.[index]?.additions && order.items[index].additions!.length > 0 && 
                                       ` (con ${order.items[index].additions!.join(", ")})`
                                     }
                                      {order.items?.[index]?.removals && order.items[index].removals!.length > 0 && 
                                        ` (sin ${order.items[index].removals!.join(", ")})`
                                      }
                                      {order.items?.[index]?.observations && 
                                        ` 📝 ${order.items[index].observations}`
                                      }
                                    </span>
                                 </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : order.items && order.items.length > 0 ? (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="font-medium text-sm text-muted-foreground mb-2">
                            Items del Pedido:
                          </p>
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="text-sm font-medium text-foreground">
                                {item.quantity}x {item.burger_type} {item.patty_size} {item.combo ? "combo" : ""}
                                {item.additions && item.additions.length > 0 && ` (con ${item.additions.join(", ")})`}
                                {item.removals && item.removals.length > 0 && ` (sin ${item.removals.join(", ")})`}
                                {item.observations && ` 📝 ${item.observations}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                       <div className="bg-muted p-3 rounded-md">
                         <p className="font-medium text-sm text-muted-foreground mb-1">
                           Sin detalles
                         </p>
                       </div>
                     )}
                     
                     {/* Extras section */}
                     {order.extras && order.extras.length > 0 && (
                       <div className="bg-orange-50 border border-orange-300 p-3 rounded-md">
                         <p className="font-bold text-sm text-orange-800 mb-2">
                           🍟 EXTRAS
                         </p>
                         <div className="space-y-1">
                           {order.extras.map((extra, index) => (
                             <div key={index} className="text-sm font-medium text-orange-900">
                               {extra.quantity || 1}x {extra.name}
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Cash management section - only show for cash payments */}
                     {order.paga_con != null && (() => {
                       const mp = (order.metodo_pago || '').toLowerCase();
                       const isOnlyDigital = mp === 'transferencia' || mp === 'link de pago' || mp === 'link';
                       return !isOnlyDigital;
                     })() && (
                       <div className="bg-emerald-50 border-2 border-emerald-400 p-3 rounded-md">
                         <p className="font-bold text-sm text-emerald-800 mb-2">
                           💵 COBRO
                         </p>
                         <div className="space-y-1">
                           <p className="text-emerald-900 text-sm font-semibold">
                             Paga con: <span className="text-lg">${order.paga_con?.toLocaleString('es-AR')}</span>
                           </p>
                           {order.vuelto != null && order.vuelto > 0 && (
                             <p className="text-emerald-900 text-sm font-semibold">
                               Vuelto: <span className="text-lg text-emerald-700">${order.vuelto.toLocaleString('es-AR')}</span>
                             </p>
                           )}
                         </div>
                       </div>
                     )}

                     <div className="text-xs text-muted-foreground">
                       Recibido: {formatDistance(new Date(order.created_at), new Date(), { 
                         addSuffix: true, 
                         locale: es 
                       })}
                     </div>

                     <div className="space-y-2">
                      {(() => {
                        const direccion = order.direccion_envio?.toLowerCase() || '';
                        const isPickup = direccion.includes('retira') || direccion.includes('retiro') || direccion === 'local';
                        
                        if (!isPickup && order.direccion_envio) {
                          // Delivery order
                          return order.cadete_salio ? (
                            <Badge variant="default" className="w-full py-2 justify-center">
                              🚴 Cadete en camino
                            </Badge>
                          ) : (
                            <Button 
                              onClick={() => markCadeteSalio(order.id)}
                              variant="outline"
                              className="w-full"
                              size="lg"
                            >
                              🚴 Cadete Salió
                            </Button>
                          );
                        } else if (isPickup) {
                          // Pickup order
                          return order.cadete_salio ? (
                            <Badge variant="default" className="w-full py-2 justify-center">
                              ✅ Listo para retirar
                            </Badge>
                          ) : (
                            <Button 
                              onClick={() => markCadeteSalio(order.id)}
                              variant="outline"
                              className="w-full"
                              size="lg"
                            >
                              📦 Listo para retirar
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      <Button 
                        onClick={() => markAsCompleted(order.id)}
                        className="w-full bg-success hover:bg-success/90 text-success-foreground"
                        size="lg"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Marcar como Listo
                      </Button>
                      {order.id && (
                        <Button 
                          onClick={() => reprintTicket(order)}
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Reimprimir ticket
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Kitchen;