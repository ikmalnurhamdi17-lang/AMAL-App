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
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { simpanLog } from "@/lib/utils" 
import Swal from "sweetalert2"

const DAFTAR_DAPUR = [
  "KH Asep Ali Nurdin",
  "KH Ilal Sabilu Rosyad",
  "K Dindin Ahmad Syahidin",
  "K Ade Abbas Aminulloh",
  "K Asep Toni"
]

interface ManajemenSantriProps {
  onUpdate: () => void
}

export default function ManajemenSantri({ onUpdate }: ManajemenSantriProps) {
  const [santriList, setSantriList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSantri, setEditingSantri] = useState<any | null>(null)

  const [formData, setFormData] = useState({
    nama: "",
    nis: "",
    jenjang: "SMP" as string,
    kelas: "",
    nama_wali: "",
    no_hp_wali: "",
    tanggal_masuk: new Date().toISOString().split("T")[0],
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = getSupabase()

    try {
      if (editingSantri) {
        const { error } = await supabase.from("santri").update(formData).eq("id", editingSantri.id)
        if (error) throw error
        
        await simpanLog("UPDATE_SANTRI", `Mengubah data santri: ${formData.nama} (NIS: ${formData.nis})`)
        Swal.fire({ icon: 'success', title: 'Diperbarui!', text: 'Data santri berhasil diupdate.', timer: 1500, showConfirmButton: false })
      } else {
        const { error } = await supabase.from("santri").insert([formData])
        if (error) throw error
        
        await simpanLog("TAMBAH_SANTRI", `Mendaftarkan santri baru: ${formData.nama} (NIS: ${formData.nis})`)
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Santri baru telah terdaftar.', timer: 1500, showConfirmButton: false })
      }

      setIsDialogOpen(false)
      resetForm()
      loadSantri()
      onUpdate()
    } catch (error: any) {
      Swal.fire("Gagal", error.message || "Terjadi kesalahan sistem", "error")
    }
  }

  async function handleDelete(id: string, nama: string) {
    const result = await Swal.fire({
      title: 'Hapus Data Santri?',
      text: `Menghapus ${nama}. Seluruh riwayat pembayaran terkait mungkin akan hilang!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    })

    if (result.isConfirmed) {
      const supabase = getSupabase()
      const { error } = await supabase.from("santri").delete().eq("id", id)
      
      if (error) {
        Swal.fire("Gagal", "Tidak dapat menghapus data", "error")
        return
      }

      await simpanLog("HAPUS_SANTRI", `Menghapus data santri permanen: ${nama}`)
      Swal.fire({ title: 'Terhapus!', text: 'Data santri telah dihapus.', icon: 'success', timer: 1500, showConfirmButton: false })
      
      loadSantri()
      onUpdate()
    }
  }

  function handleEdit(santri: any) {
    setEditingSantri(santri)
    setFormData({
      nama: santri.nama,
      nis: santri.nis,
      jenjang: santri.jenjang,
      kelas: santri.kelas,
      nama_wali: santri.nama_wali,
      no_hp_wali: santri.no_hp_wali,
      tanggal_masuk: santri.tanggal_masuk,
      status: santri.status,
      dapur: santri.dapur || "",
    })
    setIsDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      nama: "", nis: "", jenjang: "SMP", kelas: "", nama_wali: "", no_hp_wali: "",
      tanggal_masuk: new Date().toISOString().split("T")[0], status: "aktif", dapur: "",
    })
    setEditingSantri(null)
  }

  const filteredSantri = santriList.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.dapur && s.dapur.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-emerald-100">
              <DialogHeader>
                <DialogTitle>{editingSantri ? "Edit Data Santri" : "Registrasi Santri Baru"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nama Lengkap</Label><Input value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>NIS</Label><Input value={formData.nis} onChange={(e) => setFormData({ ...formData, nis: e.target.value })} required /></div>
                  <div className="space-y-2">
                    <Label className="text-emerald-700 font-bold">Pengelola Dapur</Label>
                    <Select value={formData.dapur} onValueChange={(v) => setFormData({ ...formData, dapur: v })} required>
                      <SelectTrigger className="border-emerald-200"><SelectValue placeholder="Pilih Dapur" /></SelectTrigger>
                      <SelectContent>{DAFTAR_DAPUR.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
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
                  <div className="space-y-2"><Label>Nama Wali</Label><Input value={formData.nama_wali} onChange={(e) => setFormData({ ...formData, nama_wali: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>No. HP Wali</Label><Input value={formData.no_hp_wali} onChange={(e) => setFormData({ ...formData, no_hp_wali: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Tanggal Masuk</Label><Input type="date" value={formData.tanggal_masuk} onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })} required /></div>
                  <div className="space-y-2">
                    <Label>Status Keaktifan</Label>
                    <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="aktif">Aktif</SelectItem><SelectItem value="nonaktif">Non-Aktif</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 px-6">{editingSantri ? "Perbarui Data" : "Simpan Data"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input placeholder="Cari nama, nis, atau pengelola dapur..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-emerald-100 bg-white shadow-sm" />
        </div>

        <div className="relative rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm">
          <div className="overflow-auto h-[500px] no-scrollbar">
            <Table className="relative w-full border-collapse">
              <TableHeader className="sticky top-0 z-20 bg-emerald-50 shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-emerald-900">NIS/Nama</TableHead>
                  <TableHead className="font-bold text-emerald-900">Dapur</TableHead>
                  <TableHead className="font-bold text-emerald-900">Jenjang/Kelas</TableHead>
                  <TableHead className="font-bold text-emerald-900">Wali</TableHead>
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
                    <TableCell className="py-3">
                      <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-emerald-100 uppercase shadow-sm">{s.dapur || "-"}</span>
                    </TableCell>
                    <TableCell className="text-xs py-3">{s.jenjang} - {s.kelas}</TableCell>
                    <TableCell className="py-3">
                      <div className="text-xs font-medium text-slate-700">{s.nama_wali}</div>
                      <div className="text-[10px] text-slate-400">{s.no_hp_wali}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.status === "aktif" ? "bg-green-100 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{s.status}</span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(s)} className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id, s.nama)} className="text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-400 flex justify-between items-center">
          <span>Total: {filteredSantri.length} Santri</span>
          <span className="italic text-emerald-600 font-medium">* Gunakan scroll untuk melihat data lainnya</span>
        </div>
      </CardContent>
    </Card>
  )
}