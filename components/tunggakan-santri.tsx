"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, AlertCircle, Loader2, Users } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { simpanLog } from "@/lib/utils"
import type { Santri } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTunggakan()
  }, [tahunFilter])

  async function loadTunggakan() {
    setLoading(true)
    const supabase = getSupabase()

    const { data: santriList } = await supabase.from("santri").select("*").eq("status", "aktif")
    const { data: tarifData } = await supabase.from("tarif").select("*")
    
    const tarif: any = {}
    tarifData?.forEach((t: any) => {
      tarif[t.nama] = Number(t.jumlah)
    })

    const tunggakanData: TunggakanDetail[] = []

    if (santriList) {
      for (const santri of santriList) {
        const tanggalMasuk = new Date(santri.tanggal_masuk)
        const bulanMasuk = tanggalMasuk.getMonth() + 1
        const tahunMasuk = tanggalMasuk.getFullYear()

        const tunggakanSantri: TunggakanDetail = {
          santri,
          tunggakan: [],
          total: 0,
        }

        const startBulan = tahunFilter === tahunMasuk ? bulanMasuk : 1
        const endBulan = tahunFilter === new Date().getFullYear() ? new Date().getMonth() + 1 : 12

        for (let bulan = startBulan; bulan <= endBulan; bulan++) {
          const { data: pembayaran } = await supabase
            .from("pembayaran")
            .select("*")
            .eq("santri_id", santri.id)
            .eq("bulan", bulan)
            .eq("tahun", tahunFilter)
            .single()

          let tarifSekolah = 0
          const jenjang = santri.jenjang?.toUpperCase()

          if (jenjang === "SMK") tarifSekolah = tarif.syahriah_sekolah_smk || 0
          else if (jenjang === "SMP") tarifSekolah = tarif.syahriah_sekolah_smp || 0
          else if (jenjang === "KULIAH") tarifSekolah = tarif.syahriah_sekolah_kuliah || 0
          else if (jenjang === "TAKHOSUS") tarifSekolah = tarif.syahriah_sekolah_takhosus || 0
          else tarifSekolah = tarif.syahriah_sekolah_smp || 0

          const harus = {
            dapur: tarif.dapur || 0,
            syahriah_pesantren: tarif.syahriah_pesantren || 0,
            syahriah_sekolah: tarifSekolah,
          }

          const totalHarus = harus.dapur + harus.syahriah_pesantren + harus.syahriah_sekolah

          if (!pembayaran) {
            tunggakanSantri.tunggakan.push({
              bulan,
              tahun: tahunFilter,
              jumlah: totalHarus,
              rincian: harus,
            })
            tunggakanSantri.total += totalHarus
          } else {
            const kurang = {
              dapur: Math.max(0, harus.dapur - (pembayaran.bayar_dapur || 0)),
              syahriah_pesantren: Math.max(0, harus.syahriah_pesantren - (pembayaran.bayar_syahriah_pesantren || 0)),
              syahriah_sekolah: Math.max(0, harus.syahriah_sekolah - (pembayaran.bayar_syahriah_sekolah || 0)),
            }
            const totalKurang = kurang.dapur + kurang.syahriah_pesantren + kurang.syahriah_sekolah

            if (totalKurang > 0) {
              tunggakanSantri.tunggakan.push({
                bulan,
                tahun: tahunFilter,
                jumlah: totalKurang,
                rincian: kurang,
              })
              tunggakanSantri.total += totalKurang
            }
          }
        }

        if (tunggakanSantri.total > 0) {
          tunggakanData.push(tunggakanSantri)
        }
      }
    }

    // Urutkan berdasarkan total tunggakan terbesar
    setTunggakanList(tunggakanData.sort((a, b) => b.total - a.total))
    setLoading(false)
  }

  async function sendTagihan(detail: TunggakanDetail) {
    let phoneNumber = detail.santri.no_hp_wali || ""
    if (phoneNumber.startsWith("0")) phoneNumber = "62" + phoneNumber.substring(1)

    const items = detail.tunggakan.map((t) => {
      const rincian = []
      if (t.rincian.dapur > 0) rincian.push(`   • Dapur: Rp ${t.rincian.dapur.toLocaleString("id-ID")}`)
      if (t.rincian.syahriah_pesantren > 0) rincian.push(`   • Pesantren: Rp ${t.rincian.syahriah_pesantren.toLocaleString("id-ID")}`)
      if (t.rincian.syahriah_sekolah > 0) rincian.push(`   • Sekolah: Rp ${t.rincian.syahriah_sekolah.toLocaleString("id-ID")}`)
      return `*${BULAN_NAMES[t.bulan - 1]} ${t.tahun}*\n${rincian.join("\n")}\nSubtotal: Rp ${t.jumlah.toLocaleString("id-ID")}`
    }).join("\n\n")

    const message = `*TAGIHAN PEMBAYARAN SYAHRIAH*\n*Ponpes Al Huda Turalak*\n\nAssalamu'alaikum Wr. Wb.\nKepada Yth. Wali dari *${detail.santri.nama}*\n\nBerikut rincian tunggakan yang belum terselesaikan:\n\n${items}\n\n*TOTAL TAGIHAN: Rp ${detail.total.toLocaleString("id-ID")}*\n\nMohon segera melakukan pembayaran di kantor bendahara. Jazakumullah khairan katsiran.\nWassalamu'alaikum Wr. Wb.`
    
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank")

    // CATAT KE LOG DENGAN FORMAT YANG RAPI
    const daftarBulan = detail.tunggakan.map(t => BULAN_NAMES[t.bulan-1]).join(", ")
    await simpanLog(
      "KIRIM_TAGIHAN", 
      `Kirim WA Tagihan: ${detail.santri.nama} | Total: Rp ${detail.total.toLocaleString("id-ID")} (${daftarBulan})`
    )
  }

  const tahunOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <Card className="border-emerald-200 shadow-lg">
      <CardHeader className="bg-white rounded-t-xl border-b border-emerald-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <div>
              <CardTitle className="text-emerald-900 text-xl font-bold">Tunggakan Santri</CardTitle>
              <p className="text-sm text-emerald-600 font-medium">Monitoring kewajiban syahriah yang belum lunas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 uppercase">Tahun Akademik:</span>
            <Select value={tahunFilter.toString()} onValueChange={(v) => setTahunFilter(Number(v))}>
              <SelectTrigger className="w-32 border-emerald-200 focus:ring-emerald-500"><SelectValue /></SelectTrigger>
              <SelectContent>{tahunOptions.map(t => <SelectItem key={t} value={t.toString()}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700 animate-pulse">Menghitung data tunggakan...</p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-100 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-emerald-50/50">
                <TableRow>
                  <TableHead className="font-bold text-emerald-900">Nama Santri</TableHead>
                  <TableHead className="font-bold text-emerald-900">Jenjang</TableHead>
                  <TableHead className="font-bold text-emerald-900">Bulan Menunggak</TableHead>
                  <TableHead className="font-bold text-emerald-900">Total Tunggakan</TableHead>
                  <TableHead className="text-right font-bold text-emerald-900">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tunggakanList.map((detail) => (
                  <TableRow key={detail.santri.id} className="hover:bg-red-50/30 transition-colors border-b border-emerald-50/50">
                    <TableCell className="font-bold text-emerald-950">{detail.santri.nama}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 bg-emerald-50 text-emerald-700">
                        {detail.santri.jenjang}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="flex flex-wrap gap-1">
                        {detail.tunggakan.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-600">
                            {BULAN_NAMES[t.bulan-1].substring(0, 3)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-red-600">
                      Rp {detail.total.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => sendTagihan(detail)} 
                        className="bg-green-600 hover:bg-green-700 shadow-sm h-8"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" /> <span className="text-xs">Kirim WA</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tunggakanList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-10 h-10 text-emerald-100" />
                        <p className="text-slate-400 text-sm font-medium italic">Alhamdulillah, tidak ada tunggakan pada periode ini.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && tunggakanList.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 italic">
            <AlertCircle className="w-3 h-3" />
            <span>Data tunggakan dihitung secara otomatis berdasarkan selisih tarif aktif dengan riwayat pembayaran yang masuk.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}