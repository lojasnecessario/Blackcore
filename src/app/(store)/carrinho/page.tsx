'use client'

import { useCart } from '@/contexts/cart-context'
import { PageHeader } from '@/components/admin/data/page-header'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function CartPage() {
  const { 
    items, updateQuantity, removeItem, clearCart, 
    subtotal, discount, total, 
    coupon, applyCoupon, removeCoupon, loading 
  } = useCart()

  const [couponInput, setCouponInput] = useState('')

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    const success = await applyCoupon(couponInput)
    if (success) setCouponInput('')
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 min-h-[60vh] flex flex-col items-center justify-center">
        <ShoppingBag className="w-24 h-24 text-muted-foreground opacity-20 mb-6" />
        <h1 className="text-3xl font-bold mb-4">Seu carrinho está vazio</h1>
        <p className="text-muted-foreground mb-8">Parece que você ainda não adicionou nada ao carrinho.</p>
        <Link href="/">
          <Button size="lg">Continuar Comprando</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <PageHeader 
        title="Carrinho de Compras" 
        description="Revise seus itens e aplique cupons antes do checkout."
      />

      <div className="flex flex-col lg:flex-row gap-12 mt-8">
        
        {/* Lista de Itens */}
        <div className="flex-1 space-y-8">
          <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-4">
            <div className="col-span-6">Produto</div>
            <div className="col-span-2 text-center">Preço</div>
            <div className="col-span-2 text-center">Quantidade</div>
            <div className="col-span-2 text-right">Subtotal</div>
          </div>

          <div className="space-y-6">
            {items.map(item => (
              <div key={item.variant_id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-4 border-b">
                <div className="col-span-1 md:col-span-6 flex gap-4">
                  <div className="w-24 h-32 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <Link href={`/produto/${item.product_id}`} className="font-medium hover:text-primary transition-colors line-clamp-2">
                      {item.name}
                    </Link>
                    <span className="text-sm text-muted-foreground mt-1">{item.attributes || item.sku}</span>
                    <button 
                      onClick={() => removeItem(item.variant_id)}
                      className="text-sm text-destructive hover:underline w-fit mt-3 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Remover
                    </button>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 text-center font-medium hidden md:block">
                  {formatCurrency(item.price)}
                </div>

                <div className="col-span-1 md:col-span-2 flex justify-center">
                  <div className="flex items-center border rounded-md h-10 w-32">
                    <button 
                      onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                      className="px-3 text-muted-foreground hover:text-foreground h-full"
                    >-</button>
                    <span className="flex-1 text-center text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                      className="px-3 text-muted-foreground hover:text-foreground h-full"
                    >+</button>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 text-right font-bold text-lg md:text-base">
                  <span className="md:hidden text-sm font-normal text-muted-foreground mr-2">Subtotal:</span>
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center">
            <Link href="/" className="text-sm font-medium hover:underline">
              ← Continuar Comprando
            </Link>
            <Button variant="ghost" onClick={clearCart} className="text-destructive">
              Esvaziar Carrinho
            </Button>
          </div>
        </div>

        {/* Resumo e Checkout */}
        <div className="w-full lg:w-[400px] flex-shrink-0">
          <div className="bg-muted/30 border rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">Resumo do Pedido</h2>
            
            <form onSubmit={handleApplyCoupon} className="flex gap-2 mb-6">
              <Input 
                placeholder="Código do cupom" 
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                disabled={loading || !!coupon}
              />
              {!coupon ? (
                <Button type="submit" variant="outline" disabled={loading || !couponInput}>
                  Aplicar
                </Button>
              ) : (
                <Button type="button" variant="destructive" onClick={removeCoupon}>
                  Remover
                </Button>
              )}
            </form>

            {coupon && (
              <div className="text-sm text-success bg-success/10 p-2 rounded-md mb-6 border border-success/20">
                Cupom <strong>{coupon}</strong> aplicado com sucesso!
              </div>
            )}

            <div className="space-y-3 text-sm border-b pb-6 mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{loading ? 'Calculando...' : formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Desconto</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>Calculado no Checkout</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-2xl mb-8">
              <span>Total</span>
              <span>{loading ? '...' : formatCurrency(total)}</span>
            </div>

            <Button className="w-full h-14 text-lg group" size="lg" disabled={loading}>
              Ir para o Checkout
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              Pagamento 100% seguro.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
