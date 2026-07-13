import { createClient } from './client'

export async function uploadProductImage(file: File): Promise<{ url: string | null; error: any }> {
  const supabase = createClient()
  
  // Generate a unique file name
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('product_images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    return { url: null, error: uploadError }
  }

  const { data: publicUrlData } = supabase.storage
    .from('product_images')
    .getPublicUrl(filePath)

  return { url: publicUrlData.publicUrl, error: null }
}

export async function removeProductImage(url: string): Promise<{ error: any }> {
  const supabase = createClient()
  
  // Extract path from public URL
  // Format is usually .../storage/v1/object/public/product_images/filename.jpg
  const pathParts = url.split('/product_images/')
  if (pathParts.length !== 2) {
    return { error: new Error('Invalid URL format') }
  }
  
  const filePath = pathParts[1]
  const { error } = await supabase.storage.from('product_images').remove([filePath])
  
  return { error }
}
