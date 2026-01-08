"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Send, Search, ReceiptJapaneseYen, Pencil, Trash2, Printer, CalendarDays, Filter, User, Check, Info } from "lucide-react"
import { cn, simpanLog } from "@/lib/utils" 
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabase } from "@/lib/supabase"
import type { Santri } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import Swal from "sweetalert2"
import QRCode from "qrcode"

const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.setAttribute("crossOrigin", "anonymous")
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = (error) => reject(error)
    img.src = url
  })
}

export default function PembayaranSantri({ onUpdate }: { onUpdate: () => void }) {
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [pembayaranList, setPembayaranList] = useState<any[]>([])
  const [tarif, setTarif] = useState<any>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [santriSearchQuery, setSantriSearchQuery] = useState("")
  const [selectedSantriObj, setSelectedSantriObj] = useState<Santri | null>(null)

  const [selectedBulans, setSelectedBulans] = useState<number[]>([new Date().getMonth() + 1])
  const [formData, setFormData] = useState({
    santri_id: "",
    tahun: new Date().getFullYear(),
    bayar_dapur: true,
    bayar_syahriah_pesantren: true,
    bayar_syahriah_sekolah: true,
    keterangan: "",
  })

  // LOGIKA OTOMATIS MUTAWASILIN (MENGUNCI FORM)
  useEffect(() => {
    if (selectedSantriObj?.dapur === "Mutawasilin") {
      setFormData(prev => ({
        ...prev,
        bayar_dapur: false,
        bayar_syahriah_sekolah: false,
        bayar_syahriah_pesantren: true
      }));
    }
  }, [selectedSantriObj]);

  const [searchNama, setSearchNama] = useState("")
  const [filterBulan, setFilterBulan] = useState("all")
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = getSupabase()
    const { data: santriData } = await supabase.from("santri").select("*").eq("status", "aktif").order("nama", { ascending: true })
    const { data: pembayaranData } = await supabase.from("pembayaran").select("*, santri(*)").order("tanggal_bayar", { ascending: false })
    const { data: tarifData } = await supabase.from("tarif").select("*")

    setSantriList(santriData || [])
    setPembayaranList(pembayaranData || [])
    const tarifObj: any = {}
    tarifData?.forEach((t: any) => { tarifObj[t.nama] = Number(t.jumlah) })
    setTarif(tarifObj)
  }

  const filteredSantriOptions = useMemo(() => {
    return santriList.filter(s => 
      s.nama.toLowerCase().includes(santriSearchQuery.toLowerCase()) ||
      s.nis.toLowerCase().includes(santriSearchQuery.toLowerCase())
    )
  }, [santriList, santriSearchQuery])

  const toggleBulan = useCallback((bulanIdx: number) => {
    setSelectedBulans(prev => 
      prev.includes(bulanIdx) ? prev.filter(b => b !== bulanIdx) : [...prev, bulanIdx]
    )
  }, [])

  const cetakKwitansi = async (p: any) => {
    const doc = new jsPDF({ format: [80, 150], unit: "mm" })
    const pageWidth = doc.internal.pageSize.getWidth()
    try {
      try {
        const imgData = await getBase64ImageFromURL("/logoo.png")
        doc.addImage(imgData, "PNG", 8, 6, 12, 12)
        doc.setFontSize(10).setFont("helvetica", "bold").text("PONPES AL - HUDA TURALAK", 22, 10)
        doc.setFontSize(7).setFont("helvetica", "normal").text("Bukti Pembayaran Syahriah (AMAL)", 22, 14)
      } catch (e) {
        doc.setFontSize(10).setFont("helvetica", "bold").text("AL - HUDA TURALAK", pageWidth / 2, 10, { align: "center" })
      }
      doc.setLineWidth(0.5).line(8, 22, 72, 22)
      doc.setFontSize(8).setFont("helvetica", "normal")
      doc.text(`Nama   : ${p.santri?.nama}`, 8, 30)
      doc.text(`Periode: ${BULAN_NAMES[p.bulan - 1]} ${p.tahun}`, 8, 35)
      doc.text(`Tanggal: ${new Date(p.tanggal_bayar).toLocaleDateString("id-ID")}`, 8, 40)
      const body = []
      if (p.bayar_dapur > 0) body.push(["Dapur", `Rp ${p.bayar_dapur.toLocaleString()}`])
      if (p.bayar_syahriah_pesantren > 0) body.push(["Pesantren", `Rp ${p.bayar_syahriah_pesantren.toLocaleString()}`])
      if (p.bayar_syahriah_sekolah > 0) body.push(["Sekolah", `Rp ${p.bayar_syahriah_sekolah.toLocaleString()}`])
      autoTable(doc, {
        startY: 45, theme: 'plain', margin: { left: 8, right: 8 },
        styles: { fontSize: 8, cellPadding: 1 },
        body: body, columnStyles: { 1: { halign: 'right' } }
      })
      const finalY = (doc as any).lastAutoTable.finalY + 2
      doc.setFont("helvetica", "bold").text("TOTAL:", 8, finalY + 5)
      doc.text(`Rp ${p.total_bayar.toLocaleString()}`, 72, finalY + 5, { align: "right" })
      const qrSize = 25
      const qrX = (pageWidth / 2) - (qrSize / 2)
      const qrY = finalY + 10
      const qrText = `SAH: ${p.santri?.nama} | Rp ${p.total_bayar.toLocaleString()} | ${p.bulan}/${p.tahun}`
      const qrBase64 = await QRCode.toDataURL(qrText, { margin: 1 })
      doc.addImage(qrBase64, "PNG", qrX, qrY, qrSize, qrSize)

      const textYStart = qrY + qrSize + 5
      doc.setFont("helvetica", "italic").setFontSize(7)
      doc.text("-- Scan Untuk Verifikasi Data --", pageWidth / 2, textYStart, { align: "center" })
      doc.text("-- Jazakumullah Khairan Katsiran --", pageWidth / 2, textYStart + 4, { align: "center" })
      doc.text("-- Dokumen Sah Digital --", pageWidth / 2, textYStart + 8, { align: "center" })
      doc.save(`Kwitansi_${p.santri?.nama.replace(/\s+/g, '_')}.pdf`)
    } catch (error) { 
      console.error(error)
      Swal.fire("Error", "Gagal mencetak kwitansi", "error") 
    }
  }

  const sendWhatsApp = (p: any) => {
    const phone = p.santri?.no_hp_wali?.replace(/\D/g, "")
    if (!phone) return Swal.fire("Error", "No HP Wali Kosong", "error")
    const fixedPhone = phone.startsWith("0") ? "62" + phone.substring(1) : phone
    const msg = `*BUKTI PEMBAYARAN*%0A*Ponpes Al - Huda Turalak*%0A%0AAlhamdulillah, diterima pembayaran: *${p.santri?.nama}*%0APeriode: ${BULAN_NAMES[p.bulan-1]} ${p.tahun}%0ATotal: Rp ${p.total_bayar.toLocaleString()}%0AJazakumullah Khairan Katsiran.`
    window.open(`https://wa.me/${fixedPhone}?text=${msg}`, "_blank")
  }

  // LOGIKA PERHITUNGAN TUNGGAKAN & NOMINAL TRANSAKSI
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.santri_id || selectedBulans.length === 0) return

    const supabase = getSupabase()
    const santri = selectedSantriObj
    if (!santri) return

    const isMutawasilin = santri.dapur === "Mutawasilin"

    // Tentukan nominal pesantren dari tab pengaturan tarif
    const nominalSyahriahPesantren = tarif.syahriah_pesantren || 0

    let tSekolah = 0
    if (!isMutawasilin) {
      const j = santri.jenjang?.toLowerCase()
      if (j === "smk") tSekolah = tarif.syahriah_sekolah_smk || 0
      else if (j === "takhosus") tSekolah = tarif.syahriah_sekolah_takhosus || 0
      else if (j === "kuliah") tSekolah = tarif.syahriah_sekolah_kuliah || 0
      else tSekolah = tarif.syahriah_sekolah_smp || 0
    }

    // PAKSA NOMINAL MENYESUAIKAN STATUS
    const valDapur = (!isMutawasilin && formData.bayar_dapur) ? (tarif.dapur || 0) : 0
    const valPesantren = formData.bayar_syahriah_pesantren ? nominalSyahriahPesantren : 0
    const valSekolah = (!isMutawasilin && formData.bayar_syahriah_sekolah) ? tSekolah : 0

    const totalBayarPerBulan = valDapur + valPesantren + valSekolah

    try {
      const batchData = selectedBulans.map(bulan => ({
        santri_id: formData.santri_id,
        bulan: bulan,
        tahun: formData.tahun,
        bayar_dapur: valDapur,
        bayar_syahriah_pesantren: valPesantren,
        bayar_syahriah_sekolah: valSekolah,
        total_bayar: totalBayarPerBulan,
        keterangan: formData.keterangan || (isMutawasilin ? "Syahriah Mutawasilin" : "Input Kolektif"),
        tanggal_bayar: new Date().toISOString().split("T")[0],
      }))

      const { error } = await supabase.from("pembayaran").upsert(batchData, { onConflict: "santri_id,bulan,tahun" })
      if (error) throw error

      Swal.fire({ icon: 'success', title: 'Berhasil Disimpan', timer: 1000, showConfirmButton: false })
      setIsDialogOpen(false)
      loadData(); onUpdate()
      resetForm()
    } catch (err: any) { Swal.fire("Gagal", err.message, "error") }
  }

  function handleEdit(p: any) {
    setEditingId(p.id)
    setSelectedBulans([p.bulan])
    setSelectedSantriObj(p.santri)
    setFormData({
      santri_id: p.santri_id,
      tahun: p.tahun,
      bayar_dapur: p.bayar_dapur > 0,
      bayar_syahriah_pesantren: p.bayar_syahriah_pesantren > 0,
      bayar_syahriah_sekolah: p.bayar_syahriah_sekolah > 0,
      keterangan: p.keterangan || "",
    })
    setIsDialogOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setSelectedSantriObj(null)
    setSantriSearchQuery("")
    setFormData({
        santri_id: "",
        tahun: new Date().getFullYear(),
        bayar_dapur: true,
        bayar_syahriah_pesantren: true,
        bayar_syahriah_sekolah: true,
        keterangan: ""
    })
  }

  const filteredPembayaran = pembayaranList.filter((p) => {
    const matchesNama = p.santri?.nama?.toLowerCase().includes(searchNama.toLowerCase())
    const matchesBulan = filterBulan === "all" || p.bulan.toString() === filterBulan
    const matchesTahun = filterTahun === "all" || p.tahun.toString() === filterTahun
    return matchesNama && matchesBulan && matchesTahun
  })

  return (
    <Card className="border-emerald-200 shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><ReceiptJapaneseYen className="w-6 h-6 text-emerald-700" /></div>
            <CardTitle className="text-emerald-900 text-xl font-bold">Riwayat Pembayaran</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(val) => { setIsDialogOpen(val); if(!val) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Input Bayar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Edit" : "Input"} Pembayaran</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                
                <div className="space-y-2">
                  <Label>Cari & Pilih Santri</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Ketik nama atau NIS..." 
                      value={santriSearchQuery}
                      onChange={(e) => setSantriSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="border rounded-lg max-h-40 overflow-y-auto bg-slate-50 shadow-inner p-1 space-y-1">
                    {filteredSantriOptions.length > 0 ? (
                      filteredSantriOptions.map((s) => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            setFormData({ ...formData, santri_id: s.id })
                            setSelectedSantriObj(s)
                            setSantriSearchQuery(s.nama)
                          }}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-xs transition-colors",
                            formData.santri_id === s.id ? "bg-emerald-600 text-white font-bold" : "hover:bg-emerald-100 text-slate-700"
                          )}
                        >
                          <div className="flex flex-col">
                            <span>{s.nama}</span>
                            <span className={cn("text-[10px]", formData.santri_id === s.id ? "text-emerald-100" : "text-slate-400")}>
                              NIS: {s.nis} | Dapur: {s.dapur || "N/A"}
                            </span>
                          </div>
                          {formData.santri_id === s.id && <Check className="h-4 w-4" />}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 italic">Santri tidak ditemukan</div>
                    )}
                  </div>
                  {selectedSantriObj && (
                    <div className={cn(
                      "p-2 rounded border flex items-center gap-2",
                      selectedSantriObj.dapur === "Mutawasilin" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-100"
                    )}>
                        <User className={cn("h-3 w-3", selectedSantriObj.dapur === "Mutawasilin" ? "text-amber-600" : "text-emerald-600")} />
                        <span className={cn("text-[11px] font-bold", selectedSantriObj.dapur === "Mutawasilin" ? "text-amber-800" : "text-emerald-800")}>
                          {selectedSantriObj.nama} {selectedSantriObj.dapur === "Mutawasilin" && "(Hanya Syahriah Pesantren)"}
                        </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tahun</Label>
                  <Input type="number" value={formData.tahun} onChange={(e) => setFormData(p => ({...p, tahun: parseInt(e.target.value)}))} />
                </div>

                <div className="space-y-2">
                  <Label>Pilih Bulan</Label>
                  <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg border">
                    {BULAN_NAMES.map((name, idx) => (
                      <div 
                        key={idx} onClick={() => toggleBulan(idx + 1)}
                        className={cn("cursor-pointer p-2 rounded text-center text-[10px] font-bold transition-all border",
                        selectedBulans.includes(idx + 1) ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "bg-white text-slate-500 border-slate-200")}
                      >{name.substring(0, 3)}</div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg space-y-2 border">
                  {[
                    { key: "dapur", label: "Dapur", disabled: selectedSantriObj?.dapur === "Mutawasilin" },
                    { key: "syahriah_pesantren", label: "Syahriah Pesantren", disabled: false },
                    { key: "syahriah_sekolah", label: "Syahriah Sekolah", disabled: selectedSantriObj?.dapur === "Mutawasilin" }
                  ].map((item) => (
                    <div key={item.key} className={cn("flex items-center space-x-2", item.disabled && "opacity-40 grayscale pointer-events-none")}>
                      <Checkbox 
                        id={item.key} 
                        checked={(formData as any)[`bayar_${item.key}`]} 
                        onCheckedChange={(c) => setFormData(p => ({...p, [`bayar_${item.key}`]: !!c}))}
                        disabled={item.disabled}
                      />
                      <Label htmlFor={item.key} className="capitalize text-xs cursor-pointer">
                        {item.label} {item.disabled && "(N/A)"}
                      </Label>
                    </div>
                  ))}
                  
                  {selectedSantriObj?.dapur === "Mutawasilin" && (
                    <div className="mt-2 p-2 bg-amber-100 rounded text-[10px] text-amber-800 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span>Otomatis diset sesuai tarif Syahriah Pesantren.</span>
                    </div>
                  )}
                </div>
                <Textarea placeholder="Keterangan..." value={formData.keterangan} onChange={(e) => setFormData(p => ({...p, keterangan: e.target.value}))} />
                <Button type="submit" className="w-full bg-emerald-600 font-bold shadow-lg py-6 text-lg">Simpan Transaksi</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Section Filter Tabel */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-emerald-700">Cari Nama</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
              <Input placeholder="Nama santri..." value={searchNama} onChange={(e) => setSearchNama(e.target.value)} className="pl-8 h-9 text-xs" />
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-emerald-700">Filter Bulan</Label>
            <Select value={filterBulan} onValueChange={setFilterBulan}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {BULAN_NAMES.map((name, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-emerald-700">Filter Tahun</Label>
            <Select value={filterTahun} onValueChange={setFilterTahun}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" size="sm" className="w-full h-9 text-xs border-emerald-200 text-emerald-700" onClick={() => { setSearchNama(""); setFilterBulan("all"); setFilterTahun(new Date().getFullYear().toString()); }}>
              Reset Filter
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
            <Table className="relative w-full border-collapse">
              <TableHeader className="sticky top-0 z-20 bg-emerald-50 shadow-sm">
                <TableRow>
                  <TableHead className="font-bold text-emerald-900 bg-emerald-50">Santri</TableHead>
                  <TableHead className="font-bold text-emerald-900 bg-emerald-50">Periode</TableHead>
                  <TableHead className="font-bold text-emerald-900 bg-emerald-50">Total</TableHead>
                  <TableHead className="text-right font-bold text-emerald-900 bg-emerald-50">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPembayaran.map(p => (
                  <TableRow key={p.id} className="hover:bg-emerald-50/30 transition-colors border-b border-emerald-50">
                    <TableCell className="py-3">
                      <div className="font-bold text-emerald-950">{p.santri?.nama}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        {new Date(p.tanggal_bayar).toLocaleDateString("id-ID")}
                        {p.santri?.dapur === "Mutawasilin" && <span className="bg-amber-100 text-amber-700 px-1 rounded-sm text-[9px] font-bold">MUTAWASILIN</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-emerald-800">
                      {BULAN_NAMES[p.bulan-1]} {p.tahun}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-700 text-sm">
                      Rp {p.total_bayar.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => cetakKwitansi(p)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"><Printer className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => sendWhatsApp(p)} className="text-green-600 hover:bg-green-50 h-8 w-8 p-0"><Send className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} className="text-emerald-600 hover:bg-emerald-50 h-8 w-8 p-0"><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                           const res = await Swal.fire({ title: 'Hapus?', text: 'Hapus data ini?', icon: 'warning', showCancelButton: true });
                           if (res.isConfirmed) { await getSupabase().from("pembayaran").delete().eq("id", p.id); loadData(); onUpdate(); }
                        }} className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}