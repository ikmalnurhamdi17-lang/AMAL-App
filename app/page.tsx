"use client"

import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, Wallet, TrendingDown, TrendingUp, LogOut, LayoutDashboard, 
  UserCircle, Receipt, AlertCircle, BarChart3, Settings, Utensils, History, Menu 
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import DashboardOverview from "@/components/dashboard-overview"
import ManajemenSantri from "@/components/manajemen-santri"
import PembayaranSantri from "@/components/pembayaran-santri"
import LaporanKeuangan from "@/components/laporan-keuangan"
import TunggakanSantri from "@/components/tunggakan-santri"
import PengaturanTarif from "@/components/pengaturan-tarif"
import PemegangDapurComponent from "@/components/pemegang-dapur"
import LogAktivitas from "@/components/log-aktivitas" 
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import Swal from "sweetalert2"

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [stats, setStats] = useState({
    totalSantri: 0,
    totalPemasukan: 0,
    totalPengeluaran: 0,
    totalTunggakan: 0,
  })

  const fetchUser = useCallback(async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserEmail(user.email ?? null)
  }, [])

  const isAdmin = userEmail === "admin@alhuda.com"

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Keluar Aplikasi?',
      text: "Sesi Anda akan diakhiri.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Ya, Keluar',
      heightAuto: false
    })

    if (result.isConfirmed) {
      const supabase = getSupabase()
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    }
  }

  const loadStats = useCallback(async () => {
    const supabase = getSupabase()
    const [santriRes, pembayaranRes, pemasukanRes, pengeluaranRes, tarifRes] = await Promise.all([
      supabase.from("santri").select("id, tanggal_masuk, jenjang").eq("status", "aktif"),
      supabase.from("pembayaran").select("santri_id, total_bayar, bulan, tahun"),
      supabase.from("keuangan").select("jumlah").eq("jenis", "pemasukan"),
      supabase.from("keuangan").select("jumlah").eq("jenis", "pengeluaran"),
      supabase.from("tarif").select("nama, jumlah")
    ])

    const tarifMap: Record<string, number> = {}
    tarifRes.data?.forEach((t: any) => { tarifMap[t.nama] = Number(t.jumlah) })

    const lunasMap = new Map()
    pembayaranRes.data?.forEach(p => {
      lunasMap.set(`${p.santri_id}-${p.bulan}-${p.tahun}`, Number(p.total_bayar))
    })

    let calculatedTunggakan = 0
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    if (santriRes.data) {
      santriRes.data.forEach((santri) => {
        const tglMasuk = new Date(santri.tanggal_masuk)
        const biayaSekolah = tarifMap[`syahriah_sekolah_${santri.jenjang?.toLowerCase()}`] || 0
        const totalWajib = (tarifMap.dapur || 0) + (tarifMap.syahriah_pesantren || 0) + biayaSekolah
        for (let th = tglMasuk.getFullYear(); th <= currentYear; th++) {
          const start = th === tglMasuk.getFullYear() ? tglMasuk.getMonth() + 1 : 1
          const end = th === currentYear ? currentMonth : 12
          for (let bln = start; bln <= end; bln++) {
            const bayar = lunasMap.get(`${santri.id}-${bln}-${th}`)
            if (bayar === undefined) calculatedTunggakan += totalWajib
            else if (bayar < totalWajib) calculatedTunggakan += (totalWajib - bayar)
          }
        }
      })
    }

    setStats({
      totalSantri: santriRes.data?.length || 0,
      totalPemasukan: (pembayaranRes.data?.reduce((a, b) => a + Number(b.total_bayar), 0) || 0) + (pemasukanRes.data?.reduce((a, b) => a + Number(b.jumlah), 0) || 0),
      totalPengeluaran: pengeluaranRes.data?.reduce((a, b) => a + Number(b.jumlah), 0) || 0,
      totalTunggakan: calculatedTunggakan
    })
  }, [])

  useEffect(() => { loadStats(); fetchUser() }, [loadStats, fetchUser])

  const navigationMenu = useMemo(() => {
    const baseMenu = [{ id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> }]
    if (isAdmin) {
      return [
        ...baseMenu,
        { id: "santri", label: "Data Santri", icon: <UserCircle size={16} /> },
        { id: "pembayaran", label: "Pembayaran", icon: <Receipt size={16} /> },
        { id: "tunggakan", label: "Tunggakan", icon: <AlertCircle size={16} /> },
        { id: "keuangan", label: "Laporan", icon: <BarChart3 size={16} /> },
        { id: "pengaturan", label: "Biaya", icon: <Settings size={16} /> },
        { id: "pemegang-dapur", label: "Dapur", icon: <Utensils size={16} /> },
      ]
    } else {
      return [...baseMenu, { id: "log", label: "Log Aktivitas", icon: <History size={16} /> }]
    }
  }, [isAdmin])

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            
            {/* LEFT: Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 shadow-sm">
                <Image src="/logoo.png" alt="Logo" width={34} height={34} className="object-contain" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-black text-emerald-900 tracking-tighter leading-none">AMAL</h1>
                <p className="text-[10px] font-bold text-emerald-600 tracking-tight mt-0.5 hidden sm:block">
                  Aplikasi Manajemen Keuangan Al Huda
                </p>
                <div className={cn(
                  "mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest w-fit border shadow-sm",
                  isAdmin ? "bg-emerald-600 text-white border-emerald-700" : "bg-amber-500 text-white border-amber-600"
                )}>
                  {isAdmin ? "Administrator" : "Bendahara"}
                </div>
              </div>
            </div>

            {/* RIGHT: Desktop Nav & Mobile Hamburger */}
            <div className="flex items-center gap-4">
              {/* Desktop Navigation */}
              <nav className="hidden lg:block">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-transparent h-auto p-0 flex gap-1 border-none">
                    {navigationMenu.map((item) => (
                      <TabsTrigger
                        key={item.id}
                        value={item.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all
                          data-[state=active]:bg-emerald-600 data-[state=active]:text-white 
                          text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 border-none shrink-0"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </nav>

              <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden lg:block"></div>

              {/* Logout Button (Hidden on very small mobile) */}
              <button 
                onClick={handleLogout} 
                className="hidden sm:flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-2 rounded-lg text-[11px] font-bold transition-all border border-red-100 shrink-0"
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>

              {/* Mobile Hamburger Menu */}
              <div className="lg:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="border-emerald-200 text-emerald-700">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                    <SheetHeader className="mb-6">
                      <SheetTitle className="text-left flex items-center gap-3">
                        <Image src="/logoo.png" alt="Logo" width={28} height={28} />
                        <span className="font-black text-emerald-900">MENU AMAL</span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-2">
                      {navigationMenu.map((item) => (
                        <Button
                          key={item.id}
                          variant={activeTab === item.id ? "default" : "ghost"}
                          className={cn(
                            "justify-start gap-3 h-12 font-bold",
                            activeTab === item.id ? "bg-emerald-600 text-white" : "text-slate-600"
                          )}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsSheetOpen(false);
                          }}
                        >
                          {item.icon}
                          {item.label}
                        </Button>
                      ))}
                      <hr className="my-4 border-slate-100" />
                      <Button 
                        variant="destructive" 
                        className="justify-start gap-3 h-12 font-bold"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} />
                        Keluar Aplikasi
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          
          <TabsContent value="dashboard" className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Santri Aktif" value={stats.totalSantri} icon={<Users size={18}/>} color="emerald" sub="Santri terdaftar" />
              <StatCard title="Pemasukan" value={`Rp ${stats.totalPemasukan.toLocaleString("id-ID")}`} icon={<TrendingUp size={18}/>} color="green" sub="Total saldo masuk" />
              <StatCard title="Pengeluaran" value={`Rp ${stats.totalPengeluaran.toLocaleString("id-ID")}`} icon={<TrendingDown size={18}/>} color="orange" sub="Total dana keluar" />
              <StatCard title="Tunggakan" value={`Rp ${stats.totalTunggakan.toLocaleString("id-ID")}`} icon={<Wallet size={18}/>} color="red" sub="Dana belum tertagih" />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-emerald-50 shadow-sm">
              <DashboardOverview stats={stats} />
            </div>
          </TabsContent>

          {!isAdmin && (
            <TabsContent value="log" className="m-0 animate-in fade-in duration-300">
              <div className="bg-white p-6 rounded-2xl border border-emerald-50 shadow-sm">
                <LogAktivitas key={activeTab === 'log' ? 'active' : 'inactive'} />
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <div className={cn(
               "bg-white p-6 rounded-2xl border border-emerald-50 shadow-sm animate-in fade-in duration-300",
               (activeTab === "dashboard") ? "hidden" : "block"
            )}>
                <TabsContent value="santri" className="m-0"><ManajemenSantri onUpdate={loadStats} /></TabsContent>
                <TabsContent value="pembayaran" className="m-0"><PembayaranSantri onUpdate={loadStats} /></TabsContent>
                <TabsContent value="tunggakan" className="m-0"><TunggakanSantri /></TabsContent>
                <TabsContent value="keuangan" className="m-0"><LaporanKeuangan onUpdate={loadStats} /></TabsContent>
                <TabsContent value="pengaturan" className="m-0"><PengaturanTarif onUpdate={loadStats} /></TabsContent>
                <TabsContent value="pemegang-dapur" className="m-0"><PemegangDapurComponent /></TabsContent>
            </div>
          )}
        </Tabs>
      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color, sub }: any) {
  const themes: any = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    green: "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    red: "bg-red-50 border-red-200 text-red-700",
  }
  return (
    <Card className={`border-none shadow-sm overflow-hidden hover:shadow-md transition-all border-b-4 ${themes[color].split(' ')[1]}`}>
      <CardHeader className={`pb-2 ${themes[color].split(' ')[0]}`}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</CardTitle>
          <div className="p-2 bg-white/60 rounded-lg shadow-sm text-gray-700">{icon}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 bg-white">
        <div className="text-xl font-black text-gray-800 tracking-tight">{value}</div>
        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{sub}</p>
      </CardContent>
    </Card>
  )
}