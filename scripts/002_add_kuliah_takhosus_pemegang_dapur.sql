-- Menambahkan jenjang Kuliah dan Takhosus ke constraint
ALTER TABLE santri DROP CONSTRAINT IF EXISTS santri_jenjang_check;
ALTER TABLE santri ADD CONSTRAINT santri_jenjang_check CHECK (jenjang IN ('SMP', 'SMK', 'Kuliah', 'Takhosus'));

-- Menambahkan tarif untuk Kuliah dan Takhosus
INSERT INTO tarif (nama, jumlah) VALUES
  ('syahriah_sekolah_kuliah', 150000),
  ('syahriah_sekolah_takhosus', 75000)
ON CONFLICT (nama) DO NOTHING;

-- Tabel baru untuk data pemegang dapur
CREATE TABLE IF NOT EXISTS pemegang_dapur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  no_hp VARCHAR(20),
  alamat TEXT,
  tanggal_mulai DATE DEFAULT CURRENT_DATE,
  tanggal_selesai DATE,
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security untuk pemegang_dapur
ALTER TABLE pemegang_dapur ENABLE ROW LEVEL SECURITY;

-- Create policy untuk pemegang_dapur
CREATE POLICY "Allow all for authenticated users" ON pemegang_dapur FOR ALL USING (true);
