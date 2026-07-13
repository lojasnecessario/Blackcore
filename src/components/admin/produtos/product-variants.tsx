'use client'

import * as React from 'react'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { Trash2, Plus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'

interface ProductVariantsProps {
  variants: any[]
  setVariants: (v: any[]) => void
  isEdit: boolean
  variantsToDelete?: string[]
  setVariantsToDelete?: (v: string[]) => void
}

export function ProductVariants({ variants, setVariants, isEdit, variantsToDelete = [], setVariantsToDelete }: ProductVariantsProps) {

  const addVariant = () => {
    setVariants([...variants, { 
      sku: '', 
      price: 0, 
      compare_at_price: 0,
      weight: 0,
      attributes: {},
      initial_stock: isEdit ? undefined : 0,
      add_stock: isEdit ? 0 : undefined
    }])
  }

  const removeVariant = (index: number) => {
    const variant = variants[index]
    if (variant.id && setVariantsToDelete) {
      setVariantsToDelete([...variantsToDelete, variant.id])
    }
    setVariants(variants.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants]
    if (field.startsWith('attr_')) {
      const attrName = field.replace('attr_', '')
      newVariants[index].attributes = { ...newVariants[index].attributes, [attrName]: value }
    } else {
      newVariants[index][field] = value
    }
    setVariants(newVariants)
  }

  // Ensure at least one variant exists
  React.useEffect(() => {
    if (variants.length === 0) {
      addVariant()
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">SKU</TableHead>
              <TableHead className="min-w-[120px]">Preço</TableHead>
              <TableHead className="min-w-[120px]">Preço Promocional</TableHead>
              <TableHead className="min-w-[120px]">Cor (Ex: Preto)</TableHead>
              <TableHead className="min-w-[120px]">Tamanho (Ex: M)</TableHead>
              <TableHead className="min-w-[120px]">{isEdit ? 'Ajuste Estoque (+/-)' : 'Estoque Inicial'}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((v, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Input 
                    value={v.sku} 
                    onChange={(e) => updateVariant(i, 'sku', e.target.value)} 
                    placeholder="SKU Único" 
                    required 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={v.price} 
                    onChange={(e) => updateVariant(i, 'price', parseFloat(e.target.value) || 0)} 
                    required 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={v.compare_at_price || ''} 
                    onChange={(e) => updateVariant(i, 'compare_at_price', parseFloat(e.target.value) || 0)} 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={v.attributes?.Cor || ''} 
                    onChange={(e) => updateVariant(i, 'attr_Cor', e.target.value)} 
                    placeholder="Cor" 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={v.attributes?.Tamanho || ''} 
                    onChange={(e) => updateVariant(i, 'attr_Tamanho', e.target.value)} 
                    placeholder="Tamanho" 
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    value={isEdit ? (v.add_stock || 0) : (v.initial_stock || 0)} 
                    onChange={(e) => updateVariant(i, isEdit ? 'add_stock' : 'initial_stock', parseInt(e.target.value) || 0)} 
                    placeholder={isEdit ? "+/-" : "Qtd"}
                  />
                </TableCell>
                <TableCell>
                  {variants.length > 1 && (
                    <Button variant="ghost" size="icon" type="button" onClick={() => removeVariant(i)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Button type="button" variant="outline" onClick={addVariant} className="w-full border-dashed">
        <Plus className="mr-2 h-4 w-4" />
        Adicionar Variação
      </Button>
    </div>
  )
}
