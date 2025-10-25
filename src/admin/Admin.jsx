import { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

// Mock admin credentials - in a real app, this would be handled securely on the backend
const ADMIN_CREDENTIALS = {
  username: 'zra_admin',
  password: 'zra_secret123'
};

const Admin = () => {
  // Initialize login state from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const storedLogin = localStorage.getItem('adminIsLoggedIn');
    const storedUsername = localStorage.getItem('adminUsername');
    return storedLogin === 'true' && storedUsername === ADMIN_CREDENTIALS.username;
  });
  
  const [username, setUsername] = useState(() => {
    const storedUsername = localStorage.getItem('adminUsername');
    return storedUsername === ADMIN_CREDENTIALS.username ? storedUsername : '';
  });
  
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [refreshIntervalId, setRefreshIntervalId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true); // For responsive sidebar toggle
  const messagesEndRef = useRef(null);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);


  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setIsLoggedIn(true);
      localStorage.setItem('adminIsLoggedIn', 'true');
      localStorage.setItem('adminUsername', username);
      setLoginError('');
      
      // Start polling for active sessions
      startSessionPolling();
    } else {
      setLoginError('Invalid username or password');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adminIsLoggedIn');
    localStorage.removeItem('adminUsername');
    setUsername('');
    setPassword('');
    setActiveSessions([]);
    setSelectedSession(null);
    setChatHistory([]);
    
    // Clear polling interval
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      setRefreshIntervalId(null);
    }
  };

  // Start polling for active sessions
  const startSessionPolling = () => {
    // Clear existing interval if any
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }

    // Initial fetch
    fetchActiveSessions();

    // Set up interval to fetch every 2 seconds for better responsiveness
    const intervalId = setInterval(fetchActiveSessions, 2000);
    setRefreshIntervalId(intervalId);
  };

  // Fetch active sessions
  const fetchActiveSessions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_ACTIVE_SESSIONS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data.active_sessions);
      } else {
        console.error('Failed to fetch active sessions');
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  // Connect to a user chat session
  const connectToSession = async (session_id) => {
    // Set selected session immediately for UI responsiveness
    // and show loading state
    const loadingSession = { session_id, status: 'connecting' };
    setSelectedSession(loadingSession);
    
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_CONNECT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id })
      });

      if (response.ok) {
        const data = await response.json();
        // Update with actual session data
        setSelectedSession(data);
        
        // Fetch chat history for this session
        fetchChatHistory(session_id);
      } else {
        const errorData = await response.json();
        setNotification({ type: 'error', message: `Error connecting to session: ${errorData.error}` });
        // Revert to no selection on error
        setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error connecting to session:', error);
      setNotification({ type: 'error', message: 'Error connecting to session' });
      // Revert to no selection on error  
      setSelectedSession(null);
    }
  };

  // Fetch chat history for a session
  const fetchChatHistory = async (session_id) => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_CHAT_HISTORY(session_id), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        let allMessages = [...data.messages];
        
        // Add file information as system messages if there are files
        if (data.files && data.files.length > 0) {
          data.files.forEach(file => {
            const fileMessage = {
              id: `file-${file.id}`,
              sender_type: 'system',
              sender_id: 'system',
              message: `[File] ${file.original_filename} (${file.file_type}) - ${Math.round(file.file_size/1024)}KB ${file.processed ? '- Processed: ' + (file.processed_content.substring(0, 100) + '...') : ''}`,
              timestamp: file.upload_time,
              is_read: false,
              is_file: true,
              file_data: file
            };
            allMessages.push(fileMessage);
          });
        }
        
        // Sort all messages by timestamp
        allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setChatHistory(allMessages);
      } else {
        console.error('Failed to fetch chat history');
        // Don't show error for every fetch, only significant ones
      }
    } catch (error) {
      // Only show error if network issue, not for normal 404s or similar
      if (error.name !== 'TypeError' || error.message.includes('fetch')) {
        console.error('Error fetching chat history:', error);
      }
    }
  };

  // Poll for new messages when a session is selected
  useEffect(() => {
    if (selectedSession) {
      // Fetch initial chat history
      fetchChatHistory(selectedSession.session_id);
      
      // Set up polling for new messages every 1.5 seconds for faster updates
      const intervalId = setInterval(() => {
        fetchChatHistory(selectedSession.session_id);
      }, 1500);
      
      return () => clearInterval(intervalId);
    }
  }, [selectedSession]);

  // Send a message to the user
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_SEND_MESSAGE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          session_id: selectedSession.session_id, 
          message: newMessage 
        })
      });

      if (response.ok) {
        // Fetch updated chat history instead of manually adding to avoid duplication
        fetchChatHistory(selectedSession.session_id);
        setNewMessage('');
        
        // Also refresh active sessions to reflect latest activity
        // This helps with faster updates
        setTimeout(() => {
          fetchActiveSessions();
        }, 1000); // Small delay to allow backend to process message
      } else {
        const errorData = await response.json();
        setNotification({ type: 'error', message: `Error sending message: ${errorData.error}` });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNotification({ type: 'error', message: 'Error sending message' });
    }
  };

  // End the current chat session
  const endSession = async () => {
    if (!selectedSession) return;

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_END_SESSION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: selectedSession.session_id })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedSession(null);
        setChatHistory([]);
        // Don't use alert, instead update UI to reflect session ended
        // Show a temporary notification
        setNotification({ type: 'success', message: 'Session ended successfully' });
        
        // Force refresh of active sessions immediately after ending a session
        setTimeout(() => {
          fetchActiveSessions();
        }, 500); // Small delay to ensure backend has processed the request
      } else {
        const errorData = await response.json();
        setNotification({ type: 'error', message: `Error ending session: ${errorData.error}` });
      }
    } catch (error) {
      console.error('Error ending session:', error);
      setNotification({ type: 'error', message: 'Error ending session' });
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-[#1e40af] mb-6">ZRA Admin Portal</h1>
          <p className="text-gray-600 text-center mb-6">Please sign in to access user chats</p>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter username"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter password"
              />
            </div>
            
            {loginError && (
              <div className="mb-4 text-red-500 text-sm">{loginError}</div>
            )}
            
            <div className="flex items-center justify-between">
              <button
                className="bg-[#1e40af] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                type="submit"
              >
                Sign In
              </button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100 text-sm text-blue-700">
            <p><strong>Test Credentials:</strong></p>
            <p>Username: <code className="bg-gray-100 px-1 rounded">zra_admin</code></p>
            <p>Password: <code className="bg-gray-100 px-1 rounded">zra_secret123</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Notification Toast */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg transition-opacity duration-300 ${
            notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}
      {/* Responsive sidebar - Hidden on small screens when showSidebar is false */}
      <div className={`${showSidebar ? 'w-80' : 'w-0 lg:w-80'} ${showSidebar ? 'ml-0' : '-ml-80 lg:ml-0'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Active Chat Sessions</h2>
            <div className="flex space-x-2 lg:hidden">
              {/* Hamburger menu button for mobile */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showSidebar ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
            <div className="hidden lg:flex space-x-2">
              <button
                onClick={fetchActiveSessions}
                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                title="Refresh sessions"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Updated automatically every 3 seconds</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {activeSessions.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">No active sessions</p>
          ) : (
            activeSessions.map((session) => (
              <div
                key={session.session_id}
                className={`p-3 mb-2 rounded cursor-pointer border ${
                  selectedSession && selectedSession.session_id === session.session_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => {
                  connectToSession(session.session_id);
                  // On mobile, close sidebar after selecting a session
                  if (window.innerWidth < 1024) {
                    setShowSidebar(false);
                  }
                }}
              >
                <div className="flex justify-between">
                  <span className="font-medium text-sm truncate">{session.session_id}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    session.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : session.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  User: {session.user_id}
                </div>
                <div className="text-xs text-gray-500">
                  {session.latest_message ? (
                    <div className="truncate">
                      <span className="font-medium">Last:</span> {session.latest_message}
                    </div>
                  ) : (
                    <div>No messages yet</div>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(session.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Main Chat Area - Full width on mobile when sidebar is hidden */}
      <div className={`${showSidebar ? 'lg:flex-1' : 'flex-1'} flex flex-col ${!showSidebar ? 'absolute inset-0 z-10 bg-white' : ''}`}>
        {/* Toggle sidebar button for mobile */}
        {!showSidebar && (
          <div className="p-3 bg-white border-b lg:hidden">
            <button
              onClick={() => setShowSidebar(true)}
              className="flex items-center text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Sessions
            </button>
          </div>
        )}
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">Session: {selectedSession.session_id}</h3>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`${
                      selectedSession.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {selectedSession.status}
                    </span>
                    {selectedSession.staff_member && (
                      <span> | Assigned to: {selectedSession.staff_member}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={endSession}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  End Session
                </button>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="max-w-3xl mx-auto">
                {chatHistory.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${
                      message.is_file || message.sender_type === 'user' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.is_file
                          ? 'bg-purple-100 text-purple-800'  // Purple background for file messages
                          : message.sender_type === 'user'
                          ? 'bg-gray-200 text-gray-800'  // Light background for user messages (left side)
                          : message.sender_type === 'staff'
                          ? 'bg-[#1e40af] text-white'  // Blue background for staff messages (right side)
                          : 'bg-yellow-100 text-yellow-800 text-center text-xs'  // System messages
                      }`}
                    >
                      {message.is_file && message.file_data ? (
                        <div>
                          <div className="flex items-center">
                            {message.file_data.file_type === 'image' ? (
                              <span className="mr-2">🖼️</span>
                            ) : message.file_data.original_filename.toLowerCase().endsWith('.pdf') ? (
                              <span className="mr-2">📄</span>
                            ) : message.file_data.original_filename.toLowerCase().endsWith('.doc') || 
                                 message.file_data.original_filename.toLowerCase().endsWith('.docx') ? (
                              <span className="mr-2">📝</span>
                            ) : (
                              <span className="mr-2">📁</span>
                            )}
                            <div>
                              <div className="font-medium">{message.file_data.original_filename}</div>
                              <div className="text-xs">Type: {message.file_data.file_type} | Size: {Math.round(message.file_data.file_size/1024)}KB</div>
                            </div>
                          </div>
                          
                          {message.file_data.processed_content && (
                            <div className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded">
                              <div className="font-medium text-purple-700">Extracted content:</div>
                              <div>{message.file_data.processed_content.substring(0, 200)}{message.file_data.processed_content.length > 200 ? '...' : ''}</div>
                            </div>
                          )}
                          
                          {/* File download link and preview */}
                          <div className="mt-2 space-y-2">
                            {/* Image preview */}
                            {message.file_data.file_type === 'image' && (
                              <div className="mt-2 border rounded-lg overflow-hidden">
                                <img 
                                  src={message.file_data.full_media_url || `${API_ENDPOINTS.CHAT.replace('/chatbot/chat/', '').replace('/api', '')}/media/${message.file_data.file_path}`} 
                                  alt={message.file_data.original_filename}
                                  className="max-w-full max-h-64 object-contain"
                                />
                              </div>
                            )}
                            
                            <a 
                              href={message.file_data.full_media_url || `${API_ENDPOINTS.CHAT.replace('/chatbot/chat/', '').replace('/api', '')}/media/${message.file_data.file_path}`} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                              </svg>
                              Download File
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm">{message.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {formatTime(message.timestamp)} | {message.sender_type}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="max-w-3xl mx-auto flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message to the user..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-[#1e40af] hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 rounded-r-lg"
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Press Enter to send or click Send button
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Chat Session</h3>
              <p className="text-gray-500">Choose an active session from the left panel to start chatting with the user</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;