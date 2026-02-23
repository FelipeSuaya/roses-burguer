import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, DollarSign, Printer } from 'lucide-react'
import { formatDistance } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatPaymentMethod } from '@/lib/formatPaymentMethod'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useOrders } from '@/contexts/OrdersContext'
import type { Order, ItemStatus } from '@/contexts/OrdersContext'

interface OrderCardProps {
  order: Order
  showCompleteButton?: boolean
}

function getOrderAge(createdAt: string) {
  const now = new Date()
  const orderTime = new Date(createdAt)
  const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return { text: 'Recién llegado', urgent: false, minutes: 0 }
  if (diffInMinutes < 15) return { text: `${diffInMinutes} min`, urgent: false, minutes: diffInMinutes }
  return { text: `${diffInMinutes} min`, urgent: true, minutes: diffInMinutes }
}

function generateCashierTicket(order: Order): Uint8Array {
  const bytes: number[] = []
  const ESC = 0x1B, GS = 0x1D, LF = 0x0A
  const CENTER = [ESC, 0x61, 0x01]
  const BOLD_ON = [ESC, 0x45, 0x01]
  const BOLD_OFF = [ESC, 0x45, 0x00]
  const DOUBLE_SIZE = [ESC, 0x21, 0x30]
  const MEDIUM_SIZE = [ESC, 0x21, 0x10]
  const CUT = [GS, 0x56, 0x00]

  const addBytes = (...b: number[]) => bytes.push(...b)
  const addText = (text: string) => addBytes(...Array.from(new TextEncoder().encode(text)))
  const addLine = () => { addText('================================'); addBytes(LF) }
  const newLine = () => addBytes(LF)

  addBytes(...CENTER, ...DOUBLE_SIZE, ...BOLD_ON)
  addText('CAJA')
  addBytes(...BOLD_OFF, LF)
  addLine()
  addBytes(...BOLD_ON)
  addText(`PEDIDO #${order.order_number}`)
  addBytes(...BOLD_OFF, LF, ...MEDIUM_SIZE)
  addLine()
  newLine()
  addText(`Cliente: ${order.nombre}`)
  newLine()
  if (order.direccion_envio) {
    newLine()
    addText('Entrega:')
    newLine()
    addText(order.direccion_envio)
    newLine()
  }
  newLine()
  addLine()
  newLine()

  order.items?.forEach(item => {
    let desc = `${item.quantity}x ${item.burger_type} ${item.patty_size}`
    if (item.combo) desc += ' (combo)'
    newLine(); addText(desc); newLine()
    if (item.additions?.length) { addText(`+ ${item.additions.join(', ')}`); newLine() }
    if (item.removals?.length) { addText(`- ${item.removals.join(', ')}`); newLine() }
  })

  addLine(); newLine()
  addBytes(...BOLD_ON)
  addText(`TOTAL: $${parseFloat(order.monto.toString()).toLocaleString('es-AR')}`)
  addBytes(...BOLD_OFF, LF)
  newLine()
  addText(`Pago: ${order.metodo_pago || 'efectivo'}`)
  newLine()
  addBytes(LF, LF, LF, LF, LF, ...CUT)

  return new Uint8Array(bytes)
}

