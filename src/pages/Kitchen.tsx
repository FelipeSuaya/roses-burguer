import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { useOrders } from '@/contexts/OrdersContext'
import { OrderCard } from '@/components/orders/OrderCard'

type Columns = 1 | 2 | 3

const GRID: Record<Columns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

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
          {n}
        </button>
      ))}
    </div>
  )
}

const Kitchen = () => {
  const { pendingOrders, loading } = useOrders()
  const [columns, setColumns] = useState<Columns>(() => {
    const saved = localStorage.getItem('kitchen-columns')
    return (saved ? parseInt(saved) : 3) as Columns
  })

  const handleColumnsChange = (v: Columns) => {
    setColumns(v)
    localStorage.setItem('kitchen-columns', String(v))
  }

  // Kitchen shows oldest first (FIFO)
  const sortedOrders = [...pendingOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cocina</h1>
            <p className="text-muted-foreground text-sm mt-1">Pedidos ordenados por llegada</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {sortedOrders.length} pendientes
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {new Date().toLocaleDateString('es-ES')}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">por fila:</span>
              <ColumnSelector value={columns} onChange={handleColumnsChange} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className={`grid ${GRID[columns]} gap-4`}>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-lg bg-card animate-pulse" />
            ))}
          </div>
        ) : sortedOrders.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Clock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay pedidos pendientes</h3>
              <p className="text-muted-foreground">Los nuevos pedidos aparecerán aquí automáticamente</p>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid ${GRID[columns]} gap-4`}>
            <AnimatePresence initial={false}>
              {sortedOrders.map(order => (
                <OrderCard key={order.id} order={order} showCompleteButton />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default Kitchen
