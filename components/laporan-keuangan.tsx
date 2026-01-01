"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, TrendingUp, TrendingDown, Search, FileText, Loader2, Wallet, FileDown, Landmark, Banknote } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import type { Keuangan } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { cn, simpanLog } from "@/lib/utils" 
import Swal from "sweetalert2"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface LaporanKeuanganProps {
  onUpdate: () => void
}

const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export default function LaporanKeuangan({ onUpdate }: LaporanKeuanganProps) {
  const [keuanganList, setKeuanganList] = useState<Keuangan[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"pemasukan" | "pengeluaran" | "mutasi">("pemasukan")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDonasiMode, setIsDonasiMode] = useState(false)
  
  const [filterBulan, setFilterBulan] = useState((new Date().getMonth() + 1).toString())
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString())

  const BOT_TOKEN = "8092573112:AAE1W64hhwuBYsSgUSAvfkQfabI0eK3Kz0E";
  const CHAT_ID = "-1003518305542";

  const [formData, setFormData] = useState({
    jenis: "pemasukan" as "pemasukan" | "pengeluaran",
    kategori: "",
    jumlah: "",
    tanggal: new Date().toISOString().split("T")[0],
    keterangan: "",
  })

  useEffect(() => { loadKeuangan() }, [])
  
  async function loadKeuangan() {
    const supabase = getSupabase()
    const { data } = await supabase.from("keuangan").select("*").order("tanggal", { ascending: false })
    setKeuanganList(data || [])
  }

  // --- LOGIKA PERHITUNGAN SALDO ---
  const donasiMasuk = keuanganList.filter(k => k.kategori.startsWith("DONASI:") && k.jenis === "pemasukan").reduce((sum, k) => sum + Number(k.jumlah), 0)
  const donasiKeluar = keuanganList.filter(k => k.kategori.startsWith("DONASI:") && k.jenis === "pengeluaran").reduce((sum, k) => sum + Number(k.jumlah), 0)
  const umumMasuk = keuanganList.filter(k => !k.kategori.startsWith("DONASI:") && k.jenis === "pemasukan").reduce((sum, k) => sum + Number(k.jumlah), 0)
  const umumKeluar = keuanganList.filter(k => !k.kategori.startsWith("DONASI:") && k.jenis === "pengeluaran").reduce((sum, k) => sum + Number(k.jumlah), 0)
  
  const saldoDonasi = donasiMasuk - donasiKeluar
  const saldoUmum = umumMasuk - umumKeluar
  const totalSeluruhSaldo = saldoDonasi + saldoUmum

  const filteredList = keuanganList.filter((k) => {
    if (activeTab === "mutasi") {
        return (new Date(k.tanggal).getMonth() + 1).toString() === filterBulan && new Date(k.tanggal).getFullYear().toString() === filterTahun
    }
    return k.jenis === activeTab && k.kategori.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // (Fungsi cetakMutasi, sendToTelegram, handleSubmit, handleDelete tetap sama seperti sebelumnya...)
  const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.setAttribute("crossOrigin", "anonymous")
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      }
      img.onerror = (error) => reject(error)
      img.src = url
    })
  }

  const cetakMutasi = async () => {
    const mutasiData = keuanganList.filter(k => {
        const d = new Date(k.tanggal)
        return (d.getMonth() + 1).toString() === filterBulan && d.getFullYear().toString() === filterTahun
    }).sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())

    if (mutasiData.length === 0) {
        Swal.fire("Kosong", "Tidak ada transaksi di bulan ini", "info")
        return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    try {
        const imgData = await getBase64ImageFromURL("/logoo.png")
        doc.addImage(imgData, "PNG", 15, 12, 18, 18)
    } catch (e) {}

    doc.setFontSize(14).setFont("helvetica", "bold").text("PONPES AL - HUDA TURALAK", 38, 18)
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(100)
    doc.text("Electronic Statement - Laporan Mutasi Keuangan", 38, 23)
    doc.text(`Periode: ${BULAN_NAMES[parseInt(filterBulan)-1]} ${filterTahun}`, 38, 27)
    doc.setDrawColor(200).line(15, 35, pageWidth - 15, 35)

    const masuk = mutasiData.filter(d => d.jenis === 'pemasukan').reduce((a, b) => a + Number(b.jumlah), 0)
    const keluar = mutasiData.filter(d => d.jenis === 'pengeluaran').reduce((a, b) => a + Number(b.jumlah), 0)

    doc.setFillColor(245, 247, 250).rect(15, 40, pageWidth - 30, 25, "F")
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(50).text("RINGKASAN MUTASI", 20, 47)
    doc.setFont("helvetica", "normal").text(`Total Pemasukan  : Rp ${masuk.toLocaleString('id-ID')}`, 20, 53)
    doc.text(`Total Pengeluaran : Rp ${keluar.toLocaleString('id-ID')}`, 20, 59)
    doc.text(`Saldo Bersih     : Rp ${(masuk - keluar).toLocaleString('id-ID')}`, 120, 53)

    autoTable(doc, {
      startY: 72,
      head: [['TANGGAL', 'KETERANGAN / KATEGORI', 'DEBET (IN)', 'KREDIT (OUT)']],
      body: mutasiData.map(d => [
        new Date(d.tanggal).toLocaleDateString('id-ID'),
        d.kategori.toUpperCase() + (d.keterangan ? `\n(${d.keterangan})` : ""),
        d.jenis === 'pemasukan' ? `Rp ${Number(d.jumlah).toLocaleString('id-ID')}` : '-',
        d.jenis === 'pengeluaran' ? `Rp ${Number(d.jumlah).toLocaleString('id-ID')}` : '-'
      ]),
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 8 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
    })

    doc.setFontSize(7).setTextColor(150).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | AMAL-App`, 15, 285)
    await simpanLog("CETAK_MUTASI", `E-Statement ${BULAN_NAMES[parseInt(filterBulan)-1]} ${filterTahun}`)
    doc.save(`Mutasi_${filterBulan}_${filterTahun}.pdf`)
  }

  const sendToTelegram = async (data: any, tipe: string) => {
    const icon = data.jenis === "pemasukan" ? "✅ DANA MASUK" : "⚠️ DANA KELUAR";
    
    // Hilangkan teks "DONASI: " agar kategori tidak muncul double di Telegram
    const kategoriBersih = data.kategori.replace("DONASI: ", "");
    
    const formattedJumlah = new Intl.NumberFormat("id-ID", { 
      style: "currency", 
      currency: "IDR", 
      minimumFractionDigits: 0 
    }).format(data.jumlah);

    const message = 
      `<b>${icon} (${tipe.toUpperCase()})</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>TANGGAL :</b> <code>${data.tanggal}</code>\n` +
      `📂 <b>KATEGORI :</b> <code>${kategoriBersih.toUpperCase()}</code>\n` +
      `💵 <b>NOMINAL  :</b> <b>${formattedJumlah}</b>\n` +
      `📝 <b>CATATAN  :</b> <i>${data.keterangan || "-"}</i>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `<i>Sistem Aplikasi Manajemen Keuangan Al-Huda</i>`;

    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
      });
    } catch (err) { console.error("Telegram Error:", err) }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); if (isSubmitting) return;
    const finalKategori = isDonasiMode ? `DONASI: ${formData.kategori}` : formData.kategori;
    setIsSubmitting(true);
    try {
      const payload = { jenis: formData.jenis, kategori: finalKategori, jumlah: Number.parseFloat(formData.jumlah), tanggal: formData.tanggal, keterangan: formData.keterangan }
      const { error } = await getSupabase().from("keuangan").insert([payload])
      if (error) throw error
      await simpanLog(`${payload.jenis.toUpperCase()}_BARU`, `Input ${payload.kategori} Rp ${Number(payload.jumlah).toLocaleString()}`);
      sendToTelegram(payload, isDonasiMode ? "Dana Donasi" : "Dana Umum");
      Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1000, showConfirmButton: false })
      setIsDialogOpen(false); loadKeuangan(); onUpdate(); setFormData({ ...formData, kategori: "", jumlah: "", keterangan: "" })
    } catch (err: any) { Swal.fire("Gagal", err.message, "error")
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete(item: Keuangan) {
    const res = await Swal.fire({ title: 'Hapus Transaksi?', text: item.kategori, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' })
    if (res.isConfirmed) {
      const { error } = await getSupabase().from("keuangan").delete().eq("id", item.id)
      if (!error) {
        await simpanLog("HAPUS_KEUANGAN", `Hapus ${item.kategori}`);
        loadKeuangan(); onUpdate();
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. KARTU RINGKASAN SALDO (2 CARD SAJA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-amber-600 text-white shadow-lg border-none">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Donasi</span>
                <Banknote className="w-5 h-5 opacity-40" />
              </div>
              <div className="text-3xl font-black">Rp {saldoDonasi.toLocaleString("id-ID")}</div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-white/10 text-[9px] font-bold">
                <span className="text-emerald-300">MASUK: Rp {donasiMasuk.toLocaleString("id-ID")}</span>
                <span className="text-red-200">KELUAR: Rp {donasiKeluar.toLocaleString("id-ID")}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-emerald-700 text-white shadow-lg border-none">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Umum</span>
                <Wallet className="w-5 h-5 opacity-40" />
              </div>
              <div className="text-3xl font-black">Rp {saldoUmum.toLocaleString("id-ID")}</div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-white/10 text-[9px] font-bold">
                <span className="text-emerald-300">MASUK: Rp {umumMasuk.toLocaleString("id-ID")}</span>
                <span className="text-red-100">KELUAR: Rp {umumKeluar.toLocaleString("id-ID")}</span>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* TOTAL GABUNGAN DI BAWAH KEDUA CARD */}
      <div className="flex justify-center">
          <div className="bg-white border border-emerald-100 px-6 py-2 rounded-full shadow-sm flex items-center gap-3">
              <Landmark className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Saldo Keseluruhan:</span>
              <span className="text-sm font-black text-emerald-900">Rp {totalSeluruhSaldo.toLocaleString("id-ID")}</span>
          </div>
      </div>

      {/* 2. TABEL MANAJEMEN TRANSAKSI */}
      <Card className="shadow-xl border-none">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
          <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Manajemen Transaksi</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold text-xs h-10">
                <Plus className="w-4 h-4 mr-2" /> Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-black text-xl">Catat Transaksi</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <Button type="button" variant={!isDonasiMode ? "default" : "ghost"} onClick={() => setIsDonasiMode(false)} className={cn("h-8 text-[10px] font-bold", !isDonasiMode && "bg-emerald-600")}>Dana Umum</Button>
                    <Button type="button" variant={isDonasiMode ? "default" : "ghost"} onClick={() => setIsDonasiMode(true)} className={cn("h-8 text-[10px] font-bold", isDonasiMode && "bg-amber-600")}>Dana Donasi</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-xs font-bold uppercase">Jenis</Label>
                        <Select value={formData.jenis} onValueChange={(v: any) => setFormData({...formData, jenis: v})}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="pemasukan">Pemasukan</SelectItem><SelectItem value="pengeluaran">Pengeluaran</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label className="text-xs font-bold uppercase">Tanggal</Label><Input type="date" className="h-9 text-xs" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} required /></div>
                </div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase">Kategori</Label><Input className="h-9 text-xs" placeholder="Misal: Sedekah, Listrik, dll" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} required /></div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase">Nominal (Rp)</Label><Input type="number" className="h-9 text-xs font-bold" value={formData.jumlah} onChange={(e) => setFormData({...formData, jumlah: e.target.value})} required /></div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase">Keterangan</Label><Textarea className="text-xs" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
                <Button type="submit" disabled={isSubmitting} className={cn("w-full text-xs font-black h-10 uppercase tracking-widest", isDonasiMode ? "bg-amber-600" : "bg-emerald-600")}>
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : "Simpan Transaksi"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="w-full justify-start rounded-none bg-slate-50 px-4 h-12 border-b">
              <TabsTrigger value="pemasukan" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:text-emerald-700">Pemasukan</TabsTrigger>
              <TabsTrigger value="pengeluaran" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:text-red-700">Pengeluaran</TabsTrigger>
              <TabsTrigger value="mutasi" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:text-blue-700"><FileText className="w-3 h-3 mr-2" /> Mutasi</TabsTrigger>
            </TabsList>

            <div className="p-4 bg-white border-b flex flex-wrap gap-3 items-center">
               {activeTab === "mutasi" ? (
                  <>
                    <Select value={filterBulan} onValueChange={setFilterBulan}>
                        <SelectTrigger className="w-[140px] h-9 text-xs font-bold border-blue-100"><SelectValue /></SelectTrigger>
                        <SelectContent>{BULAN_NAMES.map((b, i) => <SelectItem key={i} value={(i+1).toString()}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" className="w-[100px] h-9 text-xs font-bold border-blue-100" value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} />
                    <Button size="sm" onClick={cetakMutasi} className="bg-blue-600 hover:bg-blue-700 h-9 px-4 text-[10px] font-black uppercase shadow-md">
                        <FileDown className="w-4 h-4 mr-2" /> Cetak E-Statement
                    </Button>
                  </>
               ) : (
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Cari transaksi..." className="pl-10 h-10 text-xs border-slate-100" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
               )}
            </div>

            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10"><TableRow>
                  <TableHead className="pl-6 text-[10px] font-black uppercase py-4">Transaksi</TableHead>
                  <TableHead className="text-[10px] font-black uppercase py-4">Nominal</TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-black uppercase py-4">Opsi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredList.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                        <TableCell className="pl-6 py-4">
                            <div className="font-bold text-[13px] text-slate-800">{item.kategori}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase">{new Date(item.tanggal).toLocaleDateString("id-ID", { day:'2-digit', month:'short', year:'numeric' })} {item.keterangan && `• ${item.keterangan}`}</div>
                        </TableCell>
                        <TableCell className={cn("text-sm font-black", item.jenis === "pemasukan" ? "text-emerald-600" : "text-red-600")}>
                          {item.jenis === "pemasukan" ? "+" : "-"} Rp {Number(item.jumlah).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(item)} className="h-8 w-8 text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}