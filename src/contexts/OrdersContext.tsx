import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface OrderItem {
  quantity: number
  burger_type: string
  patty_size: string
  combo: boolean
  additions?: string[] | null
  removals?: string[] | null
  observations?: string | null
}

export interface ExtraItem {
  name: string
  quantity: number
  price?: number
}

export interface ItemStatus {
  burger_type: string
  quantity: number
  patty_size: string
  combo: boolean
  completed: boolean
}

export interface Order {
  id: string
  nombre: string
  monto: number
  fecha: string
  status: string
  created_at: string
  items?: OrderItem[]
  item_status?: ItemStatus[]
  direccion_envio?: string
  order_number: number
  metodo_pago?: string
  cadete_salio?: boolean
  hora_programada?: string
  paga_con?: number | null
  vuelto?: number | null
  extras?: ExtraItem[] | null
  telefono?: string | null
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface OrdersContextType {
  pendingOrders: Order[]
  completedOrders: Order[]
  connectionStatus: ConnectionStatus
  loading: boolean
  updateOrderLocally: (orderId: string, updates: Partial<Order>) => void
  moveToCompleted: (orderId: string) => void
  removeOrder: (orderId: string) => void
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

function parseOrder(raw: Record<string, unknown>): Order {
  return {
    ...(raw as Order),
    items: Array.isArray(raw.items) ? (raw.items as OrderItem[]) : undefined,
    item_status: Array.isArray(raw.item_status) ? (raw.item_status as ItemStatus[]) : undefined,
    extras: Array.isArray(raw.extras) ? (raw.extras as ExtraItem[]) : null,
  }
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [loading, setLoading] = useState(true)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const hiddenAtRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOrders = useCallback(async () => {
    const [pendingResult, completedResult] = await Promise.all([
      supabase.from('orders').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('status', 'completed').order('created_at', { ascending: false }),
    ])

    if (!pendingResult.error) {
      setPendingOrders((pendingResult.data || []).map(o => parseOrder(o as Record<string, unknown>)))
    }
    if (!completedResult.error) {
      setCompletedOrders((completedResult.data || []).map(o => parseOrder(o as Record<string, unknown>)))
    }
    setLoading(false)
  }, [])

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const setupChannel = useCallback(() => {
    if (!user) return

    cleanupChannel()
    setConnectionStatus('connecting')

    const ch = supabase
      .channel('orders-global', { config: { broadcast: { self: true } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = parseOrder(payload.new as Record<string, unknown>)
          if (newOrder.status === 'pending') {
            setPendingOrders(prev => {
              if (prev.some(o => o.id === newOrder.id)) return prev
              return [newOrder, ...prev]
            })
            toast({
              title: '¡Nuevo Pedido!',
              description: `${newOrder.nombre} - $${newOrder.monto}`,
              duration: 5000,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = parseOrder(payload.new as Record<string, unknown>)
          if (updated.status === 'completed') {
            setPendingOrders(prev => prev.filter(o => o.id !== updated.id))
            setCompletedOrders(prev => {
              if (prev.some(o => o.id === updated.id)) return prev
              return [updated, ...prev]
            })
          } else {
            setPendingOrders(prev =>
              prev.map(o => o.id === updated.id ? { ...o, ...updated } : o)
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          const deleted = payload.old as { id: string }
          setPendingOrders(prev => prev.filter(o => o.id !== deleted.id))
          setCompletedOrders(prev => prev.filter(o => o.id !== deleted.id))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionStatus('disconnected')
          // Auto-reconnect after 3s
          reconnectTimeoutRef.current = setTimeout(() => {
            setupChannel()
          }, 3000)
        }
      })

    channelRef.current = ch
  }, [user, cleanupChannel, toast])

  // Setup channel once user is available
  useEffect(() => {
    if (!user) {
      cleanupChannel()
      setConnectionStatus('disconnected')
      return
    }

    fetchOrders().then(() => {
      setupChannel()
    })

    return cleanupChannel
  }, [user, fetchOrders, setupChannel, cleanupChannel])

  // Reconnect when tab becomes visible again
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      } else if (document.visibilityState === 'visible') {
        const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0
        hiddenAtRef.current = null
        if (hiddenMs > 10_000) {
          // Tab was hidden >10s — reconnect and refetch
          setupChannel()
          fetchOrders()
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [setupChannel, fetchOrders])

  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    setPendingOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o))
  }, [])

  const moveToCompleted = useCallback((orderId: string) => {
    setPendingOrders(prev => {
      const order = prev.find(o => o.id === orderId)
      if (order) {
        const updated = { ...order, status: 'completed' }
        setCompletedOrders(c => [updated, ...c])
      }
      return prev.filter(o => o.id !== orderId)
    })
  }, [])

  const removeOrder = useCallback((orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId))
    setCompletedOrders(prev => prev.filter(o => o.id !== orderId))
  }, [])

  return (
    <OrdersContext.Provider value={{
      pendingOrders,
      completedOrders,
      connectionStatus,
      loading,
      updateOrderLocally,
      moveToCompleted,
      removeOrder,
    }}>
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within an OrdersProvider')
  return ctx
}
