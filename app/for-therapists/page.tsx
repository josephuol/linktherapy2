import { Users, TrendingUp, Shield, Clock, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function ForTherapistsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#056DBA] to-[#2F86D2] text-white py-16">
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

      {/* Contact Form */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Join Our Network?</h2>
            <p className="text-gray-600">Fill out the form below and we'll get back to you within 24 hours</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">First Name *</label>
                    <Input placeholder="Enter your first name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Last Name *</label>
                    <Input placeholder="Enter your last name" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Email Address *</label>
                  <Input type="email" placeholder="Enter your email address" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Phone Number *</label>
                  <Input type="tel" placeholder="Enter your phone number" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">License Type & Number *</label>
                  <Input placeholder="e.g., Licensed Clinical Psychologist - PSY12345" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Specialties *</label>
                  <Input placeholder="e.g., Anxiety, Depression, Couples Therapy" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Years of Experience *</label>
                  <Input type="number" placeholder="Enter years of experience" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Location/Service Area *</label>
                  <Input placeholder="Enter your practice location" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Additional Information</label>
                  <Textarea
                    placeholder="Tell us more about your practice, approach, or any questions you have..."
                    rows={4}
                  />
                </div>

                <Button className="w-full bg-[#056DBA] hover:bg-[#045A99]" size="lg">
                  Submit Application
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">Have questions? We're here to help!</p>
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                therapists@linktherapy.com
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                (555) 123-4567
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
