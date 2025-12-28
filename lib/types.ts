export interface Santri {
  id: string
  nama: string
  nis: string
  jenjang: "SMP" | "SMK" | "Kuliah" | "Takhosus"
  kelas: string
  nama_wali: string
  no_hp_wali: string
  tanggal_masuk: string
  status: "aktif" | "nonaktif"
}

export interface Pembayaran {
  id: string
  santri_id: string
  bulan: number
  tahun: number
  bayar_dapur: number
  bayar_syahriah_pesantren: number
  bayar_syahriah_sekolah: number
  total_bayar: number
  tanggal_bayar: string
  keterangan?: string
  santri?: Santri
}

export interface Keuangan {
  id: string
  jenis: "pemasukan" | "pengeluaran"
  kategori: string
  jumlah: number
  tanggal: string
  keterangan?: string
}

export interface Tarif {
  id: string
  nama: string
  jumlah: number
}

export interface Tunggakan {
  santri: Santri
  bulan: number
  tahun: number
  total_tunggakan: number
}

export interface PemegangDapur {
  id: string
  nama: string
  no_hp: string
  alamat: string
  tanggal_mulai: string
  tanggal_selesai?: string
  status: "aktif" | "nonaktif"
  keterangan?: string
}
