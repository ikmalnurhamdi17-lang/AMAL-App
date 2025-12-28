-- Tabel Santri
CREATE TABLE IF NOT EXISTS santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  nis VARCHAR(50) UNIQUE NOT NULL,
  jenjang VARCHAR(10) NOT NULL CHECK (jenjang IN ('SMP', 'SMK')),
  kelas VARCHAR(50),
  nama_wali VARCHAR(255),
  no_hp_wali VARCHAR(20),
  tanggal_masuk DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Pembayaran
CREATE TABLE IF NOT EXISTS pembayaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER NOT NULL,
  bayar_dapur DECIMAL(10,2) DEFAULT 0,
  bayar_syahriah_pesantren DECIMAL(10,2) DEFAULT 0,
  bayar_syahriah_sekolah DECIMAL(10,2) DEFAULT 0,
  total_bayar DECIMAL(10,2) DEFAULT 0,
  tanggal_bayar DATE DEFAULT CURRENT_DATE,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(santri_id, bulan, tahun)
);

-- Tabel Keuangan Pesantren (Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS keuangan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  kategori VARCHAR(100) NOT NULL,
  jumlah DECIMAL(10,2) NOT NULL,
  tanggal DATE DEFAULT CURRENT_DATE,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabel Tarif (untuk mengatur tarif pembayaran)
CREATE TABLE IF NOT EXISTS tarif (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) UNIQUE NOT NULL,
  jumlah DECIMAL(10,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert tarif default
INSERT INTO tarif (nama, jumlah) VALUES
  ('dapur', 350000),
  ('syahriah_pesantren', 50000),
  ('syahriah_sekolah_smp', 50000),
  ('syahriah_sekolah_smk', 100000)
ON CONFLICT (nama) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE keuangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarif ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON santri FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON pembayaran FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON keuangan FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON tarif FOR ALL USING (true);
