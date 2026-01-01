"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DashboardOverviewProps {
  stats: {
    totalSantri: number
    totalPemasukan: number
    totalPengeluaran: number
    totalTunggakan: number
  }
  isAdmin: boolean // Tambahkan prop ini
}

export default function DashboardOverview({ stats, isAdmin }: DashboardOverviewProps) {
  const data = [
    {
      name: "Keuangan",
      Pemasukan: stats.totalPemasukan,
      Pengeluaran: stats.totalPengeluaran,
    },
  ]

  const saldo = stats.totalPemasukan - stats.totalPengeluaran

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900">Ringkasan Grafik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                {/* @ts-ignore */}
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  formatter={(value: any) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`} 
                />
                <Legend />
                <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900">Rincian Angka</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-100">
            <span className="text-green-700 font-bold text-xs uppercase tracking-wider">Total Pemasukan</span>
            <span className="text-green-900 font-black text-lg">Rp {stats.totalPemasukan.toLocaleString("id-ID")}</span>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg border border-orange-100">
            <span className="text-orange-700 font-bold text-xs uppercase tracking-wider">Total Pengeluaran</span>
            <span className="text-orange-900 font-black text-lg">
              Rp {stats.totalPengeluaran.toLocaleString("id-ID")}
            </span>
          </div>
          
          <div
            className={`flex justify-between items-center p-4 rounded-lg border ${
              saldo >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
            }`}
          >
            <span className={`font-bold text-xs uppercase tracking-wider ${saldo >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              Saldo Efektif
            </span>
            <span className={`font-black text-lg ${saldo >= 0 ? "text-emerald-900" : "text-red-900"}`}>
              Rp {saldo.toLocaleString("id-ID")}
            </span>
          </div>

          {/* LOGIKA SEMBUNYIKAN TUNGGAKAN UNTUK BENDAHARA */}
          {isAdmin && (
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-100 animate-in fade-in duration-500">
              <span className="text-red-700 font-bold text-xs uppercase tracking-wider">Total Piutang (Tunggakan)</span>
              <span className="text-red-900 font-black text-lg">Rp {stats.totalTunggakan.toLocaleString("id-ID")}</span>
            </div>
          )}
          
          {!isAdmin && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-[10px] text-blue-700 font-medium italic text-center">
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}