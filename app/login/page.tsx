"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabaseBrowser } from "@/lib/supabase-browser"
import InputField from "@/components/ui/input-field"
import Label from "@/components/ui/label"
import Button from "@/components/ui/button-admin"
import Checkbox from "@/components/ui/checkbox"
import { ChevronLeftIcon, EyeIcon, EyeCloseIcon } from "@/components/icons"
import GridShape from "@/components/ui/grid-shape"
import Image from "next/image"
import logoOg from "@/app/images/logo-og.png"


export default function LoginPage() {
  const supabase = supabaseBrowser()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isChecked, setIsChecked] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.replace("/dashboard")
  }

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0 mt-16">
      <div className="relative flex lg:flex-row w-full h-[calc(100vh-64px)] justify-center flex-col dark:bg-gray-900 sm:p-0">
        {/* Left side - Login Form */}
        <div className="flex flex-col flex-1 lg:w-1/2 w-full">

          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                  Therapist Login
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your email and password to sign in!
                </p>
              </div>
              <div>
                <form onSubmit={onSubmit}>
                  <div className="space-y-6">
                    <div>
                      <Label>
                        Email <span className="text-error-500">*</span>
                      </Label>
                      <InputField 
                        placeholder="info@gmail.com" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!error}
                      />
                    </div>
                    <div>
                      <Label>
                        Password <span className="text-error-500">*</span>
                      </Label>
                      <div className="relative">
                        <InputField
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          error={!!error}
                        />
                        <span
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                        >
                          {showPassword ? (
                            <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                          ) : (
                            <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                          )}
                        </span>
                      </div>
                    </div>
                    {error && (
                      <p className="text-sm text-error-500">{error}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isChecked} onChange={setIsChecked} />
                        <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                          Keep me logged in
                        </span>
                      </div>
                      <Link
                        href="/reset-password"
                        className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div>
                      <Button 
                        className="w-full" 
                        size="sm"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? "Signing in..." : "Sign in"}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Branding */}
        <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
          <div className="relative items-center justify-center flex z-1">
            <GridShape />
            <div className="flex flex-col items-center max-w-xs">
                             <Link href="/" className="block mb-4">
                 <div>
                   <Image 
                     src={logoOg} 
                     alt="LinkTherapy Logo" 
                     className="h-50 w-auto"
                     priority
                   />
                 </div>
               </Link>
              <p className="text-center text-gray-400 dark:text-white/60">
                Professional therapy platform connecting therapists with clients
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