export function OrderCard({ order, showCompleteButton = true }: OrderCardProps) {
  const { toast } = useToast()
  const { updateOrderLocally, moveToCompleted } = useOrders()
  const orderAge = getOrderAge(order.created_at)

  const isUrgent = orderAge.urgent && showCompleteButton

  const toggleItemCompleted = async (itemIndex: number) => {
    if (!order.item_status) return
    const original = order.item_status
    const updatedItemStatus: ItemStatus[] = order.item_status.map((it, i) =>
      i === itemIndex ? { ...it, completed: !it.completed } : it
    )

    updateOrderLocally(order.id, { item_status: updatedItemStatus })

    const { error } = await supabase
      .from('orders')
      .update({ item_status: updatedItemStatus as unknown as never })
      .eq('id', order.id)

    if (error) {
      updateOrderLocally(order.id, { item_status: original })
      toast({ title: 'Error', description: 'No se pudo actualizar el item', variant: 'destructive' })
    }
  }

  const markAsCompleted = async () => {
    moveToCompleted(order.id)
    toast({ title: 'Pedido Completado', description: 'El pedido ha sido marcado como listo' })

    const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id)
    if (error) {
      toast({ title: 'Error DB', description: 'Error al guardar en base de datos', variant: 'destructive' })
    }
  }

  const markCadeteSalio = async () => {
    updateOrderLocally(order.id, { cadete_salio: true })
    toast({
      title: isPickup ? 'Listo para retirar' : 'Cadete en camino',
      description: isPickup ? 'El cliente será notificado' : 'El cadete ha salido con el pedido',
    })

    const { error } = await supabase.from('orders').update({ cadete_salio: true }).eq('id', order.id)
    if (error) {
      updateOrderLocally(order.id, { cadete_salio: false })
      toast({ title: 'Error', description: 'No se pudo marcar el estado', variant: 'destructive' })
      return
    }

    supabase.functions.invoke('notify-order-status', {
      body: {
        order_number: order.order_number,
        nombre: order.nombre,
        telefono: order.telefono,
        tipo: isPickup ? 'retiro' : 'envio',
        estado: isPickup ? 'listo_para_retirar' : 'cadete_salio',
        direccion_envio: order.direccion_envio,
      },
    }).catch((e) => console.error('Webhook notify error:', e))
  }

  const reprintTicket = async () => {
    try {
      const ticketBytes = generateCashierTicket(order)
      const ticketBase64 = btoa(String.fromCharCode(...ticketBytes))

      const response = await fetch('https://n8nwebhookx.botec.tech/webhook/crearFacturaCaja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: order.order_number,
          ticket: ticketBase64,
          nombre: order.nombre,
          monto: order.monto,
          metodo_pago: order.metodo_pago,
          items: order.items,
          direccion_envio: order.direccion_envio,
        }),
      })

      if (!response.ok) throw new Error(`${response.status}`)
      toast({ title: 'Ticket reimpreso', description: `Pedido #${order.order_number} enviado a impresora` })
    } catch {
      toast({ title: 'Error al reimprimir', description: 'No se pudo reimprimir el ticket', variant: 'destructive' })
    }
  }

  const direccion = order.direccion_envio?.toLowerCase() || ''
  const isPickup = direccion.includes('retira') || direccion.includes('retiro') || direccion === 'local'
  const mp = (order.metodo_pago || '').toLowerCase()
  const isOnlyDigital = mp === 'transferencia' || mp === 'link de pago' || mp === 'link'
  const showCash = order.paga_con != null && !isOnlyDigital && !isPickup

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        animate={isUrgent ? {
          boxShadow: [
            '0 0 0 0px rgba(239,68,68,0)',
            '0 0 0 3px rgba(239,68,68,0.35)',
            '0 0 0 0px rgba(239,68,68,0)',
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className="rounded-lg"
      >
        <Card className={`overflow-hidden transition-colors ${isUrgent ? 'border-red-500/60' : 'border-border'}`}>
          {/* Top accent bar */}
          <div className={`h-0.5 w-full ${isUrgent ? 'bg-red-500' : 'bg-primary/60'}`} />

          <CardHeader className="pb-3 pt-4">
            {order.hora_programada && (
              <div className="bg-amber-950/60 border border-amber-600/50 text-amber-300 px-3 py-2 rounded-md mb-3 text-center">
                <span className="font-bold text-sm">🕐 PROGRAMADO: {order.hora_programada}</span>
              </div>
            )}
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-foreground leading-tight">{order.nombre}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Pedido #{order.order_number}</p>
              </div>
              <div className="flex flex-col gap-1.5 items-end shrink-0">
                {showCompleteButton && (
                  <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {orderAge.text}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs font-semibold">
                  <DollarSign className="w-3 h-3 mr-0.5" />
                  {parseFloat(order.monto.toString()).toLocaleString('es-AR')}
                </Badge>
                <div className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                  {formatPaymentMethod(order.metodo_pago)}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            {/* Items – interactive (pending view) */}
            {order.item_status && order.item_status.length > 0 && showCompleteButton ? (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">📋 Items:</p>
                <div className="space-y-1.5">
                  {order.item_status.map((item, index) => (
                    <Button
                      key={index}
                      variant={item.completed ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleItemCompleted(index)}
                      className={`w-full justify-start text-left h-auto py-2 flex-col items-start gap-1 ${
                        item.completed ? 'bg-emerald-700/80 hover:bg-emerald-700/70 text-white border-emerald-600' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${item.completed ? 'opacity-100' : 'opacity-30'}`} />
                        <span className={`text-xs min-w-0 flex-1 break-words leading-relaxed ${item.completed ? 'line-through opacity-70' : ''}`}>
                          {item.quantity}x {item.burger_type} {item.patty_size} {item.combo ? 'combo' : ''}
                          {order.items?.[index]?.additions?.length ? ` + ${order.items[index].additions!.join(', ')}` : ''}
                          {order.items?.[index]?.observations ? ` 📝 ${order.items[index].observations}` : ''}
                        </span>
                      </div>
                      {order.items?.[index]?.removals?.length ? (
                        <div className="pl-5">
                          <span className="inline-flex items-center bg-red-900/80 border border-red-400/70 text-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                            🚫 SIN: {order.items[index].removals!.join(' · ').toUpperCase()}
                          </span>
                        </div>
                      ) : null}
                    </Button>
                  ))}
                </div>
              </div>
            ) : order.items && order.items.length > 0 ? (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Items del Pedido:</p>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="text-sm text-foreground">
                      <span>
                        {item.quantity}x {item.burger_type} {item.patty_size} {item.combo ? 'combo' : ''}
                        {item.additions?.length ? ` + ${item.additions.join(', ')}` : ''}
                        {item.observations ? ` 📝 ${item.observations}` : ''}
                      </span>
                      {item.removals?.length ? (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center bg-red-900/80 border border-red-400/70 text-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                            🚫 SIN: {item.removals.join(' · ').toUpperCase()}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs text-muted-foreground">Sin detalles</p>
              </div>
            )}

            {/* Extras */}
            {order.extras && order.extras.length > 0 && (
              <div className="bg-orange-950/40 border border-orange-700/50 p-3 rounded-md">
                <p className="font-bold text-xs text-orange-300 mb-1.5">🍟 EXTRAS</p>
                {order.extras.map((extra, i) => (
                  <div key={i} className="text-sm text-orange-200">
                    {extra.quantity || 1}x {extra.name}
                    {extra.price ? ` - $${extra.price.toLocaleString('es-AR')}` : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Domicilio */}
            <div className="bg-blue-950/40 border border-blue-700/50 p-3 rounded-md">
              <p className="font-medium text-xs text-blue-300 mb-1">🏠 DOMICILIO:</p>
              <p className="text-sm text-blue-100">{order.direccion_envio || 'Sin dirección'}</p>
            </div>

            {/* Cash */}
            {showCash && (
              <div className="bg-emerald-950/40 border-2 border-emerald-600/50 p-3 rounded-md">
                <p className="font-bold text-xs text-emerald-300 mb-1.5">💵 COBRO</p>
                <p className="text-sm font-semibold text-emerald-200">
                  Paga con: <span className="text-base">${order.paga_con?.toLocaleString('es-AR')}</span>
                </p>
                {order.vuelto != null && order.vuelto > 0 && (
                  <p className="text-sm font-semibold text-emerald-200">
                    Vuelto: <span className="text-base">${order.vuelto.toLocaleString('es-AR')}</span>
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {showCompleteButton ? 'Recibido' : 'Completado'}:{' '}
              {formatDistance(new Date(order.created_at), new Date(), { addSuffix: true, locale: es })}
            </div>

            {/* Actions */}
            {showCompleteButton && (
              <div className="space-y-2">
                {!isPickup && order.direccion_envio ? (
                  order.cadete_salio ? (
                    <Badge className="w-full py-2 justify-center bg-emerald-700">🚴 Cadete en camino</Badge>
                  ) : (
                    <Button onClick={markCadeteSalio} variant="outline" className="w-full" size="sm">
                      🚴 Cadete Salió
                    </Button>
                  )
                ) : isPickup ? (
                  order.cadete_salio ? (
                    <Badge className="w-full py-2 justify-center bg-emerald-700">✅ Listo para retirar</Badge>
                  ) : (
                    <Button onClick={markCadeteSalio} variant="outline" className="w-full" size="sm">
                      📦 Listo para retirar
                    </Button>
                  )
                ) : null}

                <Button
                  onClick={markAsCompleted}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
                  size="sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Hecho
                </Button>
              </div>
            )}

            <Button onClick={reprintTicket} variant="outline" className="w-full" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Reimprimir ticket
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
