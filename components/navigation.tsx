"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Heart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Enhanced Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Heart
                className={`h-8 w-8 transition-all duration-300 ${
                  isScrolled ? "text-[#176c9c]" : "text-white"
                } group-hover:scale-110`}
              />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-pink-400 animate-pulse" />
            </div>
            <span
              className={`text-xl font-bold transition-all duration-300 ${
                isScrolled ? "text-[#176c9c]" : "text-white"
              }`}
            >
              LinkTherapy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`font-medium transition-all duration-300 hover:scale-105 ${
                isScrolled ? "text-gray-700 hover:text-[#176c9c]" : "text-white/90 hover:text-white"
              }`}
            >
              Home
            </Link>
            <Link
              href="/blog"
              className={`font-medium transition-all duration-300 hover:scale-105 ${
                isScrolled ? "text-gray-700 hover:text-[#176c9c]" : "text-white/90 hover:text-white"
              }`}
            >
              Blog
            </Link>
            <Link
              href="/how-to-choose"
              className={`font-medium transition-all duration-300 hover:scale-105 ${
                isScrolled ? "text-gray-700 hover:text-[#176c9c]" : "text-white/90 hover:text-white"
              }`}
            >
              How to Choose
            </Link>
            <Link
              href="/for-therapists"
              className={`font-medium transition-all duration-300 hover:scale-105 ${
                isScrolled ? "text-gray-700 hover:text-[#176c9c]" : "text-white/90 hover:text-white"
              }`}
            >
              For Therapists
            </Link>
            <Button
              className={`transition-all duration-300 hover:scale-105 ${
                isScrolled ? "bg-[#176c9c] hover:bg-[#145a7d] text-white" : "bg-white text-[#176c9c] hover:bg-blue-50"
              }`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden transition-all duration-300 hover:scale-110 ${
              isScrolled ? "text-gray-700" : "text-white"
            }`}
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
                className="text-gray-700 hover:text-[#176c9c] transition-colors font-medium px-2 py-1 rounded hover:bg-[#176c9c]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/blog"
                className="text-gray-700 hover:text-[#176c9c] transition-colors font-medium px-2 py-1 rounded hover:bg-[#176c9c]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/how-to-choose"
                className="text-gray-700 hover:text-[#176c9c] transition-colors font-medium px-2 py-1 rounded hover:bg-[#176c9c]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                How to Choose
              </Link>
              <Link
                href="/for-therapists"
                className="text-gray-700 hover:text-[#176c9c] transition-colors font-medium px-2 py-1 rounded hover:bg-[#176c9c]/10"
                onClick={() => setIsMenuOpen(false)}
              >
                For Therapists
              </Link>
              <Button
                className="bg-[#176c9c] hover:bg-[#145a7d] text-white w-fit transition-all duration-300 hover:scale-105"
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
