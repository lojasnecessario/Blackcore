'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/admin/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/admin/ui/table'
import { PageHeader } from '@/components/admin/data/page-header'
import Papa from 'papaparse'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/admin/ui/input'
import Link from 'next/link'
import { getAdminUrl } from '@/lib/admin-url'

interface ParsedProduct {
  name: string
  description?: string
  status?: string
  category?: string
  sku?: string
  price?: number
  compare_at_price?: number
  stock?: number
  images?: string[]
}

export default function ImportProductsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([])
  const [importStatus, setImportStatus] = useState<{ total: number; success: number; failed: number } | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[]
        
        // Mapear os dados flexivelmente
        const mappedData: ParsedProduct[] = data.map(row => {
          // Normalize chaves (tudo minúsculo, sem espaços)
          const keys = Object.keys(row)
          const findKey = (searchKeys: string[]) => keys.find(k => searchKeys.includes(k.toLowerCase().trim()))
          
          const nameKey = findKey(['name', 'nome', 'produto', 'title', 'titulo'])
          const descKey = findKey(['description', 'descrição', 'desc', 'descricao'])
          const statusKey = findKey(['status'])
          const catKey = findKey(['category', 'categoria'])
          const skuKey = findKey(['sku', 'codigo'])
          const priceKey = findKey(['price', 'preco', 'preço', 'valor'])
          const comparePriceKey = findKey(['compare_at_price', 'preco_antigo', 'preço antigo'])
          const stockKey = findKey(['stock', 'estoque', 'qtd'])
          const imagesKey = findKey(['images', 'imagens', 'fotos', 'image', 'imagem'])

          const rawPrice = priceKey ? String(row[priceKey]).replace(',', '.') : '0'
          const rawComparePrice = comparePriceKey ? String(row[comparePriceKey]).replace(',', '.') : '0'

          let imagesArray: string[] = []
          if (imagesKey && row[imagesKey]) {
            imagesArray = String(row[imagesKey]).split(/[,|]/).map(url => url.trim()).filter(url => url)
          }

          let rawStatus = statusKey ? String(row[statusKey]).toUpperCase().trim() : 'DRAFT'
          if (rawStatus === 'ATIVO' || rawStatus === 'PUBLISHED') rawStatus = 'ACTIVE'
          if (rawStatus === 'RASCUNHO') rawStatus = 'DRAFT'
          if (rawStatus === 'ARQUIVADO') rawStatus = 'ARCHIVED'
          if (!['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(rawStatus)) rawStatus = 'DRAFT'

          return {
            name: nameKey ? String(row[nameKey] || '').trim() : 'Produto sem nome',
            description: descKey ? String(row[descKey] || '').trim() : '',
            status: rawStatus,
            category: catKey ? String(row[catKey] || '').trim() : '',
            sku: skuKey ? String(row[skuKey] || '').trim() : '',
            price: parseFloat(rawPrice) || 0,
            compare_at_price: parseFloat(rawComparePrice) || 0,
            stock: stockKey ? parseInt(String(row[stockKey]).trim(), 10) || 0 : 0,
            images: imagesArray
          }
        })
        
        // Filter out empty rows that might have slipped through
        const validData = mappedData.filter(p => p.name && p.name !== 'Produto sem nome')
        
        if (validData.length === 0) {
          toast.error('Nenhum produto válido encontrado no CSV. Verifique as colunas.')
          return
        }

        setParsedData(validData)
        setImportStatus(null)
      },
      error: (error) => {
        toast.error('Erro ao ler CSV: ' + error.message)
      }
    })
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setIsImporting(true)
    let successCount = 0
    let failedCount = 0
    
    setImportStatus({ total: parsedData.length, success: 0, failed: 0 })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Você não está autenticado.')
      setIsImporting(false)
      return
    }

    for (const p of parsedData) {
      const payload = {
        action: 'CREATE',
        product: {
          name: p.name,
          description: p.description,
          status: p.status,
          category: p.category,
          images: p.images
        },
        variants: [
          {
            sku: p.sku || `SKU-${Math.floor(Math.random() * 100000)}`,
            price: p.price,
            compare_at_price: p.compare_at_price,
            initial_stock: p.stock
          }
        ]
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-products-crud`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        })

        const result = await response.json()
        if (response.ok && result.success) {
          successCount++
        } else {
          failedCount++
        }
      } catch (err) {
        failedCount++
      }

      setImportStatus({ total: parsedData.length, success: successCount, failed: failedCount })
    }

    setIsImporting(false)
    toast.success(`Importação concluída: ${successCount} salvos, ${failedCount} erros.`)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href={getAdminUrl('/produtos')}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader 
          title="Importar Produtos (CSV)" 
          description="Faça o upload de uma planilha para adicionar vários produtos de uma vez."
        />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Passo 1: Upload do Arquivo CSV</CardTitle>
            <CardDescription>
              O arquivo deve conter cabeçalhos na primeira linha. Colunas aceitas: nome, descricao, preco, estoque, categoria, status, sku, imagens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!parsedData.length && (
              <div className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center space-y-4 hover:bg-muted/50 transition-colors">
                <div className="p-4 bg-primary/10 text-primary rounded-full">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-medium">Clique para selecionar um arquivo CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Apenas arquivos .csv são suportados</p>
                </div>
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  className="max-w-xs cursor-pointer file:cursor-pointer"
                />
              </div>
            )}

            {parsedData.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Arquivo lido com sucesso!</p>
                    <p className="text-xs text-muted-foreground">{parsedData.length} produtos encontrados</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setParsedData([])} disabled={isImporting}>
                  Trocar arquivo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {parsedData.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Passo 2: Pré-visualização</CardTitle>
                <CardDescription>Revise os dados antes de importar para o banco de dados.</CardDescription>
              </div>
              <Button onClick={handleImport} disabled={isImporting} className="min-w-[150px]">
                {isImporting ? 'Importando...' : `Importar ${parsedData.length} produtos`}
              </Button>
            </CardHeader>
            <CardContent>
              {importStatus && (
                <div className="mb-6 p-4 rounded-lg bg-card border border-border flex items-center gap-6">
                  <div className="flex-1">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((importStatus.success + importStatus.failed) / importStatus.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm font-medium">
                    <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {importStatus.success} </span>
                    <span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {importStatus.failed} </span>
                    <span className="text-muted-foreground"> / {importStatus.total}</span>
                  </div>
                </div>
              )}

              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium truncate max-w-[200px]">{p.name}</TableCell>
                        <TableCell>R$ {p.price?.toFixed(2)}</TableCell>
                        <TableCell>{p.stock}</TableCell>
                        <TableCell>{p.category || '-'}</TableCell>
                        <TableCell>{p.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
