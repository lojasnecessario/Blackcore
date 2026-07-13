'use client'

import * as React from 'react'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface CartItem {
  variant_id: string
  product_id: string
  name: string
  image: string
  attributes: string
  sku: string
  quantity: number
  price: number // Preço exibido na UI no momento da adição (não confiamos para fechamento)
  stock: number
}

interface CartContextData {
  items: CartItem[]
  isOpen: boolean
  subtotal: number
  discount: number
  total: number
  coupon: string | null
  loading: boolean
  addItem: (item: CartItem) => void
  removeItem: (variant_id: string) => void
  updateQuantity: (variant_id: string, quantity: number) => void
  setIsOpen: (isOpen: boolean) => void
  applyCoupon: (code: string) => Promise<boolean>
  removeCoupon: () => void
  clearCart: () => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  const [subtotal, setSubtotal] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [total, setTotal] = useState(0)
  const [coupon, setCoupon] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // 1. Carregar do LocalStorage na montagem
  useEffect(() => {
    const saved = localStorage.getItem('@blackcore:cart')
    const savedCoupon = localStorage.getItem('@blackcore:coupon')
    if (saved) {
      setItems(JSON.parse(saved))
    }
    if (savedCoupon) {
      setCoupon(savedCoupon)
    }
    setInitialized(true)
  }, [])

  // 2. Salvar no LocalStorage sempre que mudar e Recalcular via Edge Function
  useEffect(() => {
    if (!initialized) return

    localStorage.setItem('@blackcore:cart', JSON.stringify(items))
    if (coupon) {
      localStorage.setItem('@blackcore:coupon', coupon)
    } else {
      localStorage.removeItem('@blackcore:coupon')
    }

    const calculateOfficialTotals = async () => {
      if (items.length === 0) {
        setSubtotal(0)
        setDiscount(0)
        setTotal(0)
        return
      }

      setLoading(true)
      try {
        const payloadItems = items.map(i => ({ variant_id: i.variant_id, quantity: i.quantity }))
        
        const { data, error } = await supabase.functions.invoke('calculate-cart', {
          body: { items: payloadItems, coupon_code: coupon }
        })

        if (error) throw error

        if (data.success) {
          setSubtotal(data.data.subtotal)
          setDiscount(data.data.discount)
          setTotal(data.data.total)
        } else {
           console.error('Erro ao calcular:', data)
        }
      } catch (err) {
        console.error('Erro fatal calculate-cart:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce manual rápido para não floodar Edge Function digitando Qtd
    const timeout = setTimeout(() => calculateOfficialTotals(), 500)
    return () => clearTimeout(timeout)

  }, [items, coupon, initialized, supabase.functions])

  const addItem = (newItem: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.variant_id === newItem.variant_id)
      if (existing) {
        if (existing.quantity + newItem.quantity > existing.stock) {
          toast.error('Quantidade indisponível em estoque.')
          return prev
        }
        return prev.map(i => i.variant_id === newItem.variant_id 
          ? { ...i, quantity: i.quantity + newItem.quantity }
          : i
        )
      }
      return [...prev, newItem]
    })
    setIsOpen(true)
  }

  const removeItem = (variant_id: string) => {
    setItems(prev => prev.filter(i => i.variant_id !== variant_id))
  }

  const updateQuantity = (variant_id: string, quantity: number) => {
    setItems(prev => prev.map(i => {
      if (i.variant_id === variant_id) {
        if (quantity > i.stock) {
          toast.error('Estoque máximo atingido.')
          return i
        }
        return { ...i, quantity: Math.max(1, quantity) }
      }
      return i
    }))
  }

  const applyCoupon = async (code: string) => {
    setLoading(true)
    const toastId = toast.loading('Validando cupom...')
    try {
      // Chama apply-coupon apenas para validação crua
      const { data, error } = await supabase.functions.invoke('apply-coupon', {
        body: { code, action: 'VALIDATE' }
      })

      if (error || !data.success) {
        toast.error(error?.message || data?.error?.message || 'Cupom inválido ou expirado.', { id: toastId })
        setCoupon(null)
        setLoading(false)
        return false
      }

      setCoupon(code.toUpperCase())
      toast.success('Cupom aplicado!', { id: toastId })
      setLoading(false)
      return true
    } catch (err: any) {
      toast.error('Erro ao validar cupom', { id: toastId })
      setCoupon(null)
      setLoading(false)
      return false
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
    toast.info('Cupom removido.')
  }

  const clearCart = () => {
    setItems([])
    setCoupon(null)
  }

  return (
    <CartContext.Provider value={{
      items, isOpen, subtotal, discount, total, coupon, loading,
      addItem, removeItem, updateQuantity, setIsOpen, applyCoupon, removeCoupon, clearCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
