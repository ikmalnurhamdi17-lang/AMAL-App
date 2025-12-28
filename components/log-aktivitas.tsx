"use client"

import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Loader2, Trash2, RefreshCw, Bomb, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Swal from "sweetalert2"

export default function LogAktivitas() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      setLoading(true)
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("logs") 
        .select("id, created_at, admin_email, aksi, rincian")
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs(data || [])
    } catch (error: any) {
      console.error("Gagal memuat log:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- PERBAIKAN KONFIGURASI MIXIN ---
  const MySwal = Swal.mixin({
    customClass: {
      confirmButton: "bg-red-600 text-white px-4 py-2 rounded-md mx-2 hover:bg-red-700 outline-none border-none cursor-pointer",
      cancelButton: "bg-slate-500 text-white px-4 py-2 rounded-md mx-2 hover:bg-slate-600 outline-none border-none cursor-pointer"
    },
    buttonsStyling: false,
    heightAuto: false,
    backdrop: true,
    target: 'body', // Tetap pastikan target ke body
    allowOutsideClick: false,
    // Tambahkan ini untuk mematikan penguncian fokus otomatis yang sering konflik
    returnFocus: false 
  })

  // HAPUS SATU LOG
  async function deleteLog(logId: string) {
    // Gunakan MySwal.fire
    const result = await MySwal.fire({
      title: "Hapus Log?",
      text: "Data akan dihapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      reverseButtons: true, // Memindah Batal ke kiri agar lebih standar
    })

    if (result.isConfirmed) {
      try {
        const supabase = getSupabase()
        const { error } = await supabase.from("logs").delete().eq("id", logId)
        
        if (error) throw error

        setLogs((currentLogs) => currentLogs.filter(log => log.id !== logId))
        
        MySwal.fire({ 
          icon: "success", 
          title: "Terhapus", 
          timer: 1000, 
          showConfirmButton: false 
        })
      } catch (err: any) {
        MySwal.fire("Gagal", err.message, "error")
      }
    }
  }

  // HAPUS SEMUA LOG
  async function deleteAllLogs() {
    const result = await MySwal.fire({
      title: "Kosongkan Semua?",
      text: "Seluruh riwayat akan dihapus!",
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "Ya, Bersihkan!",
      cancelButtonText: "Batal",
      reverseButtons: true,
    })

    if (result.isConfirmed) {
      try {
        setLoading(true)
        const supabase = getSupabase()
        // Trik hapus semua data di Supabase (asumsi RLS mengizinkan)
        const { error } = await supabase
          .from("logs")
          .delete()
          .filter("id", "neq", "00000000-0000-0000-0000-000000000000")
        
        if (error) throw error

        setLogs([])
        MySwal.fire({ icon: "success", title: "Berhasil Dikosongkan", timer: 1500, showConfirmButton: false })
      } catch (err: any) {
        MySwal.fire("Gagal", err.message, "error")
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Log Aktivitas</h2>
            <p className="text-[11px] text-slate-500 italic">Dikelola secara otomatis oleh sistem</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="h-8 border-slate-200 cursor-pointer">
            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteAllLogs} disabled={loading || logs.length === 0} className="h-8 cursor-pointer">
            <Bomb className="w-3.5 h-3.5 mr-2" />
            Kosongkan
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[150px] text-[11px] font-bold uppercase">Waktu</TableHead>
                <TableHead className="w-[120px] text-[11px] font-bold uppercase">Admin</TableHead>
                <TableHead className="w-[100px] text-[11px] font-bold uppercase">Aksi</TableHead>
                <TableHead className="text-[11px] font-bold uppercase">Keterangan</TableHead>
                <TableHead className="w-[50px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 italic text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                    Menghubungkan...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 text-sm">
                    Log kosong.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-[10px] font-medium text-slate-500 italic">
                      {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: id }) : "-"}
                    </TableCell>
                    <TableCell className="text-[11px] font-bold text-slate-700">
                      {log.admin_email?.split('@')[0] || "System"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[8px] px-1.5 h-4 font-black border-none shadow-none",
                        log.aksi.includes("HAPUS") ? "bg-red-100 text-red-600" : 
                        log.aksi.includes("UPDATE") ? "bg-amber-100 text-amber-600" : 
                        "bg-emerald-100 text-emerald-600"
                      )}>
                        {log.aksi}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-600 leading-tight py-3">
                      {log.rincian}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-slate-300 hover:text-red-500 cursor-pointer"
                        onClick={() => deleteLog(log.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}