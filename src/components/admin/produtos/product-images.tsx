'use client'

import * as React from 'react'
import { useState } from 'react'
import { uploadProductImage, removeProductImage } from '@/lib/supabase/storage'
import { Button } from '@/components/admin/ui/button'
import { Trash2, UploadCloud, Star } from 'lucide-react'
import { toast } from 'sonner'

interface ProductImagesProps {
  images: string[]
  onChange: (images: string[]) => void
}

export function ProductImages({ images, onChange }: ProductImagesProps) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Preview opt-out for simplicity, straight to bucket since it's admin
    setUploading(true)
    const toastId = toast.loading('Fazendo upload da imagem...')
    
    try {
      const { url, error } = await uploadProductImage(file)
      if (error) throw error
      if (url) {
        onChange([...images, url])
        toast.success('Imagem enviada com sucesso', { id: toastId })
      }
    } catch (err: any) {
      toast.error('Erro no upload', { id: toastId })
    } finally {
      setUploading(false)
      e.target.value = '' // reset input
    }
  }

  const handleRemove = async (url: string) => {
    // Optional: remove from bucket physically
    await removeProductImage(url)
    onChange(images.filter(img => img !== url))
  }

  const setAsMain = (index: number) => {
    if (index === 0) return
    const newImages = [...images]
    const temp = newImages[0]
    newImages[0] = newImages[index]
    newImages[index] = temp
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((url, i) => (
             <div key={url} className={`relative group rounded-md border overflow-hidden aspect-square bg-muted ${i===0 ? 'ring-2 ring-primary' : ''}`}>
                <img src={url} alt="Produto" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   {i !== 0 && (
                     <Button size="icon" variant="outline" type="button" onClick={() => setAsMain(i)} title="Definir como principal">
                       <Star className="h-4 w-4" />
                     </Button>
                   )}
                   <Button size="icon" variant="destructive" type="button" onClick={() => handleRemove(url)}>
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
                {i === 0 && <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded font-bold uppercase">Principal</div>}
             </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
            <UploadCloud className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium">{uploading ? 'Enviando...' : 'Clique para enviar'}</p>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  )
}
