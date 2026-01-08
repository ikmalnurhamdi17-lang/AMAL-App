"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Search, Users, CalendarDays, AlertCircle } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { simpanLog } from "@/lib/utils" 
import Swal from "sweetalert2"

const DAFTAR_DAPUR = [
  "KH Asep Ali Nurdin",
  "KH Ilal Sabilu Rosyad",
  "K Dindin Ahmad Syahidin",
  "K Ade Abbas Aminulloh",
  "K Asep Toni",
  "Mutawasilin"
]

const BULAN_LIST = [
  { id: 1, nama: "Januari" }, { id: 2, nama: "Februari" }, { id: 3, nama: "Maret" },
  { id: 4, nama: "April" }, { id: 5, nama: "Mei" }, { id: 6, nama: "Juni" },
  { id: 7, nama: "Juli" }, { id: 8, nama: "Agustus" }, { id: 9, nama: "September" },
  { id: 10, nama: "Oktober" }, { id: 11, nama: "November" }, { id: 12, nama: "Desember" }
]

interface ManajemenSantriProps {
  onUpdate: () => void
}

export default function ManajemenSantri({ onUpdate }: ManajemenSantriProps) {
  const [santriList, setSantriList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSantri, setEditingSantri] = useState<any | null>(null)
  const [mulaiTunggakanManual, setMulaiTunggakanManual] = useState(false)

  const [formData, setFormData] = useState({
    nama: "",
    nis: "",
    jenjang: "SMP" as string,
    kelas: "",
    nama_wali: "",
    no_hp_wali: "",
    tanggal_masuk: new Date().toISOString().split("T")[0],
    tanggal_mulai_tagihan: "", 
    status: "aktif" as "aktif" | "nonaktif",
    dapur: "", 
  })

  useEffect(() => {
    loadSantri()
  }, [])

  async function loadSantri() {
    const supabase = getSupabase()
    const { data, error } = await supabase.from("santri").select("*").order("nama", { ascending: true })
    if (error) {
      Swal.fire("Error", "Gagal memuat data santri", "error")
      return
    }
    setSantriList(data || [])
  }

  const updateTagihanDate = (type: 'month' | 'year', value: string) => {
    const sekarang = new Date();
    let [y, m] = (formData.tanggal_mulai_tagihan || `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}-01`).split('-');
    
    if (type === 'month') m = value.padStart(2, '0');
    if (type === 'year') y = value;
    
    setFormData({ ...formData, tanggal_mulai_tagihan: `${y}-${m}-01` });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = getSupabase()

    const dataToSave = {
      ...formData,
      tanggal_mulai_tagihan: mulaiTunggakanManual ? formData.tanggal_mulai_tagihan : null
    }

    try {
      if (editingSantri) {
        const { error } = await supabase.from("santri").update(dataToSave).eq("id", editingSantri.id)
        if (error) throw error
        await simpanLog("UPDATE_SANTRI", `Update data santri: ${formData.nama}`)
      } else {
        const { error } = await supabase.from("santri").insert([dataToSave])
        if (error) throw error
        await simpanLog("TAMBAH_SANTRI", `Registrasi santri baru: ${formData.nama}`)
      }

      setIsDialogOpen(false)
      resetForm()
      loadSantri()
      onUpdate()
      Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 1500, showConfirmButton: false })
    } catch (error: any) {
      Swal.fire("Gagal", error.message || "Terjadi kesalahan", "error")
    }
  }

  function handleEdit(santri: any) {
    setEditingSantri(santri)
    setMulaiTunggakanManual(!!santri.tanggal_mulai_tagihan)
    setFormData({
      nama: santri.nama || "",
      nis: santri.nis || "",
      jenjang: santri.jenjang || "SMP",
      kelas: santri.kelas || "",
      nama_wali: santri.nama_wali || "",
      no_hp_wali: santri.no_hp_wali || "",
      tanggal_masuk: santri.tanggal_masuk || new Date().toISOString().split("T")[0],
      tanggal_mulai_tagihan: santri.tanggal_mulai_tagihan || "",
      status: santri.status || "aktif",
      dapur: santri.dapur || "",
    })
    setIsDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      nama: "", nis: "", jenjang: "SMP", kelas: "", nama_wali: "", no_hp_wali: "",
      tanggal_masuk: new Date().toISOString().split("T")[0],
      tanggal_mulai_tagihan: "",
      status: "aktif", dapur: "",
    })
    setMulaiTunggakanManual(false)
    setEditingSantri(null)
  }

  const filteredSantri = santriList.filter(
    (s) =>
      (s.nama?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.nis?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.dapur?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  )

  return (
    <Card className="border-emerald-200 shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Manajemen Data Santri
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Tambah Santri
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto border-emerald-100">
              <DialogHeader>
                <DialogTitle>{editingSantri ? "Edit Data Santri" : "Registrasi Santri Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nama Lengkap</Label><Input value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>NIS</Label><Input value={formData.nis} onChange={(e) => setFormData({ ...formData, nis: e.target.value })} required /></div>
                  
                  <div className="space-y-2">
                    <Label className="text-emerald-700 font-bold">Pengelola Dapur</Label>
                    <Select value={formData.dapur} onValueChange={(v) => setFormData({ ...formData, dapur: v })} required>
                      <SelectTrigger><SelectValue placeholder="Pilih Dapur" /></SelectTrigger>
                      <SelectContent>
                        {DAFTAR_DAPUR.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jenjang</Label>
                    <Select value={formData.jenjang} onValueChange={(v) => setFormData({ ...formData, jenjang: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["SMP", "SMK", "Kuliah", "Takhosus"].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2"><Label>Kelas</Label><Input value={formData.kelas} onChange={(e) => setFormData({ ...formData, kelas: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Tanggal Masuk</Label><Input type="date" value={formData.tanggal_masuk} onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })} required /></div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-emerald-600" />
                      <Label className="font-bold text-emerald-900 text-sm">Pengaturan Awal Tunggakan</Label>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-emerald-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{mulaiTunggakanManual ? "Manual" : "Otomatis"}</span>
                        <input 
                            type="checkbox" 
                            checked={mulaiTunggakanManual} 
                            onChange={(e) => setMulaiTunggakanManual(e.target.checked)}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                    </div>
                  </div>

                  {mulaiTunggakanManual ? (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-emerald-700 font-bold uppercase">Mulai Bulan</Label>
                        <Select 
                          value={formData.tanggal_mulai_tagihan ? String(parseInt(formData.tanggal_mulai_tagihan.split('-')[1])) : ""} 
                          onValueChange={(v) => updateTagihanDate('month', v)}
                        >
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
                          <SelectContent>
                            {BULAN_LIST.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.nama}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-emerald-700 font-bold uppercase">Mulai Tahun</Label>
                        <Input 
                          type="number" 
                          placeholder="Tahun"
                          className="bg-white"
                          value={formData.tanggal_mulai_tagihan ? formData.tanggal_mulai_tagihan.split('-')[0] : ""}
                          onChange={(e) => updateTagihanDate('year', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-slate-500 italic text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                        <p>Tunggakan akan dihitung otomatis sejak bulan santri masuk ({formData.tanggal_masuk || 'n/a'}).</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nama Wali</Label><Input value={formData.nama_wali} onChange={(e) => setFormData({ ...formData, nama_wali: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>No. HP Wali</Label><Input value={formData.no_hp_wali} onChange={(e) => setFormData({ ...formData, no_hp_wali: e.target.value })} required /></div>
                  <div className="space-y-2">
                    <Label>Status Keaktifan</Label>
                    <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="aktif">Aktif</SelectItem><SelectItem value="nonaktif">Non-Aktif</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 px-6">{editingSantri ? "Perbarui" : "Simpan"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input placeholder="Cari nama, nis, atau pengelola dapur..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-emerald-100 bg-white" />
        </div>

        <div className="relative rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm">
          <div className="overflow-auto h-[500px] no-scrollbar">
            <Table className="relative w-full border-collapse">
              <TableHeader className="sticky top-0 z-20 bg-emerald-50 shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-emerald-900">NIS/Nama</TableHead>
                  <TableHead className="font-bold text-emerald-900">Masuk</TableHead>
                  <TableHead className="font-bold text-emerald-900">Awal Tagihan</TableHead>
                  <TableHead className="font-bold text-emerald-900">Dapur</TableHead>
                  <TableHead className="font-bold text-emerald-900">Jenjang/Kelas</TableHead>
                  <TableHead className="font-bold text-emerald-900">Status</TableHead>
                  <TableHead className="text-right font-bold text-emerald-900">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSantri.map((s) => (
                  <TableRow key={s.id} className="even:bg-emerald-50/40 odd:bg-white hover:bg-emerald-100/50 transition-colors border-b border-emerald-50/50">
                    <TableCell className="py-3">
                      <div className="font-bold text-emerald-950">{s.nama}</div>
                      <div className="text-[10px] text-slate-400">{s.nis}</div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">
                      {s.tanggal_masuk ? new Date(s.tanggal_masuk).toLocaleDateString("id-ID", { month: 'short', year: 'numeric' }) : "-"}
                    </TableCell>
                    <TableCell className="py-3">
                      {s.tanggal_mulai_tagihan ? (
                        <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                          {new Date(s.tanggal_mulai_tagihan).toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sesuai Tgl Masuk</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-xs font-bold text-emerald-700 uppercase">
                      {s.dapur || "-"}
                    </TableCell>
                    <TableCell className="text-xs py-3">{s.jenjang} - {s.kelas}</TableCell>
                    <TableCell className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.status === "aktif" ? "bg-green-100 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{s.status}</span>
                    </TableCell>
                    <TableCell className="text-right py-3 pr-4">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(s)} className="text-emerald-600 hover:bg-emerald-50"><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                           const res = await Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true });
                           if (res.isConfirmed) { await getSupabase().from("santri").delete().eq("id", s.id); loadSantri(); onUpdate(); }
                        }} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
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