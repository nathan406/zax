import { useState, useEffect, useRef } from 'react'
import { API_ENDPOINTS } from '../config/api.js'

// API Configuration - automatically switches between development and production
const isDevelopment = import.meta.env.MODE === 'development'
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api'  // Development (local)
  : import.meta.env.VITE_API_URL || 'https://zaxbackend.onrender.com/api'  // Production (deployed)

console.log('🔗 Chatbot API Configuration:', {
  mode: import.meta.env.MODE,
  isDevelopment,
  apiUrl: API_BASE_URL,
  timestamp: new Date().toISOString()
})

// Local storage constants
const CHAT_HISTORY_KEY = 'zax-chat-history';
const MAX_CHAT_SESSIONS = 50; // Limit number of stored chat sessions

// Utility functions for chat history
const getChatHistory = () => {
  try {
    const history = localStorage.getItem(CHAT_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading chat history from localStorage:', error);
    return [];
  }
};

const saveChatHistory = (history) => {
  try {
    // Limit number of stored sessions to prevent storage overflow
    const limitedHistory = history.slice(0, MAX_CHAT_SESSIONS);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Error saving chat history to localStorage:', error);
  }
};

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateSessionTitle = (messages) => {
  if (messages.length === 0) return 'New Chat';
  
  // Find the first user message to use as title
  const firstUserMessage = messages.find(msg => msg.type === 'user');
  if (firstUserMessage) {
    return firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
  }
  
  return 'Chat Session';
};

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
  const [currentLanguage, _setCurrentLanguage] = useState('en') // Kept for welcome messages but will default to English only
  const [faqs, _setFaqs] = useState([])
  const [showFAQs, setShowFAQs] = useState(false)
  const [_chatVisible, setChatVisible] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState(null)
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  const _languageNames = {
    en: 'English',
    bem: 'Bemba (Ichibemba)',
    loz: 'Lozi (Silozi)',
    nya: 'Nyanja (Chinyanja)'
  }

  // File upload functions
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    
    // Add file size and type validation
    const validFiles = files.filter(file => {
      const maxSize = 5 * 1024 * 1024 // 5MB limit
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Max size is 5MB.`)
        return false
      }
      return true
    })
    
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const uploadFiles = async (session_id) => {
    if (selectedFiles.length === 0) return []
    
    const formData = new FormData()
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })
    formData.append('session_id', session_id || sessionId || 'anonymous')
    
    setUploadingFiles(true)
    
    try {
      const response = await fetch(API_ENDPOINTS.FILE_UPLOAD, {
        method: 'POST',
        body: formData, // Don't set Content-Type header when using FormData
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Files uploaded successfully:', data)
        
        // Add a message to indicate files were uploaded
        const fileUploadMessage = {
          type: 'system',
          content: `Uploaded ${data.files.length} file(s): ${data.files.map(f => f.original_filename).join(', ')}`,
          timestamp: new Date().toISOString(),
          isFileUpload: true,
          files: data.files
        }
        
        const updatedMessages = [...messages, fileUploadMessage];
        setMessages(updatedMessages);
        setSelectedFiles([]) // Clear selected files after successful upload
        
        return data.files
      } else {
        console.error('File upload failed:', response.statusText)
        throw new Error(`Upload failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      const errorMessage = {
        type: 'system',
        content: `Failed to upload files: ${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }
      const updatedMessages = [...messages, errorMessage];
      setMessages(updatedMessages);
      
      return []
    } finally {
      setUploadingFiles(false)
    }
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

  // Initialize chat function (memoized so it can be used in effects safely)
  const initializeChat = useRef(null)

  initializeChat.current = () => {
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
      const newMessages = [welcomeMessage];
      setMessages(newMessages);
      
      // Save to history if we have a session ID
      if (currentSessionId) {
        const newSession = {
          id: currentSessionId,
          messages: newMessages,
          timestamp: new Date().toISOString(),
          title: generateSessionTitle(newMessages)
        };
        
        const history = getChatHistory();
        const existingSessionIndex = history.findIndex(session => session.id === currentSessionId);
        
        if (existingSessionIndex !== -1) {
          // Update existing session
          history[existingSessionIndex] = newSession;
        } else {
          // Add new session
          history.push(newSession);
        }
        
        saveChatHistory(history);
      }
    }
  }

  // Initialize chat on component mount
  useEffect(() => {
    if (isOpen) {
      initializeChat.current()
    }
  }, [isOpen])
  
  // Load chat history from localStorage when component mounts
  useEffect(() => {
    if (isOpen) {
      const history = getChatHistory();
      if (history.length > 0) {
        // Load the most recent session
        const latestSession = history[history.length - 1];
        setMessages(latestSession.messages);
        setCurrentSessionId(latestSession.id);
      } else {
        // Create a new session if no history exists
        const newSessionId = generateSessionId();
        setCurrentSessionId(newSessionId);
      }
    }
  }, [isOpen])
  
  // Update chat history when messages change
  useEffect(() => {
    if (messages.length > 0 && currentSessionId) {
      const session = {
        id: currentSessionId,
        messages: messages,
        timestamp: new Date().toISOString(),
        title: generateSessionTitle(messages)
      };
      
      const history = getChatHistory();
      const existingSessionIndex = history.findIndex(s => s.id === currentSessionId);
      
      if (existingSessionIndex !== -1) {
        // Update existing session
        history[existingSessionIndex] = session;
      } else {
        // Add new session
        history.push(session);
      }
      
      saveChatHistory(history);
    }
  }, [messages, currentSessionId])

  

  const sendMessage = async () => {
    if ((!inputMessage.trim() && selectedFiles.length === 0) || isLoading) return

    // Create a new session ID if one doesn't exist
    const sessionToUse = currentSessionId || generateSessionId();
    if (!currentSessionId) {
      setCurrentSessionId(sessionToUse);
    }

    // Upload files first if any
    if (selectedFiles.length > 0) {
      await uploadFiles(sessionId || 'anonymous')
    }

    let updatedMessages = [...messages]; // Use current messages state

    // Only send message if there's text content
    if (inputMessage.trim()) {
      const userMessage = {
        type: 'user',
        content: inputMessage.trim(),
        timestamp: new Date().toISOString()
      }

      updatedMessages = [...updatedMessages, userMessage];
      setMessages(updatedMessages);
      setInputMessage('');
    }

    // If there's text content or files were uploaded, trigger the AI
    if (inputMessage.trim() || selectedFiles.length > 0) {
      setIsLoading(true)

      try {
        const response = await fetch(`${API_BASE_URL}/chatbot/chat/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputMessage.trim() || `I've uploaded ${selectedFiles.length} file(s) for reference. Please analyze them and respond accordingly.`,
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
            followUpSuggestions: data.follow_up_suggestions || [],
            id: Date.now() // Add unique ID for typewriter effect
          }

          updatedMessages = [...updatedMessages, botMessage];
          setMessages(updatedMessages);
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
        updatedMessages = [...updatedMessages, errorMessage];
        setMessages(updatedMessages);
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleFAQClick = (faq) => {
    const question = currentLanguage === 'en' 
      ? faq.question_en 
      : faq.translations?.find(t => t.language_code === currentLanguage)?.question || faq.question_en

    setInputMessage(question)
    setShowFAQs(false)
  }

  // Function to format bot responses based on content type
  const formatBotResponse = (content, message) => {
    // Check if response contains tax calculation information - very specific detection
    const hasCalculationTerms = (content.toLowerCase().includes('calculate') && 
                                (content.toLowerCase().includes('tax') || content.toLowerCase().includes('rate'))) || 
                                (content.toLowerCase().includes('calculation') && content.toLowerCase().includes('tax')) ||
                                content.toLowerCase().includes('tax rate') ||
                                content.toLowerCase().includes('how much tax') ||
                                content.toLowerCase().includes('tax amount');
                                
    if (hasCalculationTerms) {
      return (
        <div className="space-y-2">
          <p className="whitespace-pre-wrap">{content}</p>
          {typingMessageId !== message.id && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs">
              <p className="font-medium text-blue-800">💡 Need to calculate this yourself?</p>
              <a 
                href="https://www.zra.org.zm/tax-calculators" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
              >
                Use our official tax calculators
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      );
    }
    
    

    
    // Check if response contains explicit contact information - very specific detection
    if ((content.toLowerCase().includes('contact') || 
         content.toLowerCase().includes('reach')) &&
        (content.toLowerCase().includes('phone') ||
         content.toLowerCase().includes('number') ||
         content.toLowerCase().includes('email') ||
         content.toLowerCase().includes('call us'))) {
      return (
        <div className="space-y-2">
          <p className="whitespace-pre-wrap">{content}</p>
          {typingMessageId !== message.id && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs">
              <p className="font-medium text-blue-800">📞 Contact Information:</p>
              <a 
                href="https://www.zra.org.zm/contact-us" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
              >
                Visit our contact page
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      );
    }
    
    // Default response
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const insertEmoji = (emoji) => {
    setInputMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  // Function to load a specific chat session
  const loadChatSession = (sessionId) => {
    const history = getChatHistory();
    const session = history.find(s => s.id === sessionId);
    
    if (session) {
      setMessages(session.messages);
      setCurrentSessionId(session.id);
    }
  };
  
  // Function to delete a specific chat session
  const deleteChatSession = (sessionId) => {
    const history = getChatHistory();
    const updatedHistory = history.filter(s => s.id !== sessionId);
    saveChatHistory(updatedHistory);
    
    // If we're deleting the current session, clear the chat
    if (sessionId === currentSessionId) {
      setMessages([]);
      const newSessionId = generateSessionId();
      setCurrentSessionId(newSessionId);
      
      // Initialize with welcome message for new session
      const welcomeOptions = welcomeMessages[currentLanguage];
      const randomWelcome = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];
      const welcomeMessage = {
        type: 'bot',
        content: randomWelcome.greeting,
        timestamp: new Date().toISOString(),
        isWelcome: true,
        welcomeData: randomWelcome
      };
      const newMessages = [welcomeMessage];
      setMessages(newMessages);
      
      // Save the new session
      const newSession = {
        id: newSessionId,
        messages: newMessages,
        timestamp: new Date().toISOString(),
        title: generateSessionTitle(newMessages)
      };
      
      const updatedHistoryWithNew = [...getChatHistory(), newSession];
      saveChatHistory(updatedHistoryWithNew);
    }
  };
  
  // Function to clear all chat history
  const clearAllChatHistory = () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    setMessages([]);
    const newSessionId = generateSessionId();
    setCurrentSessionId(newSessionId);
    
    // Initialize with welcome message for new session
    const welcomeOptions = welcomeMessages[currentLanguage];
    const randomWelcome = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];
    const welcomeMessage = {
      type: 'bot',
      content: randomWelcome.greeting,
      timestamp: new Date().toISOString(),
      isWelcome: true,
      welcomeData: randomWelcome
    };
    const newMessages = [welcomeMessage];
    setMessages(newMessages);
    
    // Save the new session
    const newSession = {
      id: newSessionId,
      messages: newMessages,
      timestamp: new Date().toISOString(),
      title: generateSessionTitle(newMessages)
    };
    
    saveChatHistory([newSession]);
  };

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
  <div className="relative w-full h-full">
  {/* Main Chat Area - stays in original position */}
  <div className={`bg-white shadow-2xl border border-gray-200 flex flex-col h-full max-h-[32rem] ${window.innerWidth <= 640 ? 'rounded-none' : 'rounded-lg'}`}>
        {/* Header */}
        <div className="bg-[#1e40af] text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base">ZAX</span>
            <span className="text-xs opacity-75">AI Tax Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle Button */}
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-xl hover:text-amber-300 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-600/10"
              title="Chat History"
            >
              💬
            </button>
            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="text-2xl sm:text-xl hover:text-amber-300 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10"
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

        {/* In-chat sidebar overlay and panel: rendered between header/FAQ and messages */}
        {showSidebar && (
          <div className="absolute inset-0 flex items-start justify-end z-50">
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg" onClick={() => setShowSidebar(false)} />
            <div
              className="bg-white shadow-2xl border border-gray-200 overflow-hidden"
              style={{ width: '80%', height: '90%', borderRadius: '12px', marginTop: '0.25rem', zIndex: 60 }}
            >
              <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                <h4 className="text-xs font-semibold text-gray-700">Chat History</h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setMessages([]);
                      const newSessionId = generateSessionId();
                      setCurrentSessionId(newSessionId);
                      const welcomeOptions = welcomeMessages[currentLanguage];
                      const randomWelcome = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];
                      const welcomeMessage = {
                        type: 'bot',
                        content: randomWelcome.greeting,
                        timestamp: new Date().toISOString(),
                        isWelcome: true,
                        welcomeData: randomWelcome
                      };
                      const newMessages = [welcomeMessage];
                      setMessages(newMessages);
                      const newSession = { id: newSessionId, messages: newMessages, timestamp: new Date().toISOString(), title: generateSessionTitle(newMessages) };
                      const updatedHistory = [...getChatHistory(), newSession];
                      saveChatHistory(updatedHistory);
                      setShowSidebar(false);
                    }}
                    className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded transition-colors mr-1"
                  >
                    + New
                  </button>
                  <button onClick={clearAllChatHistory} className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition-colors">Clear All</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {getChatHistory().length > 0 ? (
                  [...getChatHistory()].reverse().map(session => (
                    <div key={session.id} className={`flex justify-between items-center text-xs p-2 rounded ${session.id === currentSessionId ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100 text-gray-700'}`}>
                      <button onClick={() => { loadChatSession(session.id); setShowSidebar(false); }} className="flex-1 text-left truncate">{session.title}</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteChatSession(session.id); }} className="ml-2 text-gray-500 hover:text-red-600">×</button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">No chat history yet</p>
                )}
              </div>
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
                  <div className="prose max-w-none text-sm">
                    {message.type === 'bot' && typingMessageId === message.id ? (
                      <div className="whitespace-pre-wrap">
                        <TypewriterText 
                          text={message.content} 
                          speed={5} 
                          onComplete={() => setTypingMessageId(null)}
                        />
                      </div>
                    ) : (
                      formatBotResponse(message.content.replace(/their/g, 'our').replace(/they/g, 'we'), message)
                    )}
                    
                    {/* Enhanced follow-up suggestions */}
                    {message.suggestedFAQs && message.suggestedFAQs.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium mb-2 text-gray-700">You might also want to know:</p>
                        <div className="flex flex-wrap gap-2">
                          {message.suggestedFAQs.slice(0, 3).map((faq, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFAQClick(faq)}
                              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-200"
                            >
                              {currentLanguage === 'en' 
                                  ? faq.question_en 
                                  : faq.translations?.find(t => t.language_code === currentLanguage)?.question || faq.question_en}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Dynamic follow-up suggestions from backend */}
                    {typingMessageId !== message.id && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium mb-2 text-gray-700">Need more help?</p>
                        <div className="flex flex-wrap gap-2">
                          {message.followUpSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => setInputMessage(suggestion.question)}
                              className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                            >
                              {suggestion.question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Add links to official ZRA resources if available */}
                    {message.isZRARelated && !message.needsSupport && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium mb-1 text-gray-700">Official Resources:</p>
                        <div className="flex flex-wrap gap-2">
                          <a 
                            href="https://www.zra.org.zm" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                          >
                            Our Website
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          {message.content.toLowerCase().includes('vat') && (
                            <a 
                              href="https://www.zra.org.zm/indirect-taxes/vat" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                            >
                              VAT Information
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                          {message.content.toLowerCase().includes('paye') && (
                            <a 
                              href="https://www.zra.org.zm/direct-taxes/paye" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                            >
                              PAYE Information
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                          {message.content.toLowerCase().includes('custom') || message.content.toLowerCase().includes('import') || message.content.toLowerCase().includes('export') ? (
                            <a 
                              href="https://www.zra.org.zm/trade-facilitation" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                            >
                              Customs Information
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : null}
                          </div>
                      </div>
                    )}
                    
                    {/* Context-aware interactive elements for relevant processes */}
                    {typingMessageId !== message.id && (
                      <>
                        {message.content.toLowerCase().includes('register') && 
                         (message.content.toLowerCase().includes('vat') || 
                          message.content.toLowerCase().includes('tax') ||
                          message.content.toLowerCase().includes('business')) && (
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <p className="text-xs font-medium mb-2 text-gray-700">Next Steps:</p>
                            <div className="flex flex-wrap gap-2">
                              {message.content.toLowerCase().includes('vat') && (
                                <button
                                  onClick={() => setInputMessage("How do I register for VAT?")}
                                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  VAT Registration
                                </button>
                              )}
                              {(message.content.toLowerCase().includes('business') || message.content.toLowerCase().includes('company')) && (
                                <button
                                  onClick={() => setInputMessage("What documents do I need for business registration?")}
                                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  Business Docs
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {(message.content.toLowerCase().includes('file') || message.content.toLowerCase().includes('return')) && 
                         (message.content.toLowerCase().includes('vat') || 
                          message.content.toLowerCase().includes('paye') ||
                          message.content.toLowerCase().includes('tax')) && (
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <p className="text-xs font-medium mb-2 text-gray-700">Need Help Filing?</p>
                            <div className="flex flex-wrap gap-2">
                              {message.content.toLowerCase().includes('vat') && (
                                <button
                                  onClick={() => setInputMessage("How do I file my VAT return?")}
                                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  VAT Filing
                                </button>
                              )}
                              {message.content.toLowerCase().includes('paye') && (
                                <button
                                  onClick={() => setInputMessage("How do I file my PAYE return?")}
                                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                                >
                                  PAYE Filing
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
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
          <div className="relative mb-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 pr-14 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none w-full"
              placeholder={currentLanguage === 'en' ? "Type your question..." : "Lembani mupusho wenu..."}
              rows="1"
              disabled={isLoading}
            />
            
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 rounded text-blue-400 hover:bg-blue-50 text-base"
              title="Insert Emoji"
            >
              😊
            </button>
            
            {/* File Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded text-blue-400 hover:bg-blue-50 text-base"
              title="Upload file"
            >
              📎
            </button>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-w-xs z-20">
                <div className="grid grid-cols-8 gap-1">
                  {['😀', '😂', '😊', '😍', '🥰', '😎', '🤗', '🤔', 
                    '👍', '👏', '🙌', '👌', '🙏', '🔥', '✨', '🎉',
                    '💯', '✅', '❓', '❗', '❤️', '💖', '💙', '💕',
                    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
                    '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌',
                    '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
                    '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
                    '😑', '😶', '😏', '😒', '🙄', '😬', '🤤', '😴'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="text-lg p-1 hover:bg-gray-100 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.odt,.rtf"
            />
          </div>
          
          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center bg-blue-100 text-blue-800 rounded px-2 py-1 text-xs">
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    className="ml-1 text-blue-600 hover:text-blue-900"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {uploadingFiles ? 'Uploading files...' : `${selectedFiles.length} file(s) selected`}
            </div>
            <button 
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && selectedFiles.length === 0) || isLoading || uploadingFiles}
              className="bg-[#1e40af] hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {isLoading || uploadingFiles ? '...' : (currentLanguage === 'en' ? 'Send' : 'Tuma')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {welcome.note}
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Chatbot