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
  const currentLanguage = 'en'; // Fixed to English only
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
  const [isConnectingToStaff, setIsConnectingToStaff] = useState(false)
  const [isConnectedToStaff, setIsConnectedToStaff] = useState(false)
  const [staffConnectionStatus, setStaffConnectionStatus] = useState('not_connected') // not_connected, pending, connected
  const [showRating, setShowRating] = useState(false)
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)



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

  const welcomeMessages = [
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
  ]

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
      const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]
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

    // If there's text content or files were uploaded
    if (inputMessage.trim() || selectedFiles.length > 0) {
      setIsLoading(true)

      // If connected to staff, send the message to staff instead of the bot
      if (isConnectedToStaff && currentSessionId) {
        try {
          // Add user message to chat immediately for better UX
          if (inputMessage.trim()) {
            const userMessage = {
              type: 'user',
              content: inputMessage.trim(),
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, userMessage]);
          }
          
          // Send the text message separately from files
          // Files are already uploaded and associated with the session
          let messageToSend = inputMessage.trim();
          if (!messageToSend && selectedFiles.length > 0) {
            messageToSend = `I've uploaded ${selectedFiles.length} file(s) for your review.`;
          }

          // Send message to staff via the user message endpoint (not staff endpoint)
          const response = await fetch(API_ENDPOINTS.ADMIN_SEND_USER_MESSAGE, {  // Use new endpoint from config
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: currentSessionId,
              message: messageToSend
            })
          });

          if (response.ok) {
            // Message was successfully sent to staff, no need to add again
            setInputMessage('');
          } else {
            throw new Error('Failed to send message to staff');
          }
        } catch (error) {
          console.error('Error sending message to staff:', error);
          // Remove the user message if sending failed and show error
          if (inputMessage.trim()) {
            setMessages(prev => {
              const newMessages = [...prev];
              // Remove the last message if it was the one we just added
              if (newMessages.length > 0 && newMessages[newMessages.length - 1].content === inputMessage.trim()) {
                newMessages.pop();
              }
              const errorMessage = {
                type: 'bot',
                content: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
                timestamp: new Date().toISOString(),
                isError: true
              };
              newMessages.push(errorMessage);
              return newMessages;
            });
          } else {
            const errorMessage = {
              type: 'bot',
              content: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
              timestamp: new Date().toISOString(),
              isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        // Regular bot interaction
        // Add user message first for better UX
        if (inputMessage.trim()) {
          const userMessage = {
            type: 'user',
            content: inputMessage.trim(),
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, userMessage]);
        }
        
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

            // Remove any hashtags from the response
            let processedContent = data.response;
            processedContent = processedContent.replace(/#[a-zA-Z0-9_]+/g, '').trim();
            
            const botMessage = {
              type: 'bot',
              content: processedContent,
              timestamp: new Date().toISOString(),
              isZRARelated: data.is_zra_related,
              needsSupport: data.needs_support,
              suggestedFAQs: data.suggested_faqs || [],
              followUpSuggestions: data.follow_up_suggestions || [],
              id: Date.now() // Add unique ID for typewriter effect
            }

            setMessages(prev => [...prev, botMessage]);
            setTypingMessageId(botMessage.id) // Set this message to use typewriter effect
          } else {
            throw new Error('Failed to send message')
          }
        } catch (error) {
          console.error('Error sending message:', error)
          // Remove user message if bot request failed and show error
          setMessages(prev => {
            const newMessages = [...prev];
            // Remove the last message if it was the user's message
            if (inputMessage.trim() && newMessages.length > 0 && newMessages[newMessages.length - 1].content === inputMessage.trim()) {
              newMessages.pop();
            }
            const errorMessage = {
              type: 'bot',
              content: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
              timestamp: new Date().toISOString(),
              isError: true
            };
            newMessages.push(errorMessage);
            return newMessages;
          });
        } finally {
          setIsLoading(false)
          setInputMessage(''); // Clear input after processing
        }
      }
    }
  }

  const handleFAQClick = (faq) => {
    const question = faq.question_en;

    setInputMessage(question)
    setShowFAQs(false)
  }

  // Function to handle feedback for a message
  const handleFeedback = (messageId, isHelpful) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          feedbackGiven: true,
          feedbackHelpful: isHelpful
        };
      }
      return msg;
    });
    setMessages(updatedMessages);
  };

  // Function to request staff assistance
  const requestStaffAssistance = async (messageId = null) => {
    if (isConnectingToStaff || isConnectedToStaff) return;
    
    setIsConnectingToStaff(true);
    
    // Generate a new session ID if we're trying to reconnect after a disconnect
    const sessionToUse = currentSessionId || generateSessionId();
    if (!currentSessionId) {
      setCurrentSessionId(sessionToUse);
      // When starting a new session, allow rating to be shown again
      ratingShownForSessionRef.current.delete(sessionToUse);
    }
    
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_REQUEST_ASSISTANCE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          session_id: sessionToUse,
          user_id: sessionToUse
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setStaffConnectionStatus('pending');
        
        // Add a message to indicate staff assistance has been requested
        const staffMessage = {
          type: 'system',
          content: "ZRA staff has been notified. Please hold on, a staff member will connect with you shortly.",
          timestamp: new Date().toISOString(),
          isStaffNotification: true
        };
        
        setMessages(prev => [...prev, staffMessage]);
      } else {
        throw new Error('Failed to request staff assistance');
      }
    } catch (error) {
      console.error('Error requesting staff assistance:', error);
      const errorMessage = {
        type: 'system',
        content: "Sorry, we couldn't connect you to a staff member right now. Please try again later.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsConnectingToStaff(false);
    }


  // Function to handle rating after chat with agent
  const handleRating = (rating) => {
    setIsRatingSubmitted(true);
    // In a real app, you would send this rating to the backend
    
    // Add rating message to chat history
    const ratingMessage = {
      type: 'system',
      content: `Thank you for your feedback! You rated the agent assistance: ${rating}`,
      timestamp: new Date().toISOString(),
      isRating: true
    };
    setMessages(prev => [...prev, ratingMessage]);
    
    // Hide rating after a short delay
    setTimeout(() => {
      setShowRating(false);
      setIsRatingSubmitted(false);
    }, 3000);
  };

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
          {!content.toLowerCase().includes('staff has been notified') && 
           !content.toLowerCase().includes('staff member') && 
           !content.toLowerCase().includes('connecting') && 
           !content.toLowerCase().includes('please hold') && 
           !isConnectedToStaff && 
           typingMessageId !== message.id && 
           !message.feedbackGiven && 
           !content.toLowerCase().includes('Hello again!') && 
           !message.isWelcome && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-xs text-gray-600">Was this response helpful?</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleFeedback(message.id, true)}
                  className="text-lg hover:text-green-600 transition-colors"
                  title="Helpful"
                >
                  👍
                </button>
                <button 
                  onClick={() => handleFeedback(message.id, false)}
                  className="text-lg hover:text-red-600 transition-colors"
                  title="Not Helpful"
                >
                  👎
                </button>
              </div>
            </div>
          )}
          {typingMessageId !== message.id && message.feedbackGiven && message.feedbackHelpful && !message.isWelcome && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <p className="font-medium text-green-800">Thank you for your feedback!</p>
              <p className="text-green-700">Do you have any other questions?</p>
            </div>
          )}
          {typingMessageId !== message.id && message.feedbackGiven && !message.feedbackHelpful && !message.isWelcome && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-medium text-yellow-800">We're sorry to hear that.</p>
              <p className="text-yellow-700 mb-2">Here are some related questions you might find helpful:</p>
              <div className="flex flex-wrap gap-2">
                {message.followUpSuggestions && message.followUpSuggestions.slice(0, 2).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(suggestion.question)}
                    className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                  >
                    {suggestion.question}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setInputMessage('')}
                  className="text-xs bg-gray-200 text-gray-800 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                >
                  Continue Chat
                </button>
                <button
                  onClick={() => requestStaffAssistance(message.id)}
                  className="text-xs bg-amber-600 text-white hover:bg-amber-700 px-2 py-1 rounded transition-colors"
                >
                  Connect to Agent
                </button>
              </div>
            </div>
          )}
          {typingMessageId !== message.id && !message.feedbackGiven && (
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
          {!content.toLowerCase().includes('staff has been notified') && 
           !content.toLowerCase().includes('staff member') && 
           !content.toLowerCase().includes('connecting') && 
           !content.toLowerCase().includes('please hold') && 
           !isConnectedToStaff && 
           typingMessageId !== message.id && 
           !message.feedbackGiven && 
           !content.toLowerCase().includes('Hello again!') && 
           !message.isWelcome && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-xs text-gray-600">Was this response helpful?</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleFeedback(message.id, true)}
                  className="text-lg hover:text-green-600 transition-colors"
                  title="Helpful"
                >
                  👍
                </button>
                <button 
                  onClick={() => handleFeedback(message.id, false)}
                  className="text-lg hover:text-red-600 transition-colors"
                  title="Not Helpful"
                >
                  👎
                </button>
              </div>
            </div>
          )}
          {typingMessageId !== message.id && message.feedbackGiven && message.feedbackHelpful && !message.isWelcome && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <p className="font-medium text-green-800">Thank you for your feedback!</p>
              <p className="text-green-700">Do you have any other questions?</p>
            </div>
          )}
          {typingMessageId !== message.id && message.feedbackGiven && !message.feedbackHelpful && !message.isWelcome && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p className="font-medium text-yellow-800">We're sorry to hear that.</p>
              <p className="text-yellow-700 mb-2">Here are some related questions you might find helpful:</p>
              <div className="flex flex-wrap gap-2">
                {message.followUpSuggestions && message.followUpSuggestions.slice(0, 2).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(suggestion.question)}
                    className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                  >
                    {suggestion.question}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setInputMessage('')}
                  className="text-xs bg-gray-200 text-gray-800 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                >
                  Continue Chat
                </button>
                <button
                  onClick={() => requestStaffAssistance(message.id)}
                  className="text-xs bg-amber-600 text-white hover:bg-amber-700 px-2 py-1 rounded transition-colors"
                >
                  Connect to Agent
                </button>
              </div>
            </div>
          )}
          {typingMessageId !== message.id && !message.feedbackGiven && (
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
    
    // Default response with feedback options
    return (
      <div className="space-y-2">
        <p className="whitespace-pre-wrap">{content}</p>
        {/* Only show feedback for informational bot responses, not for system notifications or when connected to staff */}
        {!content.toLowerCase().includes('staff has been notified') && 
         !content.toLowerCase().includes('staff member') && 
         !content.toLowerCase().includes('connecting') && 
         !content.toLowerCase().includes('please hold') && 
         !isConnectedToStaff && 
         typingMessageId !== message.id && 
         !message.feedbackGiven && 
         !content.toLowerCase().includes('Hello again!') && 
         !message.isWelcome && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-xs text-gray-600">Was this response helpful?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleFeedback(message.id, true)}
                className="text-lg hover:text-green-600 transition-colors"
                title="Helpful"
              >
                👍
              </button>
              <button 
                onClick={() => handleFeedback(message.id, false)}
                className="text-lg hover:text-red-600 transition-colors"
                title="Not Helpful"
              >
                👎
              </button>
            </div>
          </div>
        )}
        {typingMessageId !== message.id && message.feedbackGiven && message.feedbackHelpful && !isConnectedToStaff && !message.isWelcome && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <p className="font-medium text-green-800">Thank you for your feedback!</p>
            <p className="text-green-700">Do you have any other questions?</p>
          </div>
        )}
        {typingMessageId !== message.id && message.feedbackGiven && !message.feedbackHelpful && !isConnectedToStaff && !message.isWelcome && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p className="font-medium text-yellow-800">We're sorry to hear that.</p>
            <p className="text-yellow-700 mb-2">Here are some related questions you might find helpful:</p>
            <div className="flex flex-wrap gap-2">
              {message.followUpSuggestions && message.followUpSuggestions.slice(0, 2).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMessage(suggestion.question)}
                  className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
                >
                  {suggestion.question}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setInputMessage('')}
                className="text-xs bg-gray-200 text-gray-800 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
              >
                Continue Chat
              </button>
              <button
                onClick={() => requestStaffAssistance(message.id)}
                className="text-xs bg-amber-600 text-white hover:bg-amber-700 px-2 py-1 rounded transition-colors"
              >
                Connect to Agent
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const insertEmoji = (emoji) => {
    setInputMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }
  

  
  // Function to check staff connection status
  const checkStaffConnectionStatus = async () => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_SESSION_STATUS(currentSessionId));
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if status changed from active to closed (to avoid repeated messages)
        const previousStatus = previousStatusRef.current;
        previousStatusRef.current = data.status; // Update previous status
        
        setStaffConnectionStatus(data.status);
        setIsConnectedToStaff(data.is_connected_to_staff);
        
        // If staff has connected, show a notification
        if (data.is_connected_to_staff && data.status === 'active') {
          if (!messages.some(msg => msg.isStaffConnectedNotification)) {
            const connectedMessage = {
              type: 'system',
              content: `ZRA staff member ${data.staff_member} has joined the chat and will assist you now.`,
              timestamp: new Date().toISOString(),
              isStaffConnectedNotification: true
            };
            setMessages(prev => [...prev, connectedMessage]);
          }
        } else if (data.status === 'closed' && previousStatus === 'active') {
          // Only add the disconnect message when status changes from active to closed
          const disconnectedMessage = {
            type: 'system',
            content: "The chat with ZRA staff has ended. You are now chatting with the AI assistant again.",
            timestamp: new Date().toISOString(),
            isStaffDisconnectedNotification: true
          };
          setMessages(prev => [...prev, disconnectedMessage]);
          
          // Only show rating interface if not already shown for this session
          if (!ratingShownForSessionRef.current.has(currentSessionId)) {
            setShowRating(true);
            ratingShownForSessionRef.current.add(currentSessionId);
          }
          
          // Reset staff connection status
          setStaffConnectionStatus('not_connected');
          setIsConnectedToStaff(false);
          
          // Since the session is effectively ended for staff, users would need a new session to reach staff
          // We'll just reset the flag but allow them to request staff again
        }
      }
    } catch (error) {
      console.error('Error checking staff connection status:', error);
    }
  };
  
  // Refs to manage polling and prevent duplicates
  const fetchAgentMessagesRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const lastMessagesRef = useRef([]);
  const previousStatusRef = useRef(null); // Track previous staff connection status to detect changes
  const ratingShownForSessionRef = useRef(new Set()); // Track which sessions have had rating shown
  
  // Function to fetch agent messages with comprehensive deduplication
  const fetchAgentMessages = async () => {
    const now = Date.now();
    
    // Debounce: prevent calls more frequent than 3 seconds
    if (now - lastFetchTimeRef.current < 3000) {
      return;
    }
    
    // Prevent concurrent executions
    if (fetchAgentMessagesRef.current) {
      return;
    }
    
    fetchAgentMessagesRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      if (!currentSessionId || !isConnectedToStaff) return;
      
      const response = await fetch(API_ENDPOINTS.ADMIN_CHAT_HISTORY(currentSessionId));
      
      if (response.ok) {
        const data = await response.json();
        
        // Use more robust duplicate detection
        const existingMessagesSet = new Set(messages.map(msg => 
          `${msg.sender_type}-${msg.content}-${new Date(msg.timestamp).getTime()}`
        ));
        
        // Track messages we've already added in this session
        const addedMessagesSet = new Set(lastMessagesRef.current);
        
        const staffMessages = data.messages.filter(staffMsg => {
          if (staffMsg.sender_type !== 'staff') return false;
          
          const messageKey = `${staffMsg.sender_type}-${staffMsg.message}-${new Date(staffMsg.timestamp).getTime()}`;
          
          // Check if this exact message already exists in current messages
          if (existingMessagesSet.has(messageKey)) return false;
          
          // Check if we've already processed this message in our tracking
          if (addedMessagesSet.has(messageKey)) return false;
          
          return true;
        });
        
        // Add new staff messages to the chat and tracking
        if (staffMessages.length > 0) {
          const newMessages = staffMessages.map(staffMsg => ({
            id: `agent-${staffMsg.id}-${Date.now()}`, // Include timestamp to ensure uniqueness
            type: 'agent',
            content: staffMsg.message,
            timestamp: staffMsg.timestamp,
            sender_type: staffMsg.sender_type
          }));
          
          setMessages(prev => [...prev, ...newMessages]);
          
          // Update our tracking of added messages
          staffMessages.forEach(staffMsg => {
            const messageKey = `${staffMsg.sender_type}-${staffMsg.message}-${new Date(staffMsg.timestamp).getTime()}`;
            lastMessagesRef.current.push(messageKey);
          });
          
          // Keep only recent message keys to prevent memory bloat
          if (lastMessagesRef.current.length > 100) {
            lastMessagesRef.current = lastMessagesRef.current.slice(-50);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching agent messages:', error);
    } finally {
      // Reset the flag to allow next execution
      fetchAgentMessagesRef.current = false;
    }
  };

  // Effect for checking staff connection status (less frequent)
  // Single unified effect for all staff-related polling to prevent multiple intervals
  useEffect(() => {
    let statusIntervalId = null;
    let messageIntervalId = null;
    
    if (currentSessionId && isOpen) {
      // Check connection status immediately
      checkStaffConnectionStatus();
      
      // Set up status checking interval (every 10 seconds)
      statusIntervalId = setInterval(checkStaffConnectionStatus, 10000);
      
      // Set up message fetching interval only when connected to staff
      if (isConnectedToStaff) {
        // Fetch agent messages immediately when connection starts
        fetchAgentMessages();
        
        // Then check for new messages every 8 seconds
        messageIntervalId = setInterval(fetchAgentMessages, 8000);
      }
    }
    
    // Cleanup function to clear all intervals
    return () => {
      if (statusIntervalId) {
        clearInterval(statusIntervalId);
      }
      if (messageIntervalId) {
        clearInterval(messageIntervalId);
      }
    };
  }, [currentSessionId, isOpen, isConnectedToStaff]);

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
      const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
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
    const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
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
  <div className={`bg-white shadow-2xl border border-gray-200 flex flex-col h-full ${window.innerWidth <= 640 ? 'h-full max-h-[100dvh] min-h-[100dvh] rounded-none' : 'max-h-[32rem] rounded-lg'}`}>
        {/* Header */}
        <div className="bg-[#1e40af] text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base">
                {isConnectedToStaff ? 'Nathan' : 'ZAX'}
              </span>
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${isConnectedToStaff ? 'bg-green-400' : 'bg-green-400'} animate-pulse`}></div>
              </div>
            </div>
            <div className="text-xs opacity-80">
              {isConnectedToStaff ? 'Agent' : 'AI Assistant'}
            </div>
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
                  {faq.question_en}
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
                      const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
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
        <div className={`flex-1 p-4 overflow-y-auto space-y-3 min-h-0 ${window.innerWidth <= 640 ? 'flex-grow' : ''}`}>
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user' 
                  ? 'bg-[#1e40af] text-white' 
                  : message.type === 'system'
                  ? 'bg-yellow-100 text-yellow-800 text-center text-xs'
                  : message.type === 'agent'
                  ? 'bg-gray-800 text-white'  // Darker background for agent messages
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
                    ) : message.type === 'bot' ? (
                      formatBotResponse(message.content.replace(/their/g, 'our').replace(/they/g, 'we'), message)
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {message.content.replace(/their/g, 'our').replace(/they/g, 'we')}
                      </div>
                    )}
                    
                    {/* Enhanced follow-up suggestions */}
                    {message.suggestedFAQs && message.suggestedFAQs.length > 0 && !message.isWelcome && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium mb-2 text-gray-700">You might also want to know:</p>
                        <div className="flex flex-wrap gap-2">
                          {message.suggestedFAQs.slice(0, 3).map((faq, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleFAQClick(faq)}
                              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-200"
                            >
                              {faq.question_en}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Dynamic follow-up suggestions from backend */}
                    {typingMessageId !== message.id && message.followUpSuggestions && message.followUpSuggestions.length > 0 && !message.isWelcome && (
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
                    {message.isZRARelated && !message.needsSupport && !message.isWelcome && (
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
                    {typingMessageId !== message.id && !message.isWelcome && (
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
          
          {/* Rating Interface */}
          {showRating && !isRatingSubmitted && (
            <div className="flex justify-center mt-4">
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-blue-800 mb-2">How was your experience with the agent?</p>
                <div className="flex justify-center gap-3">
                  {['😀', '🙂', '😐', '😕', '😞'].map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleRating(emoji)}
                      className="text-2xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
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
              placeholder="Type your question..."
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
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {isConnectingToStaff && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse"></span>
                  Connecting to staff...
                </span>
              )}
              {isConnectedToStaff && !isConnectingToStaff && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Connected to staff
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">
                {uploadingFiles ? 'Uploading files...' : `${selectedFiles.length} file(s) selected`}
              </div>
              <button 
                onClick={sendMessage}
                disabled={(!inputMessage.trim() && selectedFiles.length === 0) || isLoading || uploadingFiles}
                className="bg-[#1e40af] hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {isLoading || uploadingFiles ? '...' : 'Send'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {welcomeMessages[0].note}
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Chatbot