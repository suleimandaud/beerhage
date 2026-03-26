// src/lib/uploadProductImage.ts
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base-64';
import { supabase } from './supabase';

function base64ToUint8Array(base64: string) {
  const binary = decode(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function guessExt(uri: string) {
  const clean = uri.split('?')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (!ext) return 'jpg';
  if (ext === 'jpeg') return 'jpg';
  return ext;
}

function guessMime(ext: string) {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export async function uploadProductImage(uri: string, companyUserId: string) {
  const ext = guessExt(uri);
  const filePath = `products/${companyUserId}/${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;

  // ✅ legacy FileSystem keeps EncodingType + readAsStringAsync working on SDK 54
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = base64ToUint8Array(base64);

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, bytes, {
      contentType: guessMime(ext),
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return data.publicUrl;
}
