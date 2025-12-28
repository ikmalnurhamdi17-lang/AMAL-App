"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase" // Jalur yang sudah disesuaikan dengan folder 'lib' Anda

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const supabase = getSupabase()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (supabaseError) {
        // Pesan error jika autentikasi gagal
        setError("Email atau password salah. Silakan periksa kembali akun Anda.")
        setIsLoading(false)
      } else {
        // Jika berhasil, arahkan ke dashboard
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi. Silakan coba lagi nanti.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 via-emerald-100 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md transition-all">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Image src="/Amal.png" alt="Logo" width={220} height={220} className="mb-4" />
          <h1 className="text-3xl font-bold text-emerald-900 tracking-tight">LOGIN AMAL</h1>
        </div>

        {/* Pesan Error Modern */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500 shrink-0">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.401 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 font-medium leading-tight">{error}</p>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Masukkan email"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-emerald-400'
              }`}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan password"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-emerald-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-2 rounded-lg shadow-lg transition active:scale-[0.98] flex justify-center items-center h-10"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-6 text-center italic">
          © 2025 Pondok Pesantren Al Huda Turalak
        </p>
      </div>
    </div>
  )
}