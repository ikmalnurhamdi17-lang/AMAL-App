"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Utensils, CheckCircle2, XCircle, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PemegangDapurComponent() {
  const [loading, setLoading] = useState(true)
  const [dataDapur, setDataDapur] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDapur, setSelectedDapur] = useState("semua")
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const [tarifDapur, setTarifDapur] = useState(0)
  const [listDapur, setListDapur] = useState<string[]>([])

  const months = [
    { val: 1, label: "Januari" }, { val: 2, label: "Februari" }, { val: 3, label: "Maret" },
    { val: 4, label: "April" }, { val: 5, label: "Mei" }, { val: 6, label: "Juni" },
    { val: 7, label: "Juli" }, { val: 8, label: "Agustus" }, { val: 9, label: "September" },
    { val: 10, label: "Oktober" }, { val: 11, label: "November" }, { val: 12, label: "Desember" }
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const loadDataDapur = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()

    const [tarifRes, santriRes, bayarRes] = await Promise.all([
      supabase.from("tarif").select("jumlah").eq("nama", "dapur").single(),
      supabase.from("santri").select("id, nama, nis, kelas, jenjang, dapur, tanggal_masuk, tanggal_mulai_tagihan").eq("status", "aktif"),
      supabase.from("pembayaran")
        .select("santri_id, bayar_dapur")
        .eq("bulan", selectedMonth)
        .eq("tahun", selectedYear)
    ])

    const hargaDapur = tarifRes.data?.jumlah || 0
    setTarifDapur(hargaDapur)

    if (santriRes.data) {
      const uniqueDapur: string[] = Array.from(new Set(santriRes.data.map(s => s.dapur).filter(Boolean)))
      setListDapur(uniqueDapur)

      const rekap = santriRes.data
        .filter((santri) => {
          const filterDate = new Date(selectedYear, selectedMonth - 1, 1);
          const acuanTanggal = santri.tanggal_mulai_tagihan 
            ? new Date(santri.tanggal_mulai_tagihan) 
            : new Date(santri.tanggal_masuk);
          
          return filterDate >= new Date(acuanTanggal.getFullYear(), acuanTanggal.getMonth(), 1);
        })
        .map((santri) => {
          const pembayaran = bayarRes.data?.find((p) => p.santri_id === santri.id)
          const jumlahBayar = Number(pembayaran?.bayar_dapur || 0)
          
          return {
            ...santri,
            sudahBayar: jumlahBayar >= hargaDapur,
            nominal: jumlahBayar
          }
        })
      setDataDapur(rekap)
    }
    setLoading(false)
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    loadDataDapur()
  }, [loadDataDapur])

  const filteredData = dataDapur.filter((s) => {
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.includes(searchTerm)
    const matchDapur = selectedDapur === "semua" || s.dapur === selectedDapur
    return matchSearch && matchDapur
  })

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-md">
              <Utensils size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-none">Laporan Dapur</h2>
            </div>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 text-right">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Tarif Wajib Dapur</p>
            <p className="text-lg font-black text-emerald-900 leading-none">Rp {tarifDapur.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <hr className="border-emerald-50" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Dapur</label>
            <Select value={selectedDapur} onValueChange={setSelectedDapur}>
              <SelectTrigger className="border-emerald-100 h-10 text-xs bg-white">
                <SelectValue placeholder="Semua Dapur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Dapur</SelectItem>
                {listDapur.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Bulan</label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="border-emerald-100 h-10 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => <SelectItem key={m.val} value={m.val.toString()}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tahun</label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="border-emerald-100 h-10 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cari Santri</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Nama / NIS..."
                className="pl-9 border-emerald-100 h-10 text-xs bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <Card className="border-emerald-100 shadow-sm overflow-hidden rounded-2xl bg-white">
        {/* Kontainer Scroll dengan batasan ketinggian */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
          <table className="w-full text-sm text-left border-collapse">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-10 bg-emerald-50 text-emerald-900 uppercase text-[10px] font-bold shadow-sm">
              <tr>
                <th className="px-6 py-4">Informasi Santri</th>
                <th className="px-6 py-4">Dapur</th>
                <th className="px-6 py-4 text-center">Status Pembayaran</th>
                <th className="px-6 py-4 text-right">Nominal Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 animate-pulse font-bold uppercase tracking-widest text-xs">
                    Memproses Data...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{item.nama}</div>
                      <div className="text-[10px] text-gray-400 font-medium tracking-tight">NIS: {item.nis} • {item.kelas}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-white text-emerald-700 rounded-lg text-[10px] font-extrabold uppercase border border-emerald-100 shadow-sm">
                        {item.dapur || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {item.sudahBayar ? (
                          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-[10px] font-black border border-green-200">
                            <CheckCircle2 size={12} /> LUNAS
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-[10px] font-black border border-red-200">
                            <XCircle size={12} /> BELUM LUNAS
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-700 font-bold">
                      Rp {item.nominal.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-medium italic">
                    Tidak ada santri yang wajib bayar dapur pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Footer info di bawah tabel */}
        <div className="p-4 bg-emerald-50/30 border-t border-emerald-100 flex justify-between items-center text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
            <span>Total: {filteredData.length} Santri</span>
            <span className="italic">* Scroll vertikal untuk melihat data lain</span>
        </div>
      </Card>
    </div>
  )
}