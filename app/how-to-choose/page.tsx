import { CheckCircle, ArrowRight, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function HowToChoosePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#176c9c] to-[#8bb6ce] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How to Choose the Right Therapist</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            A comprehensive guide to finding the mental health professional that's perfect for you
          </p>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">
            {/* Step 1 */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">1. Identify Your Needs</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-700 mb-4">
                    Before searching for a therapist, take time to understand what you're looking for:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        What specific issues do you want to address? (anxiety, depression, relationships, trauma, etc.)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Do you prefer individual, couples, or family therapy?</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Are there any cultural or identity factors that are important to you?</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Step 2 */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">2. Consider Practical Factors</h2>
              <Card>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Location:</strong> How far are you willing to travel? Do you prefer in-person or online
                        sessions?
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Budget:</strong> What can you afford? Check if your insurance covers therapy.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Schedule:</strong> When are you available? Do you need evening or weekend appointments?
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Step 3 */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">3. Research Credentials and Specialties</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-700 mb-4">
                    Look for therapists with proper licensing and relevant experience:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Licensed Clinical Psychologist (PhD or PsyD)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Licensed Clinical Social Worker (LCSW)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Licensed Marriage and Family Therapist (LMFT)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Licensed Professional Counselor (LPC)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Step 4 */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">4. Trust Your Instincts</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-700 mb-4">The therapeutic relationship is crucial for success. Consider:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Do you feel comfortable and understood?</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Does the therapist's communication style work for you?</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Do you feel heard and validated?</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Are you making progress toward your goals?</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-[#176c9c] to-[#8bb6ce] rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Need Help Finding the Right Therapist?</h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Our team is here to help you navigate your options and find a therapist who's the perfect fit for your
                needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button size="lg" className="bg-white text-[#176c9c] hover:bg-gray-100">
                    Browse Therapists
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-[#176c9c] bg-transparent"
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
