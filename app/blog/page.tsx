"use client"

import { useState, useEffect } from "react"
import { Calendar, User, ArrowRight, Clock, Heart, Bookmark, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const blogPosts = [
  {
    id: 1,
    title: "Understanding Anxiety: Signs, Symptoms, and When to Seek Help",
    excerpt:
      "Learn to recognize the signs of anxiety and understand when it's time to reach out for professional support.",
    author: "Dr. Sarah Johnson",
    date: "2024-01-15",
    category: "Mental Health",
    image: "/placeholder.svg?height=300&width=500",
    readTime: "5 min read",
    featured: true,
  },
  {
    id: 2,
    title: "The Benefits of Couples Therapy: Strengthening Your Relationship",
    excerpt: "Discover how couples therapy can help improve communication and strengthen your relationship bond.",
    author: "Dr. Michael Chen",
    date: "2024-01-12",
    category: "Relationships",
    image: "/placeholder.svg?height=300&width=500",
    readTime: "7 min read",
    featured: false,
  },
  {
    id: 3,
    title: "Trauma Recovery: Understanding PTSD and Healing Pathways",
    excerpt: "A comprehensive guide to understanding trauma, PTSD symptoms, and effective treatment approaches.",
    author: "Dr. Emily Rodriguez",
    date: "2024-01-10",
    category: "Trauma",
    image: "/placeholder.svg?height=300&width=500",
    readTime: "8 min read",
    featured: true,
  },
  {
    id: 4,
    title: "Breaking Free from Addiction: Your Journey to Recovery",
    excerpt:
      "Understanding addiction as a disease and exploring evidence-based treatment options for lasting recovery.",
    author: "Dr. James Wilson",
    date: "2024-01-08",
    category: "Addiction",
    image: "/placeholder.svg?height=300&width=500",
    readTime: "6 min read",
    featured: false,
  },
  {
    id: 5,
    title: "Mindfulness and Mental Health: Daily Practices for Wellbeing",
    excerpt: "Explore simple mindfulness techniques that can significantly improve your mental health and daily life.",
    author: "Dr. Sarah Johnson",
    date: "2024-01-05",
    category: "Wellness",
    image: "/placeholder.svg?height=300&width=500",
    readTime: "4 min read",
    featured: false,
  },
  {
    id: 6,
    title: "Supporting a Loved One Through Depression",
    excerpt: "Learn how to provide meaningful support to family members or friends experiencing depression.",
    author: "Dr. Emily Rodriguez",
    date: "2024-01-03",
    category: "Support",
    image: "/placeholder.svg?height=300&width=500",
    readTime: "6 min read",
    featured: false,
  },
]

export default function BlogPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const featuredPosts = blogPosts.filter((post) => post.featured)
  const regularPosts = blogPosts.filter((post) => !post.featured)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20">
      {/* Enhanced Hero Section */}
      <section className="relative bg-gradient-to-br from-[#056DBA] via-[#2F86D2] to-[#8EC5FF] text-white py-20 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div
            className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-float"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="absolute top-32 right-20 w-16 h-16 bg-white/10 rounded-full animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-float"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className={`transition-all duration-1000 ${isVisible ? "animate-slide-up" : "opacity-0"}`}>
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
              <Heart className="h-5 w-5 text-pink-300" />
              <span className="font-medium">Mental Health Resources</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent animate-gradient">
              Insights & Guidance
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Expert insights, tips, and guidance on mental health, therapy, and wellness from our qualified
              professionals
            </p>
          </div>
        </div>
      </section>

      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div
              className={`text-center mb-12 transition-all duration-1000 delay-200 ${isVisible ? "animate-slide-up" : "opacity-0"}`}
            >
              <div className="inline-flex items-center gap-2 bg-[#056DBA]/10 px-4 py-2 rounded-full mb-4">
                <Bookmark className="h-5 w-5 text-[#056DBA]" />
                <span className="text-[#056DBA] font-medium">Featured Articles</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Must-Read <span className="text-[#056DBA]">Articles</span>
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2 mb-16">
              {featuredPosts.map((post, index) => (
                <Card
                  key={post.id}
                  className={`group hover-lift border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden ${isVisible ? "animate-slide-up" : "opacity-0"}`}
                  style={{ animationDelay: `${(index + 3) * 0.2}s` }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#056DBA]" />
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image || "/placeholder.svg"}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-yellow-500 text-white font-semibold">⭐ Featured</Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-3">
                      <Badge
                        variant="secondary"
                        className="bg-[#056DBA]/10 text-[#056DBA] hover:bg-[#056DBA]/20 transition-colors"
                      >
                        {post.category}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {post.readTime}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold line-clamp-2 mb-3 group-hover:text-[#056DBA] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-3 leading-relaxed">{post.excerpt}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        {post.author}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/blog/${post.id}`} className="flex-1">
                        <Button className="w-full bg-[#056DBA] hover:bg-[#045A99] text-white font-semibold transition-all duration-300 hover:scale-105">
                          Read Article
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-[#056DBA]/30 text-[#056DBA] hover:bg-[#056DBA]/10 transition-all duration-300 bg-transparent"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Regular Posts Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50/50 to-white">
        <div className="container mx-auto px-4">
          <div
            className={`text-center mb-12 transition-all duration-1000 delay-400 ${isVisible ? "animate-slide-up" : "opacity-0"}`}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Latest <span className="text-[#056DBA]">Articles</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Stay updated with the latest insights and tips from our mental health experts
            </p>
          </div>

          <div className={`grid gap-8 md:grid-cols-2 lg:grid-cols-3 stagger-animation ${isVisible ? "" : "opacity-0"}`}>
            {regularPosts.map((post, index) => (
              <Card
                key={post.id}
                className="group hover-lift border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-gray-50/50 overflow-hidden"
                style={{ animationDelay: `${(index + 6) * 0.1}s` }}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant="secondary"
                      className="bg-[#056DBA]/10 text-[#056DBA] hover:bg-[#056DBA]/20 transition-colors"
                    >
                      {post.category}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {post.readTime}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold line-clamp-2 mb-3 group-hover:text-[#056DBA] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(post.date).toLocaleDateString()}
                    </div>
                  </div>
                  <Link href={`/blog/${post.id}`}>
                    <Button
                      variant="outline"
                      className="w-full group border-[#056DBA]/30 text-[#056DBA] hover:bg-[#056DBA] hover:text-white transition-all duration-300 bg-transparent"
                    >
                      Read More
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
