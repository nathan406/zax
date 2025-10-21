import { useState } from 'react'
import Chatbot from './components/Chatbot'

function App() {
  const [showChat, setShowChat] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const services = [
    'Register for a TPIN',
    'File Returns',
    'Pay Taxes Online',
    'Apply for Tax Compliance Certificate',
    'Import a vehicle',
    'Smart Invoice Registration',
    'Customs Clearance',
    'Motor Vehicle Tax Calculator'
  ]

  const newsItems = [
    {
      title: "ZRA TO PARTICIPATE IN LUSAKA'S AGRICULTURAL & COMMERCIAL SHOW",
      author: "Kumbwani Mambo",
      date: "September 26, 2025",
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: '"EVERYONE MUST PAY TAXES" – Dr Musokotwane',
      author: "Kumbwani Mambo", 
      date: "September 25, 2025",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "ZRA SEIZES 300 CASES OF SMUGGLED KONYAGI BEER",
      author: "Kumbwani Mambo",
      date: "September 24, 2025", 
      image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "ZRA SEIZES TWO TRUCKS WITH SMUGGLED PREFORMS",
      author: "Kumbwani Mambo",
      date: "September 22, 2025",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "ZRA DATES MAJORETTES FOR TAX EDUCATION",
      author: "Kumbwani Mambo",
      date: "September 22, 2025",
      image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "TECHNOLOGY MINISTER APPLAUDS ZRA FOR DIGITAL TRANSFORMATION",
      author: "Kumbwani Mambo",
      date: "September 19, 2025",
      image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=600&q=80"
    }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans overflow-x-hidden">
      {/* Top navigation bar */}
      <div className="bg-[#1e40af] text-white text-xs py-2 px-2 sm:px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <div className="flex gap-3 sm:gap-6 text-xs">
            <span className="hover:underline cursor-pointer">Motor Vehicle Search</span>
            <span className="hover:underline cursor-pointer">LOGIN</span>
          </div>
          <div className="hidden sm:flex gap-3 lg:gap-6 text-xs">
            <span className="hover:underline cursor-pointer">About Us</span>
            <span className="hover:underline cursor-pointer">Tax Payer Charter</span>
            <span className="hover:underline cursor-pointer">Tenders</span>
            <span className="hover:underline cursor-pointer">Vacancies</span>
            <span className="hover:underline cursor-pointer">Careers</span>
            <span className="hover:underline cursor-pointer">Tutorials</span>
            <span className="hover:underline cursor-pointer">Contact Us</span>
          </div>
        </div>
      </div>

      {/* Header with logo */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo section */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1e40af] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm sm:text-xl">ZRA</span>
              </div>
              <div className="text-left">
                <h1 className="text-sm sm:text-xl lg:text-2xl font-bold text-[#1e40af] tracking-wide leading-tight">
                  ZAMBIA REVENUE AUTHORITY
                </h1>
                <p className="text-xs sm:text-sm text-amber-600 font-semibold italic">
                  My Tax Your Tax Our Destiny
                </p>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden flex flex-col gap-1 p-2"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle menu"
            >
              <span className={`w-6 h-0.5 bg-[#1e40af] transition-all ${showMobileMenu ? 'rotate-45 translate-y-1.5' : ''}`}></span>
              <span className={`w-6 h-0.5 bg-[#1e40af] transition-all ${showMobileMenu ? 'opacity-0' : ''}`}></span>
              <span className={`w-6 h-0.5 bg-[#1e40af] transition-all ${showMobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden lg:block bg-[#1e40af] text-white">
          <div className="max-w-7xl mx-auto">
            <ul className="flex justify-center gap-1 py-3 text-sm font-medium">
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">HOME</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">REGISTRATIONS</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">BUSINESS</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">CUSTOMS</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">PUBLICATIONS</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">STATISTICS</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">TAX PORTAL</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">TAX TOOLS</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">SMART INVOICE</li>
              <li className="px-3 py-2 hover:bg-blue-700 cursor-pointer transition-colors">TAXPAYER RELATIONS</li>
            </ul>
          </div>
        </nav>

        {/* Mobile navigation */}
        {showMobileMenu && (
          <nav className="lg:hidden bg-[#1e40af] text-white">
            <div className="px-4 py-2">
              <ul className="space-y-2 text-sm font-medium">
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">HOME</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">REGISTRATIONS</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">BUSINESS</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">CUSTOMS</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">PUBLICATIONS</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">STATISTICS</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">TAX PORTAL</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">TAX TOOLS</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">SMART INVOICE</li>
                <li className="py-2 hover:bg-blue-700 cursor-pointer transition-colors rounded px-2">TAXPAYER RELATIONS</li>
              </ul>
            </div>
          </nav>
        )}
      </header>

      {/* Hero section with service selector */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-8 sm:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 text-center sm:text-left">
                Get started with
              </h2>
              <div className="flex flex-col sm:flex-row items-stretch gap-4">
                <select 
                  className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <option value="">Select Service...</option>
                  {services.map((service, index) => (
                    <option key={index} value={service}>{service}</option>
                  ))}
                </select>
                <button 
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedService}
                >
                  Click here
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exchange rates and announcement bar */}
      <div className="bg-[#1e40af] text-white">
        <div className="max-w-7xl mx-auto flex flex-col">
          <div className="px-4 sm:px-6 py-3 border-b border-blue-600 sm:border-b-0 sm:border-r">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-medium text-sm">Foreign Exchange Rates</span>
              <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">?</span>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-3 text-center">
            <div className="animate-pulse">
              <span className="font-semibold text-xs sm:text-sm">
                📢 The clock is ticking – Smart Invoice Grace Period ends on 30th September 2025 for all VAT Registered Taxpayers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Latest News Section */}
      <main className="flex-1 py-8 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Latest News</h2>
            <p className="text-base sm:text-lg text-gray-600">Latest events and announcements from the ZRA</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {newsItems.map((item, index) => (
              <article key={index} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-48 bg-gray-200">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#1e40af] text-white px-3 py-1 rounded-full text-xs font-semibold">ZRA News</span>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 leading-tight hover:text-blue-600 cursor-pointer transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 gap-2">
                    <span>👤 {item.author}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <button className="bg-[#1e40af] hover:bg-blue-700 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold transition-colors">
              View All News
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1e40af] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-bold mb-4">CONTACT US</h3>
              <div className="h-px bg-white mb-4"></div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">📍</span>
                  <span>Plot No 1704 Kalambo Road / Villa Elizabetha, Lusaka</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">📞</span>
                  <span>4111</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">✉️</span>
                  <span className="break-all">advice@zra.org.zm</span>
                </div>
              </div>
            </div>

            {/* Other Links */}
            <div>
              <h3 className="text-lg font-bold mb-4">OTHER LINKS</h3>
              <div className="h-px bg-white mb-4"></div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-amber-300 transition-colors">Buy Insurance</a></li>
                <li><a href="#" className="hover:text-amber-300 transition-colors">National Pension Scheme Authority</a></li>
                <li><a href="#" className="hover:text-amber-300 transition-colors">Bank of Zambia (BOZ)</a></li>
                <li><a href="#" className="hover:text-amber-300 transition-colors">Patent and Company Registration Agency</a></li>
                <li><a href="#" className="hover:text-amber-300 transition-colors">Ministry of Finance</a></li>
                <li><a href="#" className="hover:text-amber-300 transition-colors">Ministry of Commerce Trade and Industry</a></li>
                <li><a href="#" className="hover:text-amber-300 transition-colors">Zambia Trade Portal</a></li>
                <li><a href="#" className="hover:text-amber-300 transition-colors">Zambia Development Agency</a></li>
              </ul>
            </div>

            {/* Social Media */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg font-bold mb-4">SOCIAL MEDIA</h3>
              <div className="h-px bg-white mb-4"></div>
              <div className="flex flex-wrap gap-4">
                {/* Facebook */}
                <a 
                  href="https://www.facebook.com/ZambiaRevenueAuthority" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors duration-300 flex items-center justify-center w-12 h-12"
                  aria-label="Follow us on Facebook"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>

                {/* Twitter/X */}
                <a 
                  href="https://twitter.com/ZamRevenue" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-black hover:bg-gray-800 text-white p-3 rounded-full transition-colors duration-300 flex items-center justify-center w-12 h-12"
                  aria-label="Follow us on X (Twitter)"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>

                {/* LinkedIn */}
                <a 
                  href="https://www.linkedin.com/company/zambia-revenue-authority" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-700 hover:bg-blue-800 text-white p-3 rounded-full transition-colors duration-300 flex items-center justify-center w-12 h-12"
                  aria-label="Follow us on LinkedIn"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>

                {/* YouTube */}
                <a 
                  href="https://www.youtube.com/@zambiarevenue" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-colors duration-300 flex items-center justify-center w-12 h-12"
                  aria-label="Subscribe to our YouTube channel"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>

                {/* WhatsApp */}
                <a 
                  href="https://wa.me/260211374000" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors duration-300 flex items-center justify-center w-12 h-12"
                  aria-label="Contact us on WhatsApp"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"/>
                  </svg>
                </a>

                {/* Instagram */}
                <a 
                  href="https://www.instagram.com/zambiarevenue" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-3 rounded-full transition-colors duration-300 flex items-center justify-center w-12 h-12"
                  aria-label="Follow us on Instagram"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-blue-600 mt-8 pt-8 text-center text-sm">
            <p>© 2025 Zambia Revenue Authority. All rights reserved</p>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot Button */}
      <button
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-[#1e40af] hover:bg-blue-700 text-white rounded-full shadow-lg w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl z-50 transition-all duration-300 border-4 border-white"
        onClick={() => setShowChat(!showChat)}
        aria-label="Open chatbot"
      >
        🤖
      </button>

      {/* Enhanced Chatbot Interface */}
      <Chatbot isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  )
}

export default App