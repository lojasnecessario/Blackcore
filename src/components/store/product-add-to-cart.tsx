'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/admin/ui/button'
import { useCart } from '@/contexts/cart-context'

interface ProductAddToCartProps {
  product: any
}

export function ProductAddToCart({ product }: ProductAddToCartProps) {
  const { addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<any>(product.variants?.[0] || null)
  const [quantity, setQuantity] = useState(1)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Verificar estoque da variante selecionada
  const availableStock = selectedVariant?.inventory_levels?.[0]?.available || 0
  const isOutOfStock = availableStock <= 0

  const handleAddToCart = () => {
    if (isOutOfStock) return
    
    addItem({
      variant_id: selectedVariant.id,
      product_id: product.id,
      name: product.name,
      image: product.images?.[0] || 'https://via.placeholder.com/400x500?text=Sem+Imagem',
      attributes: Object.values(selectedVariant.attributes || {}).join(' / ') || '',
      sku: selectedVariant.sku,
      quantity,
      price: selectedVariant.promotional_price || selectedVariant.price,
      stock: availableStock
    })
  }

  const priceToUse = selectedVariant?.promotional_price || selectedVariant?.price

  return (
    <div className="space-y-6">
      
      {/* Price */}
      <div className="flex flex-col">
        {selectedVariant?.promotional_price > 0 ? (
          <>
            <span className="text-muted-foreground line-through text-lg">
              {formatCurrency(selectedVariant.price)}
            </span>
            <span className="text-4xl font-bold text-success">
              {formatCurrency(selectedVariant.promotional_price)}
            </span>
          </>
        ) : (
          <span className="text-4xl font-bold">
            {formatCurrency(selectedVariant?.price || 0)}
          </span>
        )}
      </div>

      {/* Variants Selection */}
      {product.variants?.length > 1 && (
        <div className="space-y-3">
          <h3 className="font-medium">Selecione a Opção:</h3>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v: any) => {
              const stock = v.inventory_levels?.[0]?.available || 0
              const disabled = stock <= 0
              const selected = selectedVariant?.id === v.id

              // Extrair os atributos para mostrar como label (ex: Cor: Preto)
              const attrString = Object.values(v.attributes || {}).join(' / ') || v.sku

              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVariant(v)
                    setQuantity(1)
                  }}
                  disabled={disabled}
                  className={`px-4 py-2 text-sm border rounded-md transition-colors ${
                    selected 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : disabled 
                        ? 'opacity-50 cursor-not-allowed bg-muted' 
                        : 'hover:border-primary/50'
                  }`}
                >
                  {attrString}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Quantity & Add to Cart */}
      <div className="flex gap-4 items-end">
        <div className="space-y-2 w-24">
          <label className="text-sm font-medium text-muted-foreground">Quantidade</label>
          <div className="flex items-center border rounded-md h-12">
            <button 
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 text-lg hover:text-primary disabled:opacity-50"
              disabled={isOutOfStock}
            >
              -
            </button>
            <input 
              type="text" 
              value={quantity} 
              readOnly 
              className="w-full text-center bg-transparent border-none focus:outline-none"
            />
            <button 
              type="button"
              onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
              className="px-3 text-lg hover:text-primary disabled:opacity-50"
              disabled={isOutOfStock}
            >
              +
            </button>
          </div>
        </div>

        <Button 
          size="lg" 
          className="flex-1 h-12 text-md" 
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          variant={isOutOfStock ? "outline" : "default"}
        >
          {isOutOfStock ? 'Esgotado' : 'Adicionar ao Carrinho'}
        </Button>
      </div>

      {/* Estoque Status Info */}
      <div className="text-sm text-muted-foreground pt-2 border-t">
        {availableStock > 0 
          ? availableStock <= 5 
            ? <span className="text-orange-500 font-medium">Restam apenas {availableStock} no estoque!</span>
            : <span>Em estoque, pronto para envio.</span>
          : <span className="text-destructive font-medium">Produto temporariamente indisponível.</span>
        }
      </div>

    </div>
  )
}
