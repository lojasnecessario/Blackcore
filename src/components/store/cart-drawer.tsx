'use client'

import * as React from 'react'
import { useCart } from '@/contexts/cart-context'
import { X, Trash2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/admin/ui/button'
import Link from 'next/link'

export function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal, discount, total } = useCart()

  if (!isOpen) return null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-background border-l shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Meu Carrinho
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <ShoppingBag className="w-16 h-16 text-muted-foreground opacity-20" />
              <div className="text-lg font-medium">Seu carrinho está vazio</div>
              <p className="text-sm text-muted-foreground">Adicione produtos para continuar comprando.</p>
              <Button onClick={() => setIsOpen(false)}>Continuar Comprando</Button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.variant_id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                <div className="h-24 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img src={item.image} alt={item.name} className="object-cover w-full h-full" />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.attributes || item.sku}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded-md">
                      <button 
                        onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                        className="px-2 py-1 text-muted-foreground hover:text-foreground"
                      >-</button>
                      <span className="px-2 text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                        className="px-2 py-1 text-muted-foreground hover:text-foreground"
                      >+</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{formatCurrency(item.price * item.quantity)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.variant_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t bg-muted/20 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Desconto</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            
            <Link href="/carrinho" onClick={() => setIsOpen(false)} className="block">
              <Button className="w-full" size="lg">Ir para o Carrinho</Button>
            </Link>
          </div>
        )}

      </div>
    </>
  )
}
