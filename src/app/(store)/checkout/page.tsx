'use client'

import * as React from 'react'
import { useState } from 'react'
import { useCart } from '@/contexts/cart-context'
import { PageHeader } from '@/components/admin/data/page-header'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Label } from '@/components/admin/ui/label'
import { Checkbox } from '@/components/admin/ui/checkbox'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Lock, CreditCard, Loader2 } from 'lucide-react'

type ShippingOption = {
  id: string
  name: string
  price: number
  estimated_days: number
}

export default function CheckoutPage() {
  const { items, subtotal, discount, total, coupon, clearCart } = useCart()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [sameAsShipping, setSameAsShipping] = useState(true)

  // Form State
  const [buyer, setBuyer] = useState({ name: '', email: '', phone: '', document: '' })
  const [shipping, setShipping] = useState({ zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' })
  const [billing, setBilling] = useState({ zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' })

  // Shipping State
  const [calculatingShipping, setCalculatingShipping] = useState(false)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState<string>('')
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Se o carrinho estiver vazio, bloqueia
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center">
        <ShoppingBag className="w-24 h-24 text-muted-foreground opacity-20 mb-6" />
        <h1 className="text-2xl font-bold mb-4">Checkout Inválido</h1>
        <p className="text-muted-foreground mb-8">Seu carrinho está vazio.</p>
        <Button onClick={() => router.push('/')}>Voltar para a Loja</Button>
      </div>
    )
  }

  const handleCalculateShipping = async () => {
    if (!shipping.zip || shipping.zip.length < 8) {
      toast.error('Informe um CEP válido para calcular o frete.')
      return
    }

    setCalculatingShipping(true)
    setShippingOptions([])
    setSelectedShipping('')

    try {
      const { data, error } = await supabase.functions.invoke('calculate-shipping', {
        body: { cep: shipping.zip }
      })

      if (error || !data || !data.options) {
        throw new Error('Falha ao calcular frete.')
      }

      setShippingOptions(data.options)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao calcular o frete')
    } finally {
      setCalculatingShipping(false)
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!selectedShipping) {
      toast.error('Por favor, selecione uma opção de frete.')
      return
    }

    setLoading(true)

    const toastId = toast.loading('Processando seu pedido...')

    try {
      // 1. Criar Checkout (Reserva Estoque e cria Order PENDING)
      const payloadItems = items.map(i => ({ variant_id: i.variant_id, quantity: i.quantity }))
      const finalBilling = sameAsShipping ? shipping : billing

      const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke('create-checkout', {
        body: {
          items: payloadItems,
          coupon_code: coupon,
          shipping_address: { ...shipping, buyer_name: buyer.name, buyer_email: buyer.email, buyer_phone: buyer.phone, buyer_document: buyer.document },
          billing_address: finalBilling,
          notes: ''
        }
      })

      if (checkoutErr || !checkoutData.success) {
        throw new Error(checkoutErr?.message || checkoutData?.error?.message || 'Falha ao criar checkout')
      }

      const checkoutId = checkoutData.data.checkout_id

      // 2. Criar Ordem de Pagamento com service_id escolhido e repassar provedor vega
      const { data: orderData, error: orderErr } = await supabase.functions.invoke('create-order', {
        body: {
          checkout_id: checkoutId,
          provider: 'vega',
          service_id: selectedShipping,
          cep: shipping.zip
        }
      })

      if (orderErr || !orderData.success) {
        throw new Error(orderErr?.message || orderData?.error?.message || 'Falha ao gerar pagamento')
      }

      toast.success('Pedido gerado com sucesso!', { id: toastId })
      
      // Limpar carrinho e redirecionar
      clearCart()
      router.push(`/pedido/${checkoutId}`)

    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const selectedShippingOption = shippingOptions.find(o => o.id === selectedShipping)
  const freightPrice = selectedShippingOption ? selectedShippingOption.price : 0
  const finalTotal = total + freightPrice

  return (
    <div className="container mx-auto px-4 py-12">
      <PageHeader 
        title="Finalizar Compra" 
        description="Preencha seus dados para completar o pedido seguro."
      />

      <form onSubmit={handleCheckout} className="flex flex-col lg:flex-row gap-12 mt-8">
        
        {/* Esquerda: Dados */}
        <div className="flex-1 space-y-10">
          
          {/* Identificação */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" /> Identificação
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" required value={buyer.name} onChange={e => setBuyer({ ...buyer, name: e.target.value })} disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" required value={buyer.email} onChange={e => setBuyer({ ...buyer, email: e.target.value })} disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="document">CPF/CNPJ *</Label>
                <Input id="document" required value={buyer.document} onChange={e => setBuyer({ ...buyer, document: e.target.value })} disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Celular *</Label>
                <Input id="phone" required value={buyer.phone} onChange={e => setBuyer({ ...buyer, phone: e.target.value })} disabled={loading} />
              </div>
            </div>
          </section>

          {/* Entrega */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-primary" /> Endereço de Entrega
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="s_zip">CEP *</Label>
                <div className="flex gap-2">
                  <Input id="s_zip" required value={shipping.zip} onChange={e => setShipping({ ...shipping, zip: e.target.value })} disabled={loading || calculatingShipping} />
                  <Button type="button" variant="outline" onClick={handleCalculateShipping} disabled={loading || calculatingShipping || shipping.zip.length < 8}>
                    {calculatingShipping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Calcular'}
                  </Button>
                </div>
              </div>
              <div className="md:col-span-8 space-y-1.5">
                <Label htmlFor="s_street">Rua/Avenida *</Label>
                <Input id="s_street" required value={shipping.street} onChange={e => setShipping({ ...shipping, street: e.target.value })} disabled={loading} />
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="s_number">Número *</Label>
                <Input id="s_number" required value={shipping.number} onChange={e => setShipping({ ...shipping, number: e.target.value })} disabled={loading} />
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="s_complement">Complemento</Label>
                <Input id="s_complement" value={shipping.complement} onChange={e => setShipping({ ...shipping, complement: e.target.value })} disabled={loading} />
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="s_neighborhood">Bairro *</Label>
                <Input id="s_neighborhood" required value={shipping.neighborhood} onChange={e => setShipping({ ...shipping, neighborhood: e.target.value })} disabled={loading} />
              </div>
              <div className="md:col-span-8 space-y-1.5">
                <Label htmlFor="s_city">Cidade *</Label>
                <Input id="s_city" required value={shipping.city} onChange={e => setShipping({ ...shipping, city: e.target.value })} disabled={loading} />
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="s_state">Estado *</Label>
                <Input id="s_state" required value={shipping.state} onChange={e => setShipping({ ...shipping, state: e.target.value })} disabled={loading} />
              </div>
            </div>

            {/* Opções de Frete */}
            {shippingOptions.length > 0 && (
              <div className="mt-6 border rounded-lg p-4 space-y-3 bg-muted/20">
                <Label className="text-base font-bold">Selecione o Frete</Label>
                <div className="flex flex-col gap-2">
                  {shippingOptions.map(option => (
                    <label key={option.id} className="flex items-center justify-between border p-3 rounded cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="shipping_option" 
                          value={option.id} 
                          checked={selectedShipping === option.id}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="w-4 h-4 text-primary"
                        />
                        <div>
                          <p className="font-medium">{option.name}</p>
                          <p className="text-xs text-muted-foreground">{option.estimated_days} dia{option.estimated_days > 1 ? 's' : ''} útil</p>
                        </div>
                      </div>
                      <div className="font-bold">
                        {option.price === 0 ? 'Grátis' : formatCurrency(option.price)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Cobrança */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Endereço de Cobrança
            </h2>
            <div className="flex items-center space-x-2 pb-4">
              <Checkbox 
                id="sameAddress" 
                checked={sameAsShipping} 
                onChange={(e) => setSameAsShipping(e.target.checked)}
                disabled={loading}
              />
              <Label htmlFor="sameAddress" className="cursor-pointer">Usar o mesmo endereço de entrega</Label>
            </div>

            {!sameAsShipping && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-in fade-in slide-in-from-top-4">
                 <div className="md:col-span-4 space-y-1.5">
                  <Label htmlFor="b_zip">CEP *</Label>
                  <Input id="b_zip" required value={billing.zip} onChange={e => setBilling({ ...billing, zip: e.target.value })} disabled={loading} />
                </div>
                <div className="md:col-span-8 space-y-1.5">
                  <Label htmlFor="b_street">Rua/Avenida *</Label>
                  <Input id="b_street" required value={billing.street} onChange={e => setBilling({ ...billing, street: e.target.value })} disabled={loading} />
                </div>
                <div className="md:col-span-4 space-y-1.5">
                  <Label htmlFor="b_number">Número *</Label>
                  <Input id="b_number" required value={billing.number} onChange={e => setBilling({ ...billing, number: e.target.value })} disabled={loading} />
                </div>
                <div className="md:col-span-4 space-y-1.5">
                  <Label htmlFor="b_complement">Complemento</Label>
                  <Input id="b_complement" value={billing.complement} onChange={e => setBilling({ ...billing, complement: e.target.value })} disabled={loading} />
                </div>
                <div className="md:col-span-4 space-y-1.5">
                  <Label htmlFor="b_neighborhood">Bairro *</Label>
                  <Input id="b_neighborhood" required value={billing.neighborhood} onChange={e => setBilling({ ...billing, neighborhood: e.target.value })} disabled={loading} />
                </div>
                <div className="md:col-span-8 space-y-1.5">
                  <Label htmlFor="b_city">Cidade *</Label>
                  <Input id="b_city" required value={billing.city} onChange={e => setBilling({ ...billing, city: e.target.value })} disabled={loading} />
                </div>
                <div className="md:col-span-4 space-y-1.5">
                  <Label htmlFor="b_state">Estado *</Label>
                  <Input id="b_state" required value={billing.state} onChange={e => setBilling({ ...billing, state: e.target.value })} disabled={loading} />
                </div>
              </div>
            )}
          </section>

        </div>

        {/* Direita: Resumo */}
        <div className="w-full lg:w-[400px] flex-shrink-0">
          <div className="bg-muted/30 border rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">Resumo do Pedido</h2>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
              {items.map(item => (
                <div key={item.variant_id} className="flex gap-3">
                  <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-medium line-clamp-1">{item.name}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{item.attributes || item.sku}</div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm border-t border-b py-6 mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({items.length} itens)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Desconto {coupon ? `(${coupon})` : ''}</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span>{selectedShipping ? (freightPrice === 0 ? 'Grátis' : formatCurrency(freightPrice)) : '---'}</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-2xl mb-8">
              <span>Total</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>

            <Button type="submit" className="w-full h-14 text-lg" size="lg" disabled={loading || !selectedShipping}>
              <Lock className="w-5 h-5 mr-2" />
              {loading ? 'Processando...' : 'Finalizar Pedido'}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-4 flex items-center justify-center gap-1">
               Pagamento 100% Seguro (Vega Checkout)
            </p>
          </div>
        </div>

      </form>
    </div>
  )
}

function UserIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )
}

function TruckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="15" height="13" x="1" y="3" rx="2"/><path d="M16 8h2a2 2 0 0 1 2 2v5l-2-2-4 2V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg>
  )
}
