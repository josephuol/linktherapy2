import { CheckCircle, ArrowRight, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function HowToChoosePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#056DBA] to-[#2F86D2] text-white py-16 mt-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How to Choose the Right Therapist</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            A comprehensive guide to finding the mental health professional that&apos;s perfect for you
          </p>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">
            {/* Step 1 */}
            <div>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-6">
                    Finding the right therapist is a personal journey. It&apos;s not just about qualifications – it&apos;s about finding someone you feel comfortable with, who understands your specific needs, and whose approach resonates with you.
                  </p>

                </CardContent>
              </Card>
            </div>

            {/* CTA Section */}
            <div className="bg-[#056DBA] rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Need Help Finding the Right Therapist?</h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Our team is here to help you navigate your options and find a therapist who&apos;s the perfect fit for your
                needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button size="lg" className="bg-white text-[#056DBA] hover:bg-gray-100">
                    Browse Therapists
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#056DBA] bg-transparent"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
