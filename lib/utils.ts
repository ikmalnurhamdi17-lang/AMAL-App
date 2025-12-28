import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getSupabase } from "@/lib/supabase"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fungsi Global untuk mencatat log aktivitas
 * @param aksi - Contoh: 'TAMBAH_SANTRI', 'HAPUS_BAYAR'
 * @param rincian - Detail aktivitas (Misal: 'Menambah santri Ahmad')
 * @param metadata - Data tambahan dalam bentuk object (opsional)
 */
export async function simpanLog(aksi: string, rincian: string, metadata: any = {}) {
  const supabase = getSupabase()
  
  // Mengambil data user yang sedang login
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from("logs") // SESUAI NAMA TABEL ANDA
    .insert([
      {
        admin_email: user?.email || "Unknown", // SESUAI KOLOM admin_email
        aksi: aksi,                             // SESUAI KOLOM aksi
        rincian: rincian,                       // SESUAI KOLOM rincian
        metadata: metadata                      // SESUAI KOLOM metadata
      }
    ])

  if (error) {
    console.error("Gagal mencatat log:", error.message)
  }
}