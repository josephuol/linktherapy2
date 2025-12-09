import { Users, TrendingUp, Shield, Clock, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function ForTherapistsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#056DBA] to-[#2F86D2] text-white py-16 mt-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Join LinkTherapy</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Connect with clients who need your expertise. Grow your practice with our platform.
          </p>
          <Button size="lg" className="bg-white text-[#056DBA] hover:bg-gray-100">
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Partner with LinkTherapy?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join our network of qualified mental health professionals and expand your reach
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-[#056DBA] mx-auto mb-4" />
                <CardTitle>More Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Connect with clients actively seeking therapy services in your area</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-[#056DBA] mx-auto mb-4" />
                <CardTitle>Grow Your Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Expand your client base and increase your practice revenue</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-[#056DBA] mx-auto mb-4" />
                <CardTitle>Verified Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Join a trusted platform that verifies credentials and maintains quality</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Clock className="h-12 w-12 text-[#056DBA] mx-auto mb-4" />
                <CardTitle>Flexible Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Maintain control over your schedule and availability</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Join Our Network?</h2>
            <p className="text-gray-600">Have questions? We&apos;re here to help!</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-6">
                <p className="text-gray-700 text-lg">Have questions? We&apos;re here to help!</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="tel:+96179107042" className="group">
                    <Button size="lg" className="bg-[#056DBA] hover:bg-[#045A99] inline-flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Call +961 79 107 042
                    </Button>
                  </a>
                  <a
                    href="https://wa.me/96179107042"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white inline-flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5 mr-2" fill="currentColor"><path d="M19.11 17.2c-.3-.15-1.77-.87-2.04-.97-.27-.1-.46-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.28-.47-2.44-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.6.13-.13.3-.34.45-.5.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.9-2.2-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.52.07-.8.37s-1.04 1.02-1.04 2.48 1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.5 1.7.64.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" /><path d="M26.02 5.98C23.24 3.2 19.73 1.73 16 1.73 8.56 1.73 2.73 7.56 2.73 15c0 2.33.61 4.6 1.78 6.6L2 30l8.58-2.43c1.93 1.05 4.12 1.6 6.42 1.6 7.44 0 13.27-5.83 13.27-13.27 0-3.54-1.38-6.87-3.98-9.36zM16 27.56c-2.1 0-4.1-.55-5.88-1.6l-.42-.25-5.09 1.44 1.46-4.96-.27-.45C4.63 20 4.1 17.54 4.1 15c0-6.56 5.34-11.9 11.9-11.9 3.18 0 6.17 1.24 8.42 3.5 2.25 2.24 3.48 5.24 3.47 8.42 0 6.56-5.34 11.9-11.9 11.9z" /></svg>
                      WhatsApp Us
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
