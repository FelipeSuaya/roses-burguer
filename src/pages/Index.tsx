import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, Check, Plus, Printer, ChefHat } from 'lucide-react'
import { useOrders } from '@/contexts/OrdersContext'
import { OrderCard } from '@/components/orders/OrderCard'
import { ManualOrderDialog } from '@/components/ManualOrderDialog'
import type { Order } from '@/contexts/OrdersContext'

// ─── Column selector ───────────────────────────────────────────────────────────

type Columns = 1 | 2 | 3

const GRID: Record<Columns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

const COL_LABELS: Record<Columns, string> = { 1: '1', 2: '2', 3: '3' }

function ColumnSelector({ value, onChange }: { value: Columns; onChange: (v: Columns) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      {([1, 2, 3] as Columns[]).map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            value === n
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {COL_LABELS[n]}
        </button>
      ))}
    </div>
  )
}

// ─── Print helper ───────────────────────────────────────────────────────────────

function printPendingOrders(pendingOrders: Order[]) {
  const getAge = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    return { text: mins < 1 ? 'Recién llegado' : `${mins} min`, urgent: mins >= 15 }
  }

  const content = `<!DOCTYPE html><html><head><title>Ticket Pedidos</title>
  <style>
    body{font-family:'Courier New',monospace;margin:0;padding:10px;font-size:12px;line-height:1.2;width:80mm}
    .header{text-align:center;margin-bottom:15px;border-bottom:1px dashed #000;padding-bottom:8px}
    .company-name{font-weight:bold;font-size:14px}
    .order{margin-bottom:15px;border-bottom:1px dashed #000;padding-bottom:10px}
    .order-header{font-weight:bold;margin-bottom:5px;text-transform:uppercase}
    .item{margin:2px 0}
    .urgent{background:#ffe6e6;border:1px solid #ff9999}
    @media print{body{margin:0;width:80mm}.order{break-inside:avoid}}
  </style></head><body>
  <div class="header">
    <div class="company-name">ROSES BURGERS</div>
    <div>TICKET COMANDA</div>
    <div>${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}</div>
    <div>PEDIDOS PENDIENTES: ${pendingOrders.length}</div>
  </div>
  ${pendingOrders.map(order => {
    const age = getAge(order.created_at)
    const items = (order.item_status || order.items || []) as Record<string, unknown>[]
    return `<div class="order ${age.urgent ? 'urgent' : ''}">
      <div class="order-header">PEDIDO #${order.order_number} - ${order.nombre}</div>
      <div>Tiempo: ${age.text}${age.urgent ? ' ⚠️ URGENTE' : ''}</div>
      ${items.map(item => `<div class="item">☐ ${item.quantity}x ${item.burger_type} ${item.patty_size}${item.combo ? ' combo' : ''}</div>`).join('')}
      <div><strong>ENTREGA:</strong> ${order.direccion_envio || 'RETIRO EN LOCAL'}</div>
      <div><strong>TOTAL: $${order.monto}</strong></div>
    </div>`
  }).join('')}
  </body></html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(content); w.document.close(); w.focus(); w.print(); w.close() }
}

// ─── Component ─────────────────────────────────────────────────────────────────

const Index = () => {
  const { pendingOrders, completedOrders, loading } = useOrders()
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false)
  const [columns, setColumns] = useState<Columns>(() => {
    const saved = localStorage.getItem('dashboard-columns')
    return (saved ? parseInt(saved) : 2) as Columns
  })

  const handleColumnsChange = (v: Columns) => {
    setColumns(v)
    localStorage.setItem('dashboard-columns', String(v))
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestión de pedidos en tiempo real</p>
          </div>
          <Button
            onClick={() => setManualOrderDialogOpen(true)}
            size="lg"
            className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 p-0"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          {/* Tab bar + column selector on the same row */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <TabsList className="h-9">
              <TabsTrigger value="pending" className="flex items-center gap-1.5 text-sm">
                <ChefHat className="w-3.5 h-3.5" />
                Pendientes
                <AnimatePresence mode="wait">
                  <motion.span
                    key={pendingOrders.length}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="ml-0.5 bg-primary/20 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full"
                  >
                    {pendingOrders.length}
                  </motion.span>
                </AnimatePresence>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1.5 text-sm">
                <Check className="w-3.5 h-3.5" />
                Completados
                <span className="ml-0.5 bg-muted text-muted-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {completedOrders.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">por fila:</span>
              <ColumnSelector value={columns} onChange={handleColumnsChange} />
            </div>
          </div>

          {/* Pending tab */}
          <TabsContent value="pending" className="mt-0">
            {pendingOrders.length > 0 && (
              <div className="flex justify-end mb-3">
                <Button
                  onClick={() => printPendingOrders(pendingOrders)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Printer className="w-3 h-3 mr-1.5" />
                  Imprimir comanda
                </Button>
              </div>
            )}

            {loading ? (
              <div className={`grid ${GRID[columns]} gap-4`}>
                {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-lg bg-card animate-pulse" />)}
              </div>
            ) : pendingOrders.length === 0 ? (
              <Card className="text-center py-14">
                <CardContent>
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground">No hay pedidos pendientes</h3>
                  <p className="text-muted-foreground text-sm mt-1">Los nuevos pedidos aparecerán aquí automáticamente</p>
                </CardContent>
              </Card>
            ) : (
              <div className={`grid ${GRID[columns]} gap-4`}>
                <AnimatePresence initial={false}>
                  {pendingOrders.map(order => (
                    <OrderCard key={order.id} order={order} showCompleteButton />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Completed tab */}
          <TabsContent value="completed" className="mt-0">
            {loading ? (
              <div className={`grid ${GRID[columns]} gap-4`}>
                {[1, 2].map(i => <div key={i} className="h-36 rounded-lg bg-card animate-pulse" />)}
              </div>
            ) : completedOrders.length === 0 ? (
              <Card className="text-center py-14">
                <CardContent>
                  <Check className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground">No hay pedidos completados</h3>
                  <p className="text-muted-foreground text-sm mt-1">Los pedidos marcados como listos aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              <div className={`grid ${GRID[columns]} gap-4`}>
                <AnimatePresence initial={false}>
                  {completedOrders.map(order => (
                    <OrderCard key={order.id} order={order} showCompleteButton={false} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ManualOrderDialog
        open={manualOrderDialogOpen}
        onOpenChange={setManualOrderDialogOpen}
      />
    </div>
  )
}

export default Index
