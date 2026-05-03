import { supabase } from '../lib/supabaseClient';

const BUCKET = 'profileImages';
const PAPERS_BUCKET = 'papers';

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(userId, file, { upsert: true, cacheControl: '0' });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(userId);
  return data.publicUrl;
}

export async function deleteProfilePhoto(userId: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([userId]);
}

// ==========================================
// 2. YENİ MAKALE (ZIP) YÜKLEME İŞLEMLERİ
// ==========================================

export async function uploadPaperZip(file: File): Promise<string> {
  // Supabase'de dosyalar çakışmasın diye benzersiz (UUID) bir isim üretiyoruz
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  
  // Storage içinde düzenli durması için 'submissions' adlı bir alt klasöre koyuyoruz
  const filePath = `submissions/${fileName}`;

  const { error } = await supabase.storage
    .from(PAPERS_BUCKET)
    .upload(filePath, file, { 
      cacheControl: '3600', 
      upsert: false // Her yükleme yeni bir makale olduğu için üstüne yazılmasın
    });

  if (error) throw new Error('Supabase zip upload failed: ' + error.message);

  // Dosya başarıyla yüklendiyse, herkesin (veya backend'in) erişebileceği URL'i alıyoruz
  const { data } = supabase.storage.from(PAPERS_BUCKET).getPublicUrl(filePath);
  
  return data.publicUrl;
}
