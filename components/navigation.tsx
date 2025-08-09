"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import logoHorizontal from "@/app/images/logo-horizontal.png"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Determine background and text colors based on page and scroll state
  const getNavStyles = () => {
    if (isHomePage) {
      // Homepage: subtle gradient when not scrolled, white when scrolled
      return {
        background: isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50" : "bg-gradient-to-b from-white/50 to-transparent backdrop-blur-sm",
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
                src={logoHorizontal}
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
              href="/blog"
              className={`font-medium transition-all duration-300 hover:scale-105 ${styles.textColor} hover:text-[#056DBA]`}
            >
              Blog
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
            <Button
              className={`transition-all duration-300 hover:scale-105 ${styles.buttonStyle}`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Started
            </Button>
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
                href="/blog"
                className="text-gray-700 hover:text-[#056DBA] transition-colors font-medium px-2 py-1 rounded hover:bg-[#056DBA]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
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
              <Button
                className="bg-[#056DBA] hover:bg-[#045A99] text-white w-fit transition-all duration-300 hover:scale-105"
                onClick={() => setIsMenuOpen(false)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
