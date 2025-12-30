"use client"

import { cn } from "@/lib/utils" // <--- TAMBAHKAN BARIS INI
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, AlertCircle, Loader2, Search, Calendar, Filter } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import type { Santri } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

interface TunggakanDetail {
  santri: Santri
  tunggakan: Array<{
    bulan: number
    tahun: number
    jumlah: number
    rincian: {
      dapur: number
      syahriah_pesantren: number
      syahriah_sekolah: number
    }
  }>
  total: number
}

export default function TunggakanSantri() {
  const [tunggakanList, setTunggakanList] = useState<TunggakanDetail[]>([])
  const [tahunFilter, setTahunFilter] = useState(new Date().getFullYear())
  const [bulanFilter, setBulanFilter] = useState<string>("all") // Filter Bulan Baru
  const [searchTerm, setSearchTerm] = useState("") // Search Nama Baru
  const [loading, setLoading] = useState(false)
  const [tahunOptions, setTahunOptions] = useState<number[]>([])

  useEffect(() => {
    loadTunggakan()
  }, [tahunFilter])

  async function loadTunggakan() {
    setLoading(true)
    const supabase = getSupabase()

    const { data: santriList } = await supabase.from("santri").select("*").eq("status", "aktif")
    const { data: tarifData } = await supabase.from("tarif").select("*")
    const { data: allPembayaran } = await supabase.from("pembayaran").select("*").eq("tahun", tahunFilter)

    if (santriList) {
      const tahunMasukTerkecil = Math.min(...santriList.map(s => {
        const t1 = new Date(s.tanggal_masuk).getFullYear();
        const t2 = s.tanggal_mulai_tagihan ? new Date(s.tanggal_mulai_tagihan).getFullYear() : t1;
        return Math.min(t1, t2);
      }))
      const listTahun = []
      for (let i = new Date().getFullYear() + 1; i >= tahunMasukTerkecil; i--) {
        listTahun.push(i)
      }
      setTahunOptions(listTahun)
    }

    const tarif: any = {}
    tarifData?.forEach((t: any) => { tarif[t.nama] = Number(t.jumlah) })

    const tunggakanData: TunggakanDetail[] = []

    if (santriList) {
      for (const santri of santriList) {
        const tanggalWajibBayar = santri.tanggal_mulai_tagihan 
          ? new Date(santri.tanggal_mulai_tagihan) 
          : new Date(santri.tanggal_masuk);

        const tahunWajib = tanggalWajibBayar.getFullYear();
        const bulanWajib = tanggalWajibBayar.getMonth() + 1;

        if (tahunFilter < tahunWajib) continue;

        const tunggakanSantri: TunggakanDetail = { santri, tunggakan: [], total: 0 };
        const startBulanLoop = tahunFilter === tahunWajib ? bulanWajib : 1;
        
        const sekarang = new Date();
        const endBulanLoop = tahunFilter === sekarang.getFullYear() ? sekarang.getMonth() + 1 : 12;

        for (let bulan = startBulanLoop; bulan <= endBulanLoop; bulan++) {
          const pembayaran = allPembayaran?.find(p => p.santri_id === santri.id && p.bulan === bulan);

          let tarifSekolah = 0;
          const jenjang = santri.jenjang?.toLowerCase();
          if (jenjang === "smk") tarifSekolah = tarif.syahriah_sekolah_smk || 0;
          else if (jenjang === "takhosus") tarifSekolah = tarif.syahriah_sekolah_takhosus || 0;
          else if (jenjang === "kuliah") tarifSekolah = tarif.syahriah_sekolah_kuliah || 0;
          else tarifSekolah = tarif.syahriah_sekolah_smp || 0;

          const harusBayar = (tarif.dapur || 0) + (tarif.syahriah_pesantren || 0) + tarifSekolah;
          const sudahBayar = (pembayaran?.bayar_dapur || 0) + (pembayaran?.bayar_syahriah_pesantren || 0) + (pembayaran?.bayar_syahriah_sekolah || 0);

          const sisaTagihan = harusBayar - sudahBayar;

          if (sisaTagihan > 0) {
            tunggakanSantri.tunggakan.push({
              bulan,
              tahun: tahunFilter,
              jumlah: sisaTagihan,
              rincian: {
                dapur: Math.max(0, (tarif.dapur || 0) - (pembayaran?.bayar_dapur || 0)),
                syahriah_pesantren: Math.max(0, (tarif.syahriah_pesantren || 0) - (pembayaran?.bayar_syahriah_pesantren || 0)),
                syahriah_sekolah: Math.max(0, tarifSekolah - (pembayaran?.bayar_syahriah_sekolah || 0)),
              }
            });
            tunggakanSantri.total += sisaTagihan;
          }
        }

        if (tunggakanSantri.total > 0) {
          tunggakanData.push(tunggakanSantri);
        }
      }
    }

    setTunggakanList(tunggakanData.sort((a, b) => b.total - a.total));
    setLoading(false);
  }

  // LOGIKA FILTER CEPAT (Client-side)
  const filteredTunggakan = useMemo(() => {
    return tunggakanList.filter((item) => {
      const matchSearch = item.santri.nama.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBulan = bulanFilter === "all" 
        ? true 
        : item.tunggakan.some(t => t.bulan === parseInt(bulanFilter));
      
      return matchSearch && matchBulan;
    });
  }, [tunggakanList, searchTerm, bulanFilter]);

  function sendTagihan(detail: TunggakanDetail) {
    let phoneNumber = detail.santri.no_hp_wali || ""
    phoneNumber = phoneNumber.replace(/\D/g, "")
    if (phoneNumber.startsWith("0")) phoneNumber = "62" + phoneNumber.substring(1)

    const items = detail.tunggakan.map(t => `• *${BULAN_NAMES[t.bulan - 1]}*: Rp ${t.jumlah.toLocaleString()}`).join("\n")
    const message = `*TAGIHAN SYAHRIAH*\n*${detail.santri.nama}*\n\nTotal Tunggakan: *Rp ${detail.total.toLocaleString()}*\n\nRincian:\n${items}\n\nJazakumullah.`
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank")
  }

  return (
    <Card className="border-emerald-200 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <div>
                <CardTitle className="text-emerald-900 text-xl font-bold">Tunggakan Santri</CardTitle>
                <p className="text-sm text-emerald-600 font-medium">Monitoring piutang syahriah santri</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Nama */}
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Cari nama..." 
                className="pl-8 h-9 text-xs border-emerald-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Bulan */}
            <Select value={bulanFilter} onValueChange={setBulanFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs border-emerald-100 bg-white">
                <Calendar className="w-3.5 h-3.5 mr-2 text-emerald-600" /> {/* Gunakan Calendar */}
              <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {BULAN_NAMES.map((n, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Tahun */}
            <Select value={tahunFilter.toString()} onValueChange={(value) => setTahunFilter(Number(value))}>
              <SelectTrigger className="w-[100px] h-9 text-xs border-emerald-100 bg-white font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tahunOptions.map((tahun) => (
                  <SelectItem key={tahun} value={tahun.toString()}>{tahun}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <p className="text-sm text-emerald-700 italic">Menghitung piutang...</p>
          </div>
        ) : filteredTunggakan.length === 0 ? (
          <div className="text-center py-20 text-gray-400 italic font-medium border rounded-xl border-dashed border-emerald-100 bg-emerald-50/20">
            Tidak ada data tunggakan ditemukan
          </div>
        ) : (
          /* TABEL DENGAN SCROLL & STICKY HEADER */
          <div className="relative rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
            <div className="overflow-y-auto max-h-[500px] no-scrollbar">
              <Table className="relative">
                <TableHeader className="sticky top-0 z-10 bg-emerald-50 shadow-sm">
                  <TableRow>
                    <TableHead className="font-bold text-emerald-900 bg-emerald-50">Nama Santri</TableHead>
                    <TableHead className="font-bold text-emerald-900 bg-emerald-50">Bulan Menunggak</TableHead>
                    <TableHead className="font-bold text-emerald-900 bg-emerald-50">Sisa Tagihan</TableHead>
                    <TableHead className="text-right font-bold text-emerald-900 bg-emerald-50 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTunggakan.map((detail) => (
                    <TableRow key={detail.santri.id} className="hover:bg-red-50/20 transition-colors border-b border-emerald-50">
                      <TableCell className="py-4">
                        <div className="font-bold text-emerald-950">{detail.santri.nama}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-medium">{detail.santri.jenjang} - {detail.santri.kelas}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {detail.tunggakan.map((t, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className={cn(
                                "text-[9px] px-1.5 py-0 border-red-200 text-red-600 font-bold",
                                bulanFilter !== "all" && parseInt(bulanFilter) === t.bulan ? "bg-red-600 text-white border-red-600" : "bg-white"
                              )}
                            >
                              {BULAN_NAMES[t.bulan - 1].substring(0,3)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-red-600">
                        Rp {detail.total.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button size="sm" onClick={() => sendTagihan(detail)} className="bg-green-600 hover:bg-green-700 shadow-sm h-8 px-4">
                          <Send className="w-3.5 h-3.5 mr-1.5" /> <span className="text-xs">Kirim WA</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center text-[11px] text-slate-500 font-medium px-2">
            <div>Menampilkan {filteredTunggakan.length} santri yang menunggak</div>
            <div className="italic text-emerald-600">* Gunakan scroll vertikal untuk melihat riwayat lengkap</div>
        </div>
      </CardContent>
    </Card>
  )
}