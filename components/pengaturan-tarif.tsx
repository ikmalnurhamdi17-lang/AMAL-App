"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Save, Loader2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { simpanLog } from "@/lib/utils" // --- IMPORT LOG ---
import Swal from "sweetalert2"

interface PengaturanTarifProps {
  onUpdate: () => void
}

export default function PengaturanTarif({ onUpdate }: PengaturanTarifProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tarif, setTarif] = useState({
    dapur: "",
    syahriah_pesantren: "",
    syahriah_sekolah_smp: "",
    syahriah_sekolah_smk: "",
    syahriah_sekolah_kuliah: "",
    syahriah_sekolah_takhosus: "",
  })

  useEffect(() => {
    loadTarif()
  }, [])

  async function loadTarif() {
    const supabase = getSupabase()
    const { data } = await supabase.from("tarif").select("*")

    if (data) {
      const tarifObj: any = {}
      data.forEach((t: any) => {
        tarifObj[t.nama] = t.jumlah.toString()
      })
      setTarif({
        dapur: tarifObj.dapur || "0",
        syahriah_pesantren: tarifObj.syahriah_pesantren || "0",
        syahriah_sekolah_smp: tarifObj.syahriah_sekolah_smp || "0",
        syahriah_sekolah_smk: tarifObj.syahriah_sekolah_smk || "0",
        syahriah_sekolah_kuliah: tarifObj.syahriah_sekolah_kuliah || "0",
        syahriah_sekolah_takhosus: tarifObj.syahriah_sekolah_takhosus || "0",
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    const supabase = getSupabase()

    const updates = [
      { nama: "dapur", jumlah: Number(tarif.dapur) || 0 },
      { nama: "syahriah_pesantren", jumlah: Number(tarif.syahriah_pesantren) || 0 },
      { nama: "syahriah_sekolah_smp", jumlah: Number(tarif.syahriah_sekolah_smp) || 0 },
      { nama: "syahriah_sekolah_smk", jumlah: Number(tarif.syahriah_sekolah_smk) || 0 },
      { nama: "syahriah_sekolah_kuliah", jumlah: Number(tarif.syahriah_sekolah_kuliah) || 0 },
      { nama: "syahriah_sekolah_takhosus", jumlah: Number(tarif.syahriah_sekolah_takhosus) || 0 },
    ]

    try {
      const { error } = await supabase.from("tarif").upsert(updates, { onConflict: "nama" })
      
      if (error) throw error

      // --- CATAT KE LOG ---
      await simpanLog(
        "UPDATE_TARIF", 
        `Memperbarui seluruh pengaturan biaya (Dapur, Pesantren, & Sekolah)`
      )

      await Swal.fire({
        icon: 'success',
        title: 'Tarif Diperbarui',
        text: 'Perubahan tarif telah disimpan.',
        timer: 2000,
        showConfirmButton: false,
        heightAuto: false
      })
      
      onUpdate() 
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Update',
        text: error.message || 'Terjadi kesalahan saat menyimpan tarif.',
        heightAuto: false
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-emerald-200 shadow-lg max-w-2xl mx-auto overflow-hidden">
      <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
        <CardTitle className="text-emerald-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          Pengaturan Tarif Pembayaran
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Biaya Harian</h3>
              <div>
                <Label htmlFor="dapur" className="text-slate-700">Uang Dapur (Makan)</Label>
                <div className="relative mt-1">
                   <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rp</span>
                   <Input id="dapur" type="number" className="pl-10" value={tarif.dapur} onChange={(e) => setTarif({ ...tarif, dapur: e.target.value })} required />
                </div>
              </div>

              <div>
                <Label htmlFor="syahriah_pesantren" className="text-slate-700">Syahriah Pesantren</Label>
                <div className="relative mt-1">
                   <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rp</span>
                   <Input id="syahriah_pesantren" type="number" className="pl-10" value={tarif.syahriah_pesantren} onChange={(e) => setTarif({ ...tarif, syahriah_pesantren: e.target.value })} required />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Syahriah Sekolah</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="smp" className="text-xs">SMP</Label>
                  <Input id="smp" type="number" value={tarif.syahriah_sekolah_smp} onChange={(e) => setTarif({ ...tarif, syahriah_sekolah_smp: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="smk" className="text-xs">SMK</Label>
                  <Input id="smk" type="number" value={tarif.syahriah_sekolah_smk} onChange={(e) => setTarif({ ...tarif, syahriah_sekolah_smk: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="kuliah" className="text-xs font-bold text-amber-600">Kuliah</Label>
                  <Input id="kuliah" type="number" className="border-amber-200" value={tarif.syahriah_sekolah_kuliah} onChange={(e) => setTarif({ ...tarif, syahriah_sekolah_kuliah: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="takhosus" className="text-xs font-bold text-amber-600">Takhosus</Label>
                  <Input id="takhosus" type="number" className="border-amber-200" value={tarif.syahriah_sekolah_takhosus} onChange={(e) => setTarif({ ...tarif, syahriah_sekolah_takhosus: e.target.value })} required />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 min-w-[200px] shadow-md">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}