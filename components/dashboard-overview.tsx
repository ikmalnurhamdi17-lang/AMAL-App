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
}

export default function DashboardOverview({ stats }: DashboardOverviewProps) {
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
          <CardTitle className="text-emerald-900">Ringkasan Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number | string) => `Rp ${Number(value).toLocaleString("id-ID")}`} />
              <Legend />
              <Bar dataKey="Pemasukan" fill="#10b981" />
              <Bar dataKey="Pengeluaran" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-emerald-900">Informasi Keuangan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
            <span className="text-green-700 font-medium">Total Pemasukan</span>
            <span className="text-green-900 font-bold text-xl">Rp {stats.totalPemasukan.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
            <span className="text-orange-700 font-medium">Total Pengeluaran</span>
            <span className="text-orange-900 font-bold text-xl">
              Rp {stats.totalPengeluaran.toLocaleString("id-ID")}
            </span>
          </div>
          <div
            className={`flex justify-between items-center p-4 rounded-lg ${saldo >= 0 ? "bg-emerald-50" : "bg-red-50"}`}
          >
            <span className={`font-medium ${saldo >= 0 ? "text-emerald-700" : "text-red-700"}`}>Saldo</span>
            <span className={`font-bold text-xl ${saldo >= 0 ? "text-emerald-900" : "text-red-900"}`}>
              Rp {saldo.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
            <span className="text-red-700 font-medium">Total Tunggakan</span>
            <span className="text-red-900 font-bold text-xl">Rp {stats.totalTunggakan.toLocaleString("id-ID")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
