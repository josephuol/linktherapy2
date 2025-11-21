"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Sparkles, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import logoHorizontal from "@/app/images/logo-horizontal.png"
import logoHorizontalWhite from "@/app/images/logo-horizontal-white.png"
import { supabaseBrowser } from "@/lib/supabase-browser"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Check authentication state
  useEffect(() => {
    const supabase = supabaseBrowser()

    // Check initial auth state
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)
      } catch (error) {
        console.error("Error checking auth:", error)
        setIsAuthenticated(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Determine background and text colors based on page and scroll state
  const getNavStyles = () => {
    if (isHomePage) {
      // Homepage: transparent when not scrolled, white when scrolled
      return {
        background: isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50" : "bg-transparent",
        textColor: isScrolled ? "text-gray-700" : "text-white/90",
        logoColor: isScrolled ? "text-[#056DBA]" : "text-white",
        buttonStyle: isScrolled ? "bg-[#056DBA] hover:bg-[#045A99] text-white" : "bg-white text-[#056DBA] hover:bg-blue-50"
      }
    } else {
      // Other pages: always white background
      return {
        background: "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50",
        textColor: "text-gray-700",
        logoColor: "text-[#056DBA]",
        buttonStyle: "bg-[#056DBA] hover:bg-[#045A99] text-white"
      }
    }
  }

  const styles = getNavStyles()
  const logoSrc = isHomePage && !isScrolled ? logoHorizontalWhite : logoHorizontal

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${styles.background}`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Enhanced Logo */}
          <Link href="/" className="flex items-center group">
            <div className="relative">
              <Image
                src={logoSrc}
                alt="LinkTherapy"
                className="h-8 w-auto transition-all duration-300 group-hover:scale-110"
                priority
              />
              
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`font-medium transition-all duration-300 hover:scale-105 ${styles.textColor} hover:text-[#056DBA]`}
            >
              Home
            </Link>
            <Link
              href="/how-to-choose"
              className={`font-medium transition-all duration-300 hover:scale-105 ${styles.textColor} hover:text-[#056DBA]`}
            >
              How to Choose
            </Link>
            <Link
              href="/for-therapists"
              className={`font-medium transition-all duration-300 hover:scale-105 ${styles.textColor} hover:text-[#056DBA]`}
            >
              For Therapists
            </Link>
            <Link
              href="/faq"
              className={`font-medium transition-all duration-300 hover:scale-105 ${styles.textColor} hover:text-[#056DBA]`}
            >
              FAQ
            </Link>
            <Link href="/dashboard">
              <Button
                className={`transition-all duration-300 hover:scale-105 ${styles.buttonStyle}`}
              >
                {isAuthenticated ? (
                  <>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Login
                  </>
                )}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden transition-all duration-300 hover:scale-110 ${styles.textColor}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200/20 bg-white/95 backdrop-blur-md rounded-b-lg mt-2 animate-slide-up">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-[#056DBA] transition-colors font-medium px-2 py-1 rounded hover:bg-[#056DBA]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/how-to-choose"
                className="text-gray-700 hover:text-[#056DBA] transition-colors font-medium px-2 py-1 rounded hover:bg-[#056DBA]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                How to Choose
              </Link>
              <Link
                href="/for-therapists"
                className="text-gray-700 hover:text-[#056DBA] transition-colors font-medium px-2 py-1 rounded hover:bg-[#056DBA]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                For Therapists
              </Link>
              <Link
                href="/faq"
                className="text-gray-700 hover:text-[#056DBA] transition-colors font-medium px-2 py-1 rounded hover:bg-[#056DBA]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                <Button
                  className="bg-[#056DBA] hover:bg-[#045A99] text-white w-fit transition-all duration-300 hover:scale-105"
                >
                  {isAuthenticated ? (
                    <>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
