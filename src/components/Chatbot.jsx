import { useState, useEffect, useRef } from 'react'

const API_BASE_URL = 'http://localhost:8000/api'

// Typewriter component for text animation
const TypewriterText = ({ text, speed = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)
      return () => clearTimeout(timeoutId)
    } else if (!isComplete) {
      setIsComplete(true)
      onComplete && onComplete()
    }
  }, [currentIndex, text, speed, onComplete, isComplete])

  return <span>{displayedText}</span>
}

const Chatbot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [languages, setLanguages] = useState([])
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [faqs, setFaqs] = useState([])
  const [showFAQs, setShowFAQs] = useState(false)
  const [chatVisible, setChatVisible] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState(null)
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const messagesEndRef = useRef(null)

  const languageNames = {
    en: 'English',
    bem: 'Bemba (Ichibemba)',
    loz: 'Lozi (Silozi)',
    nya: 'Nyanja (Chinyanja)'
  }

  const welcomeMessages = {
    en: [
      {
        greeting: "Hello! I'm ZAX, your AI assistant for the Zambia Revenue Authority (ZRA).",
        help: "I can help you with:",
        features: [
          "Tax registration and procedures",
          "VAT information and filing",
          "PAYE calculations and payments",
          "Customs and duties",
          "Tax compliance certificates",
          "General ZRA services"
        ],
        question: "What can I help you with today?",
        note: "Please do not share sensitive personal information such as NRCs or passwords."
      },
      {
        greeting: "Welcome to ZRA! I'm ZAX, here to assist you with all your tax-related questions.",
        help: "I'm here to help with:",
        features: [
          "Business tax registration",
          "VAT returns and compliance",
          "PAYE and employee taxes",
          "Import/export duties",
          "Tax payment methods",
          "ZRA online services"
        ],
        question: "How may I assist you today?",
        note: "For your security, please avoid sharing personal details like NRC numbers."
      },
      {
        greeting: "Good day! I'm ZAX, your dedicated ZRA tax assistant.",
        help: "I can provide guidance on:",
        features: [
          "Tax obligations and deadlines",
          "VAT registration requirements",
          "PAYE calculations",
          "Customs procedures",
          "Tax clearance certificates",
          "ZRA e-services"
        ],
        question: "What ZRA service can I help you with?",
        note: "Please keep your personal information secure - avoid sharing NRCs or passwords."
      }
    ],
    bem: [
      {
        greeting: "Mwashibukeni! Ndi ZAX, umutumishi wenu wa AI wa Zambia Revenue Authority (ZRA).",
        help: "Nkwangula:",
        features: [
          "Ukwishiba pa misolo ne milawo",
          "Amakani ya VAT ne ukutuma",
          "PAYE ne kulipila",
          "Customs ne duties",
          "Tax compliance certificates",
          "Ama service ya ZRA"
        ],
        question: "Nshani nkwanguleni lelo?",
        note: "Mutabaleke ukugabana amakani ya mwine nga NRC nangu ma password."
      },
      {
        greeting: "Muli bwanji! Ndi ZAX, ndi pano ukubafwafya pa ZRA ne misolo.",
        help: "Nkwangula pa:",
        features: [
          "Ukwishiba ama business pa misolo",
          "VAT returns ne compliance",
          "PAYE ne misolo ya basebeshi",
          "Import/export duties",
          "Injila sha kulipila misolo",
          "ZRA online services"
        ],
        question: "Nshita bwanji nkwanguleni lelo?",
        note: "Ku security yenu, mutabaleke ukugabana amakani nga NRC."
      }
    ],
    loz: [
      {
        greeting: "Dumelang! Ke ZAX, motlatsi wa lona wa AI wa Zambia Revenue Authority (ZRA).",
        help: "Nka le thusa ka:",
        features: [
          "Ho ingisa tax le ditsamaiso",
          "Tlhahisoleseding ya VAT le ho romela",
          "PAYE le ditefo",
          "Customs le duties",
          "Tax compliance certificates",
          "Ditshebeletso tsa ZRA"
        ],
        question: "Ke eng eo nka le thusang ka yona kajeno?",
        note: "Se ke wa arolelana tlhahisoleseding ya botho jwa hao e kang NRC kapa di-password."
      },
      {
        greeting: "Lumela! Ke ZAX, ke teng ho le thusa ka dipotso tsa tax tsa ZRA.",
        help: "Ke ka le thusa ka:",
        features: [
          "Ho ingisa dikgwebo tax-eng",
          "VAT returns le ho latela melao",
          "PAYE le tax ya basebetsi",
          "Dikgato tsa customs",
          "Mekgwa ya ho lefela tax",
          "Ditshebeletso tsa ZRA online"
        ],
        question: "Nka le thusa jwang kajeno?",
        note: "Bakeng sa tshireletso ya lona, se ke wa arolelana dintlha tsa botho."
      }
    ],
    nya: [
      {
        greeting: "Moni! Ndine ZAX, wothandizira wanu wa AI wa Zambia Revenue Authority (ZRA).",
        help: "Ndimatha kukuthandizani ndi:",
        features: [
          "Kulembetsa misonkho ndi njira",
          "Zambiri za VAT ndi kutumiza",
          "PAYE ndi malipiro",
          "Customs ndi duties",
          "Tax compliance certificates",
          "Ntchito za ZRA"
        ],
        question: "Kodi ndingakuthandizeni ndi chani lero?",
        note: "Musagawane zambiri za chinsinsi monga NRC kapena ma password."
      },
      {
        greeting: "Muli bwanji! Ndine ZAX, ndili pano kukuthandizani ndi mafunso onse a ZRA.",
        help: "Ndimatha kukuthandizani pa:",
        features: [
          "Kulembetsa mabizinesi pa misonkho",
          "VAT returns ndi kutsatira malamulo",
          "PAYE ndi misonkho ya antchito",
          "Njira za kulipira misonkho",
          "Ntchito za ZRA pa intaneti",
          "Ma certificate a misonkho"
        ],
        question: "Ndingakuthandizeni bwanji lero?",
        note: "Chifukwa cha chitetezo chanu, musagawane zambiri za chinsinsi."
      }
    ]
  }

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load languages and FAQs on component mount
  useEffect(() => {
    if (isOpen) {
      loadLanguages()
      loadFAQs()
      initializeChat()
    }
  }, [isOpen])

  const loadLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/faq/languages/`)
      if (response.ok) {
        const data = await response.json()
        setLanguages(data)
      }
    } catch (error) {
      console.error('Error loading languages:', error)
    }
  }

  const loadFAQs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/faq/faqs/popular/?language=${currentLanguage}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        setFaqs(data.popular_faqs || [])
      }
    } catch (error) {
      console.error('Error loading FAQs:', error)
    }
  }

  const initializeChat = () => {
    if (messages.length === 0) {
      const welcomeOptions = welcomeMessages[currentLanguage]
      const randomWelcome = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)]
      const welcomeMessage = {
        type: 'bot',
        content: randomWelcome.greeting,
        timestamp: new Date().toISOString(),
        isWelcome: true,
        welcomeData: randomWelcome
      }
      setMessages([welcomeMessage])
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: sessionId || 'anonymous'
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update session ID if new
        if (data.session_id && !sessionId) {
          setSessionId(data.session_id)
        }

        const botMessage = {
          type: 'bot',
          content: data.response,
          timestamp: new Date().toISOString(),
          isZRARelated: data.is_zra_related,
          needsSupport: data.needs_support,
          suggestedFAQs: data.suggested_faqs || [],
          id: Date.now() // Add unique ID for typewriter effect
        }

        setMessages(prev => [...prev, botMessage])
        setTypingMessageId(botMessage.id) // Set this message to use typewriter effect
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        type: 'bot',
        content: currentLanguage === 'en' 
          ? "I'm sorry, I'm experiencing technical difficulties. Please try again later."
          : "Nshilafwaya, nkwete amashuko ya tekiniko. Mwayeshe nangu.",
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const changeLanguage = async (newLanguage) => {
    if (newLanguage === currentLanguage) return

    setCurrentLanguage(newLanguage)
    setShowLanguageSelector(false)

    // Update session language if we have a session
    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/chat/language/${sessionId}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language: newLanguage
          })
        })
      } catch (error) {
        console.error('Error changing language:', error)
      }
    }

    // Add language change message
    const languageChangeMessage = {
      type: 'system',
      content: `Language changed to ${languageNames[newLanguage]}`,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, languageChangeMessage])

    // Load FAQs for new language
    loadFAQs()
  }

  const handleFAQClick = (faq) => {
    const question = currentLanguage === 'en' 
      ? faq.question_en 
      : faq.translations?.find(t => t.language_code === currentLanguage)?.question || faq.question_en

    setInputMessage(question)
    setShowFAQs(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Animation effects when opening
  useEffect(() => {
    if (isOpen) {
      // Reset welcome visibility first
      setWelcomeVisible(false)
      // Chatbot opens instantly
      setChatVisible(true)
      // Welcome text fades in immediately (3-second CSS transition)
      const welcomeTimer = setTimeout(() => {
        setWelcomeVisible(true)
      }, 50) // Small delay to allow the component to render
      return () => clearTimeout(welcomeTimer)
    } else {
      // Reset animations when closing
      setChatVisible(false)
      setWelcomeVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const welcome = welcomeMessages[currentLanguage]

  return (
    <div className="fixed chatbox-container z-50"
         style={{
           bottom: window.innerWidth <= 640 ? '0' : '4rem',
           right: window.innerWidth <= 351 ? '0' : window.innerWidth <= 640 ? '0' : '2rem',
           left: window.innerWidth <= 640 ? '0' : 'auto',
           width: window.innerWidth <= 640 ? '100vw' : window.innerWidth <= 768 ? '22rem' : '24rem',
           height: window.innerWidth <= 640 ? '100vh' : 'auto',
           maxHeight: window.innerWidth <= 640 ? '100vh' : '32rem'
         }}>
      <div className={`bg-white shadow-2xl border border-gray-200 flex flex-col ${
        window.innerWidth <= 640 ? 'h-full rounded-none' : 'rounded-lg max-h-[32rem]'
      }`}>
      {/* Header */}
      <div className="bg-[#1e40af] text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm sm:text-base">ZAX</span>
          <span className="text-xs opacity-75">AI Tax Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
              title="Change Language"
            >
              {currentLanguage.toUpperCase()}
            </button>
            {showLanguageSelector && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 min-w-32">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                      lang.code === currentLanguage ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {lang.native_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
                    
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="text-xl hover:text-amber-300 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* FAQ Panel */}
      {showFAQs && (
        <div className="bg-gray-50 border-b border-gray-200 p-3 max-h-32 overflow-y-auto">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Common Questions:</h4>
          <div className="space-y-1">
            {faqs.map((faq, index) => (
              <button
                key={index}
                onClick={() => handleFAQClick(faq)}
                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-white p-2 rounded transition-colors"
              >
                {currentLanguage === 'en' 
                  ? faq.question_en 
                  : faq.translations?.find(t => t.language_code === currentLanguage)?.question || faq.question_en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.type === 'user' 
                ? 'bg-[#1e40af] text-white' 
                : message.type === 'system'
                ? 'bg-yellow-100 text-yellow-800 text-center text-xs'
                : message.isError
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {message.isWelcome ? (
                <div className={`space-y-2 transition-opacity duration-3000 ${
                  welcomeVisible ? 'opacity-100' : 'opacity-0'
                }`}>
                  <p className="text-sm font-medium">{message.content}</p>
                  <p className="text-sm">{message.welcomeData?.help || "I can help you with:"}</p>
                  <ul className="text-xs space-y-1 ml-4">
                    {(message.welcomeData?.features || []).map((feature, idx) => (
                      <li key={idx}>• {feature}</li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium">{message.welcomeData?.question || "What can I help you with today?"}</p>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {message.type === 'bot' && typingMessageId === message.id ? (
                    <TypewriterText 
                      text={message.content} 
                      speed={25} 
                      onComplete={() => setTypingMessageId(null)}
                    />
                  ) : (
                    message.content
                  )}
                </p>
              )}
              
              {message.suggestedFAQs && message.suggestedFAQs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium mb-1">Related questions:</p>
                  {message.suggestedFAQs.slice(0, 2).map((faq, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleFAQClick(faq)}
                      className="block text-xs text-blue-600 hover:text-blue-800 mb-1"
                    >
                      • {currentLanguage === 'en' 
                          ? faq.question_en 
                          : faq.translations?.find(t => t.language_code === currentLanguage)?.question || faq.question_en}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-gray-50 rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none"
            placeholder={currentLanguage === 'en' ? "Type your question..." : "Lembani mupusho wenu..."}
            rows="1"
            disabled={isLoading}
          />
          <button 
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-[#1e40af] hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {isLoading ? '...' : (currentLanguage === 'en' ? 'Send' : 'Tuma')}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {welcome.note}
        </p>
      </div>
      </div>
    </div>
  )
}

export default Chatbot