"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from "@/components/ui/command"
import { Check, ChevronsUpDown, Plus, Send, Search, ReceiptJapaneseYen, Pencil, Trash2, Printer } from "lucide-react"
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

interface PembayaranSantriProps {
  onUpdate: () => void
}

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

export default function PembayaranSantri({ onUpdate }: PembayaranSantriProps) {
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [pembayaranList, setPembayaranList] = useState<any[]>([])
  const [tarif, setTarif] = useState<any>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [searchNama, setSearchNama] = useState("")
  const [filterBulan, setFilterBulan] = useState("all")
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString())

  const [formData, setFormData] = useState({
    santri_id: "",
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),
    bayar_dapur: false,
    bayar_syahriah_pesantren: false,
    bayar_syahriah_sekolah: false,
    keterangan: "",
  })

  useEffect(() => {
    loadData()
  }, [])

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

  const cetakKwitansi = async (p: any) => {
    const doc = new jsPDF({ format: [80, 150], unit: "mm" })
    const pageWidth = doc.internal.pageSize.getWidth()

    try {
      try {
        const imgData = await getBase64ImageFromURL("/logoo.png")
        doc.addImage(imgData, "PNG", 8, 6, 12, 12)
        doc.setFontSize(10).setFont("helvetica", "bold")
        doc.text("PONPES AL - HUDA TURALAK", 22, 10)
        doc.setFontSize(7).setFont("helvetica", "normal")
        doc.text("Bukti Pembayaran Syahriah (AMAL)", 22, 14)
        doc.setFontSize(8).setFont("helvetica", "bold")
      } catch (e) {
        doc.setFontSize(10).setFont("helvetica", "bold")
        doc.text("PONPES AL - HUDA TURALAK", pageWidth / 2, 10, { align: "center" })
      }

      doc.setLineWidth(0.5)
      doc.line(8, 22, 72, 22)

      const santri = p.santri
      const tanggal = new Date(p.tanggal_bayar).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })

      doc.setFontSize(8).setFont("helvetica", "normal")
      doc.text(`Tanggal : ${tanggal}`, 8, 28)
      doc.text(`Nama    : ${santri?.nama}`, 8, 33)
      doc.text(`Ref ID  : #PAY-${p.id.slice(0, 8).toUpperCase()}`, 8, 38)
      doc.text(`Periode : ${BULAN_NAMES[p.bulan - 1]} ${p.tahun}`, 8, 43)

      const body = []
      if (p.bayar_dapur > 0) body.push(["Uang Dapur", `Rp ${p.bayar_dapur.toLocaleString("id-ID")}`])
      if (p.bayar_syahriah_pesantren > 0) body.push(["Syahriah Pesantren", `Rp ${p.bayar_syahriah_pesantren.toLocaleString("id-ID")}`])
      if (p.bayar_syahriah_sekolah > 0) body.push(["Syahriah Sekolah", `Rp ${p.bayar_syahriah_sekolah.toLocaleString("id-ID")}`])

      autoTable(doc, {
        startY: 47,
        theme: 'plain',
        margin: { left: 8, right: 8 },
        styles: { fontSize: 8, cellPadding: 1, font: "helvetica" },
        body: body,
        columnStyles: { 1: { halign: 'right' } }
      })

      const finalY = (doc as any).lastAutoTable.finalY + 2
      doc.setLineWidth(0.2)
      doc.line(8, finalY, 72, finalY)
      doc.setFont("helvetica", "bold").setFontSize(9)
      doc.text("TOTAL BAYAR:", 8, finalY + 6)
      doc.text(`Rp ${p.total_bayar.toLocaleString("id-ID")}`, 72, finalY + 6, { align: "right" })

      const qrText = `BUKTI SAH: ${santri?.nama}\nPeriode: ${BULAN_NAMES[p.bulan - 1]} ${p.tahun}\nTotal: Rp ${p.total_bayar.toLocaleString("id-ID")}\nSTATUS: LUNAS`
      const qrBase64 = await QRCode.toDataURL(qrText, { margin: 1 })
      doc.addImage(qrBase64, "PNG", (pageWidth / 2) - 10, finalY + 12, 20, 20)
      
      doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(100)
      doc.text("Simpan bukti pembayaran ini sebagai tanda terima sah.", pageWidth / 2, finalY + 36, { align: "center" })
      doc.text("Jazakumullah Khairan Katsiran.", pageWidth / 2, finalY + 40, { align: "center" })

      await simpanLog("CETAK_KWITANSI", `Cetak kwitansi: ${santri?.nama}`)
      doc.save(`Kwitansi_${santri?.nama}.pdf`)
    } catch (error) {
      Swal.fire("Error", "Gagal cetak PDF", "error")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.santri_id) return
    const supabase = getSupabase()
    const santri = santriList.find((s) => s.id === formData.santri_id)
    if (!santri) return

    let tarifSekolah = 0
    const jenjang = santri.jenjang?.toUpperCase()
    if (jenjang === "SMP") tarifSekolah = tarif.syahriah_sekolah_smp || 0
    else if (jenjang === "SMK") tarifSekolah = tarif.syahriah_sekolah_smk || 0
    else if (jenjang === "KULIAH") tarifSekolah = tarif.syahriah_sekolah_kuliah || 0
    else if (jenjang === "TAKHOSUS") tarifSekolah = tarif.syahriah_sekolah_takhosus || 0

    const payload = {
      santri_id: formData.santri_id,
      bulan: formData.bulan,
      tahun: formData.tahun,
      bayar_dapur: formData.bayar_dapur ? (tarif.dapur || 0) : 0,
      bayar_syahriah_pesantren: formData.bayar_syahriah_pesantren ? (tarif.syahriah_pesantren || 0) : 0,
      bayar_syahriah_sekolah: formData.bayar_syahriah_sekolah ? tarifSekolah : 0,
      total_bayar: 0,
      keterangan: formData.keterangan,
      tanggal_bayar: new Date().toISOString().split("T")[0],
    }
    payload.total_bayar = payload.bayar_dapur + payload.bayar_syahriah_pesantren + payload.bayar_syahriah_sekolah

    try {
      const { error } = editingId 
        ? await supabase.from("pembayaran").update(payload).eq("id", editingId)
        : await supabase.from("pembayaran").upsert([payload], { onConflict: "santri_id,bulan,tahun" })

      if (error) throw error
      await simpanLog(editingId ? "UPDATE_BAYAR" : "INPUT_BAYAR", `${santri.nama} - Rp ${payload.total_bayar.toLocaleString()}`)
      
      Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false, heightAuto: false })
      setIsDialogOpen(false); resetForm(); loadData(); onUpdate()
    } catch (err: any) {
      Swal.fire({ title: "Gagal", text: err.message, icon: "error", heightAuto: false })
    }
  }

  async function handleDelete(id: string, nama: string) {
    const result = await Swal.fire({ title: 'Hapus data?', text: `Hapus pembayaran ${nama}?`, icon: 'warning', showCancelButton: true, heightAuto: false })
    if (result.isConfirmed) {
      const { error } = await getSupabase().from("pembayaran").delete().eq("id", id)
      if (!error) {
        await simpanLog("HAPUS_BAYAR", `Hapus bayar: ${nama}`)
        loadData(); onUpdate()
      }
    }
  }

  function handleEdit(p: any) {
    setEditingId(p.id)
    setFormData({
      santri_id: p.santri_id, bulan: p.bulan, tahun: p.tahun,
      bayar_dapur: p.bayar_dapur > 0,
      bayar_syahriah_pesantren: p.bayar_syahriah_pesantren > 0,
      bayar_syahriah_sekolah: p.bayar_syahriah_sekolah > 0,
      keterangan: p.keterangan || "",
    })
    setIsDialogOpen(true)
  }

  function resetForm() {
    setFormData({ santri_id: "", bulan: new Date().getMonth() + 1, tahun: new Date().getFullYear(), bayar_dapur: false, bayar_syahriah_pesantren: false, bayar_syahriah_sekolah: false, keterangan: "" })
    setEditingId(null)
  }

  function sendWhatsApp(pembayaran: Pembayaran) {
    const santri = pembayaran.santri
    if (!santri) return
    let phoneNumber = santri.no_hp_wali
    if (phoneNumber.startsWith("0")) phoneNumber = "62" + phoneNumber.substring(1)
    const bulan = BULAN_NAMES[pembayaran.bulan - 1]
    
    const items = []
    if (pembayaran.bayar_dapur > 0) items.push(`- Ke Dapur: Rp ${pembayaran.bayar_dapur.toLocaleString("id-ID")}`)
    if (pembayaran.bayar_syahriah_pesantren > 0) items.push(`- Syahriah Pesantren: Rp ${pembayaran.bayar_syahriah_pesantren.toLocaleString("id-ID")}`)
    if (pembayaran.bayar_syahriah_sekolah > 0) items.push(`- Syahriah Sekolah: Rp ${pembayaran.bayar_syahriah_sekolah.toLocaleString("id-ID")}`)

    const message = `*BUKTI PEMBAYARAN*\n*Pesantren Al Huda*\n\nKepada Yth. Bapak/Ibu ${santri.nama_wali}\n\nTelah diterima pembayaran untuk:\n*Nama Santri:* ${santri.nama}\n*NIS:* ${santri.nis}\n*Periode:* ${bulan} ${pembayaran.tahun}\n\n*Rincian Pembayaran:*\n${items.join("\n")}\n\n*Total: Rp ${pembayaran.total_bayar.toLocaleString("id-ID")}*\n\nTanggal: ${new Date(pembayaran.tanggal_bayar).toLocaleDateString("id-ID")}\n\nJazakumullahu khairan\n_Aplikasi AMAL_`
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank")
  }

  const filteredPembayaran = pembayaranList.filter((p) => {
    const matchesNama = p.santri?.nama?.toLowerCase().includes(searchNama.toLowerCase())
    const matchesBulan = filterBulan === "all" || p.bulan.toString() === filterBulan
    const matchesTahun = filterTahun === "" || p.tahun.toString() === filterTahun
    return matchesNama && matchesBulan && matchesTahun
  })

  return (
    <Card className="border-emerald-200 shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><ReceiptJapaneseYen className="w-6 h-6 text-emerald-700" /></div>
            <div>
              <CardTitle className="text-emerald-900 text-xl font-bold">Riwayat Pembayaran</CardTitle>
              <p className="text-sm text-emerald-600">Manajemen transaksi santri</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Input Bayar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-emerald-100">
              <DialogHeader><DialogTitle>{editingId ? "Edit" : "Input"} Pembayaran</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Santri</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {formData.santri_id ? santriList.find((s) => s.id === formData.santri_id)?.nama : "Pilih santri..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="Cari..." />
                        <CommandList>
                          <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {santriList.map((s) => (
                              <CommandItem key={s.id} value={s.nama} onSelect={() => { setFormData({ ...formData, santri_id: s.id }); setOpenCombobox(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", formData.santri_id === s.id ? "opacity-100" : "opacity-0")} />{s.nama}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Select value={formData.bulan.toString()} onValueChange={(v) => setFormData({ ...formData, bulan: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BULAN_NAMES.map((b, i) => <SelectItem key={i+1} value={(i+1).toString()}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Tahun</Label><Input type="number" value={formData.tahun} onChange={(e) => setFormData({ ...formData, tahun: parseInt(e.target.value) })} /></div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl space-y-3 border border-emerald-100">
                  <div className="flex items-center space-x-2"><Checkbox id="dapur" checked={formData.bayar_dapur} onCheckedChange={(c) => setFormData({...formData, bayar_dapur: !!c})} /><Label htmlFor="dapur">Uang Dapur</Label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="pesantren" checked={formData.bayar_syahriah_pesantren} onCheckedChange={(c) => setFormData({...formData, bayar_syahriah_pesantren: !!c})} /><Label htmlFor="pesantren">Syahriah Pesantren</Label></div>
                  <div className="flex items-center space-x-2"><Checkbox id="sekolah" checked={formData.bayar_syahriah_sekolah} onCheckedChange={(c) => setFormData({...formData, bayar_syahriah_sekolah: !!c})} /><Label htmlFor="sekolah">Syahriah Sekolah</Label></div>
                </div>
                <Textarea placeholder="Keterangan..." value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} />
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Simpan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input className="pl-9" placeholder="Cari nama..." value={searchNama} onChange={(e) => setSearchNama(e.target.value)} /></div>
          <Select value={filterBulan} onValueChange={setFilterBulan}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Bulan</SelectItem>{BULAN_NAMES.map((b, i) => <SelectItem key={i+1} value={(i+1).toString()}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-emerald-50/50">
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Santri</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPembayaran.map((p) => (
                <TableRow key={p.id} className="hover:bg-emerald-50/30">
                  <TableCell className="text-xs text-slate-500">{new Date(p.tanggal_bayar).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="font-bold">{p.santri?.nama}</TableCell>
                  <TableCell className="text-xs">{BULAN_NAMES[p.bulan - 1]} {p.tahun}</TableCell>
                  <TableCell className="font-bold text-emerald-700">Rp {p.total_bayar.toLocaleString()}</TableCell>
                  <TableCell className="text-right flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => cetakKwitansi(p)} className="text-blue-600"><Printer className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => sendWhatsApp(p)} className="text-green-600"><Send className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} className="text-emerald-600"><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id, p.santri?.nama)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}