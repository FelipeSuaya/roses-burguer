import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDistance } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, DollarSign, ShoppingBag, Users } from 'lucide-react'
import { useOrders } from '@/contexts/OrdersContext'

interface ProductStats {
  producto: string
  pattySize: string
  combo: boolean
  cantidad: number
  ingresos: number
}

interface CustomerStats {
  cliente: string
  totalPedidos: number
  totalGastado: number
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-2xl font-bold"
    >
      {prefix}{value.toLocaleString('es-AR')}
    </motion.div>
  )
}

const Analytics = () => {
  const { pendingOrders, completedOrders } = useOrders()
  const allOrders = useMemo(() => [...pendingOrders, ...completedOrders], [pendingOrders, completedOrders])

  const totalOrders = allOrders.length
  const totalRevenue = useMemo(
    () => allOrders.reduce((sum, o) => sum + Number(o.monto), 0),
    [allOrders]
  )

  const productStats = useMemo<ProductStats[]>(() => {
    const productMap = new Map<string, ProductStats>()
    allOrders.forEach(order => {
      if (!order.items) return
      order.items.forEach(item => {
        if (!item.burger_type) return
        const key = `${item.burger_type}-${item.patty_size || 'simple'}-${item.combo ?? false}`
        const curr = productMap.get(key) || {
          producto: item.burger_type.trim(),
          pattySize: item.patty_size || 'simple',
          combo: item.combo || false,
          cantidad: 0,
          ingresos: 0,
        }
        const itemRevenue = Number(order.monto) / order.items!.length
        productMap.set(key, {
          ...curr,
          cantidad: curr.cantidad + (item.quantity || 1),
          ingresos: curr.ingresos + itemRevenue,
        })
      })
    })
    return Array.from(productMap.values()).sort((a, b) => b.cantidad - a.cantidad)
  }, [allOrders])

  const customerStats = useMemo<CustomerStats[]>(() => {
    const map = new Map<string, { totalPedidos: number; totalGastado: number }>()
    allOrders.forEach(order => {
      const key = order.telefono || 'Sin teléfono'
      const curr = map.get(key) || { totalPedidos: 0, totalGastado: 0 }
      map.set(key, {
        totalPedidos: curr.totalPedidos + 1,
        totalGastado: curr.totalGastado + Number(order.monto),
      })
    })
    return Array.from(map.entries())
      .map(([cliente, stats]) => ({ cliente, ...stats }))
      .sort((a, b) => b.totalGastado - a.totalGastado)
  }, [allOrders])

  const sortedOrders = useMemo(
    () => [...allOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [allOrders]
  )

  const statCards = [
    { label: 'Total Pedidos', value: totalOrders, icon: ShoppingBag, prefix: '' },
    { label: 'Ingresos Totales', value: Math.round(totalRevenue), icon: DollarSign, prefix: '$' },
    { label: 'Clientes Únicos', value: customerStats.length, icon: Users, prefix: '' },
    {
      label: 'Promedio por Pedido',
      value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      icon: TrendingUp,
      prefix: '$',
    },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Estadísticas en tiempo real de todos los pedidos</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, prefix }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <AnimatedNumber value={value} prefix={prefix} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productStats.slice(0, 5).map((product, index) => (
                  <div key={`${product.producto}-${product.pattySize}-${product.combo}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">
                          {product.producto} - {product.pattySize}
                          {product.combo && ' 🍟'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${Math.round(product.ingresos).toLocaleString('es-AR')} en ingresos
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {product.cantidad} vendidos
                    </Badge>
                  </div>
                ))}
                {productStats.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Sin datos</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Mejores Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerStats.slice(0, 5).map((customer, index) => (
                  <div key={customer.cliente} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{customer.cliente}</p>
                        <p className="text-xs text-muted-foreground">{customer.totalPedidos} pedidos</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      ${Math.round(customer.totalGastado).toLocaleString('es-AR')}
                    </Badge>
                  </div>
                ))}
                {customerStats.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Sin datos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.slice(0, 30).map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="text-muted-foreground text-sm">{order.order_number}</TableCell>
                    <TableCell className="font-medium text-sm">{order.nombre}</TableCell>
                    <TableCell className="max-w-xs">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          {item.quantity}x {item.burger_type} {item.patty_size}
                          {item.combo && ' (combo)'}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-sm">${Number(order.monto).toLocaleString('es-AR')}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {order.status === 'completed' ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistance(new Date(order.created_at), new Date(), { addSuffix: true, locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
                {sortedOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sin pedidos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Analytics
