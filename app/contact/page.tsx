"use client"

import { Phone, Mail, MapPin } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Contact Us
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Get in touch with us - we're here to help
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <Phone className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Phone</h3>
            <a href="tel:+96179107042" className="text-blue-600 hover:underline">
              +961 79 107 042
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Email</h3>
            <a href="mailto:info@linktherapy.org" className="text-blue-600 hover:underline">
              info@linktherapy.org
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <MapPin className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Location</h3>
            <p className="text-gray-600">Available Nationwide</p>
          </div>
        </div>
      </div>
    </div>
  )
}

