import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { 
  Play, Download, Save, Share2, Sun, Moon, 
  Home, Terminal, Loader2, Users, Copy, Check, 
  ArrowLeft, Clipboard, UserPlus, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../context/userContext';
import { BASE_URL } from '../api';
import { showToast } from "../components/Toaster";

// Define the language types
const languages = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    icon: '🟨',
  },
  python: {
    id: 'python',
    name: 'Python',
    icon: '🐍',
  },
  java: {
    id: 'java',
    name: 'Java',
    icon: '☕',
  },
};

// Default code for each language
const defaultCode: Record<string, string> = {
  javascript: '// Collaborative JavaScript coding\nconsole.log("Hello from collaborative session!");',
  python: '# Collaborative Python coding\nprint("Hello from collaborative session!")',
  java: '// Collaborative Java coding\nclass Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from collaborative session!");\n    }\n}',
};

export const CollabEditor: React.FC = () => {
  const { language, sessionId } = useParams<{ language: string; sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const isEditingRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string>('');
  
  // Get selected language
  const selectedLanguage = languages[language as keyof typeof languages] || languages.javascript;
  
  // Add this check at the beginning of your component
  useEffect(() => {
    // Check if sessionId contains the hostname (indicating incorrect URL format)
    if (sessionId && (sessionId.includes('http') || sessionId.includes('localhost'))) {
      console.error('Invalid session ID format detected:', sessionId);
      
      // Try to extract the actual session ID from the malformed URL
      const matches = sessionId.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
      if (matches && matches[1]) {
        const extractedSessionId = matches[1];
        console.log('Extracted correct session ID:', extractedSessionId);
        
        // Redirect to the correct URL
        navigate(`/collab/${language}/${extractedSessionId}`, { replace: true });
        return;
      }
      
      toast.error('Invalid session URL format');
    }
  }, [sessionId, language, navigate]);
  
  // Add this at the beginning of your component before the useEffect
  const cleanSessionId = sessionId ? sessionId.replace(/[^a-zA-Z0-9-]/g, '') : '';
  
  // Move ALL socket event listeners inside the useEffect
  useEffect(() => {
    setConnectionStatus('connecting');
    
    // Ensure we have the required parameters
    if (!sessionId || !language) {
      setOutput("Missing session ID or language selection. Please go back and try again.");
      return;
    }

    console.log(`Connecting to socket for session: ${sessionId}, language: ${language}`);
    
    // Update the socket connection to ONLY connect to port 3000
    const socketUrl = 'http://localhost:3000'; // Fixed backend URL
    console.log('Connecting directly to socket server at:', socketUrl);
    
    socketRef.current = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 30000,
      transports: ['websocket', 'polling'],
      forceNew: true
    });
    
    // Create a local reference to the socket to use in cleanup
    const socket = socketRef.current;
    
    // Set up all event listeners only after socket creation
    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
      setConnectionStatus('connected');
      
      // Get user's name from context or use a default display name
      const userName = user?.name || `User ${Math.floor(Math.random() * 1000)}`;
      
      // Join the session immediately after connection
      console.log(`Emitting join_session for: ${sessionId} as ${userName}`);
      socket.emit('join_session', {
        sessionId: cleanSessionId,
        userName: userName, // Use actual name or generated username
        language
      });
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
      setConnectionError(error.message);
    });
    
    socket.on('initial_code', (data) => {
      console.log('Received initial code:', data);
      if (data.code) {
        setCode(data.code);
      } else {
        setCode(defaultCode[language as keyof typeof defaultCode] || defaultCode.javascript);
      }
    });
    
    socket.on('code_update', (data) => {
      console.log('Received code update from server:', data);
      
      // IMPORTANT: Force the update by not checking isEditingRef
      // This is a critical fix
      //if (!isEditingRef.current && data.code) {
      if (data.code) {
        console.log('Applying code update from:', data.sender);
        setCode(data.code);
        toast.success('Code synchronized!', { duration: 2000 });
      }
    });
    
    socket.on('participants_update', (data) => {
      console.log('Received participants update:', data.participants);
      if (Array.isArray(data.participants)) {
        setParticipants(data.participants);
      } else {
        console.error('Invalid participants data:', data);
      }
    });
    
    socket.on('code_output', (data) => {
      setOutput(prev => prev + data);
    });
    
    socket.on('execution_status', (data) => {
      setOutput(data);
    });
    
    socket.on('execution_complete', () => {
      setIsRunning(false);
    });
    
    socket.on('execution_error', (error) => {
      setOutput(`Error: ${error}`);
      setIsRunning(false);
    });
    
    socket.on('pong_room', (data) => {
      console.log('Received pong from room:', data);
      toast.success(`Received pong from ${data.from.substring(0, 6)}...`);
    });

    socket.on('ping_ack', (data) => {
      console.log('Ping acknowledged, room members:', data.roomMembers);
    });
    
    socket.on('direct_test_response', (data) => {
      console.log('Received direct test response:', data);
      toast.success(`Received: ${data.message}`, { duration: 5000 });
    });
    
    socket.on('force_broadcast_received', (data) => {
      console.log('Received forced broadcast:', data);
      if (data.code) {
        setCode(data.code);
        toast.success('Received forced code update');
      }
    });
    
    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection');
      if (socket) {
        // Send leave message before disconnecting
        if (socket.connected) {
          socket.emit('leave_session', { sessionId });
        }
        socket.disconnect();
      }
    };
  }, [sessionId, language, user]);
  
  // Update the handleCodeChange function to force synchronization
  const handleCodeChange = (value: string | undefined) => {
    if (!value) return;
    
    // Always update local state immediately
    setCode(value);
    
    // Check socket before trying to emit
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('Socket not connected, cannot send update');
      return;
    }

    try {
      // Remove any debounce or isEditing flags - these are causing problems
      // Send with all metadata needed
      socketRef.current.emit('code_change', {
        sessionId,
        code: value,
        language,
        timestamp: Date.now(),
        sender: socketRef.current.id,
      });
      
      console.log(`Code update sent to server for session ${sessionId}`);
    } catch (error) {
      console.error('Error sending code update:', error);
    }
  };
  
  // Handle code execution
  const handleRunCode = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setOutput('');
    
    if (socketRef.current) {
      socketRef.current.emit('run_code', {
        sessionId,
        code,
        language
      });
    }
  };
  
  // Handle copying session invite link
  const handleCopyInviteLink = () => {
    // Only include the session ID in the invite, not the full current URL
    const inviteLink = `${window.location.origin}/collab/${language}/${sessionId}`;
    
    console.log('Generated invite link:', inviteLink);
    
    navigator.clipboard.writeText(inviteLink);
    setIsInviteCopied(true);
    showToast.success('Collaboration link copied to clipboard!');
    setTimeout(() => setIsInviteCopied(false), 2000);
  };
  
  // Handle copying code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  // Add toast notifications for connection events
  useEffect(() => {
    if (connectionStatus === 'connected') {
      showToast.success('Connected to collaboration session!');
    } else if (connectionStatus === 'error') {
      showToast.error(`Connection error: ${connectionError || 'Failed to connect'}`);
    }
  }, [connectionStatus, connectionError]);

  // Add this function to your component before the return statement
  const handleCopySessionId = () => {
    if (!sessionId) return;
    
    navigator.clipboard.writeText(sessionId);
    showToast.success('Session ID copied to clipboard');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0F172A] dark:to-[#1E293B]">
        <div className="relative h-screen flex flex-col">
          {/* Navbar */}
          <nav className="sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  onClick={() => navigate("/select-language")}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Back</span>
                </motion.button>
                
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedLanguage.icon}</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    Collaborative {selectedLanguage.name}
                  </span>
                </div>
              </div>
              
              {/* Participants count */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>{participants.length} online</span>
              </div>
              
              {/* Invite button */}
              <motion.button
                onClick={handleCopyInviteLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isInviteCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Invite Others</span>
                  </>
                )}
              </motion.button>
              
              {/* Run code button */}
              <motion.button
                onClick={handleRunCode}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isRunning}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Run Code</span>
              </motion.button>
              
              {/* Dark mode toggle */}
              <motion.button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>
            </div>
          </nav>
          
          {/* Main content */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden">
            {/* Editor section */}
            <div className="md:col-span-2 h-full flex flex-col">
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  language={selectedLanguage.id}
                  value={code}
                  onChange={handleCodeChange}
                  theme={isDarkMode ? "vs-dark" : "light"}
                  onMount={(editor) => {
                    editorRef.current = editor;
                  }}
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', monospace",
                    minimap: { enabled: false },
                    padding: { top: 20 },
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: "on",
                    renderLineHighlight: "all",
                    lineHeight: 1.6,
                    letterSpacing: 0.5,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
            
            {/* Right sidebar with output and participants */}
            <div className="h-full flex flex-col border-l border-gray-200 dark:border-gray-700/50 overflow-hidden">
              {/* Output console */}
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-700 dark:text-gray-300">Console Output</h3>
                  </div>
                  <motion.button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </motion.button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800 p-4 font-mono text-sm whitespace-pre-wrap">
                  {output ? (
                    <div className="text-gray-800 dark:text-gray-200">
                      {output}
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      Run your code to see output here...
                    </span>
                  )}
                </div>
              </div>
              
              {/* Participants list */}
              <div className="border-t border-gray-200 dark:border-gray-700/50">
                <div className="p-4">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Participants
                  </h3>
                  <div className="space-y-2">
                    {participants.length > 0 ? (
                      participants.map((name, index) => (
                        <div 
                          key={index} 
                          className={`px-3 py-2 ${name === (user?.name || 'User'+ Math.floor(Math.random() * 1000)) ? 
                            'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700' : 
                            'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'} 
                            rounded-lg border flex items-center gap-2`}
                        >
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {name}
                            {name === (user?.name || 'User'+ Math.floor(Math.random() * 1000)) && (
                              <span className="ml-2 text-xs text-indigo-500 dark:text-indigo-400">(you)</span>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        No participants yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Connection status notification */}
          {connectionStatus !== 'connected' && (
            <div className={`w-full p-4 ${connectionStatus === 'connecting' ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
              <div className="container mx-auto">
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connecting' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-blue-500">Connecting to session...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-red-500">Connection error: {connectionError || 'Failed to connect to session'}</span>
                      <button 
                        onClick={() => window.location.reload()}
                        className="ml-4 px-3 py-1 bg-red-500 text-white rounded-md text-sm"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {participants.length === 0 && connectionStatus === 'connected' && (
            <div className="fixed bottom-4 right-4 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 p-4 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-medium">You appear to be alone in this session</p>
                  <p className="text-sm">Share the link with others to collaborate</p>
                  <div className="mt-2">
                    <button
                      onClick={handleCopyInviteLink}
                      className="px-3 py-1.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-md text-sm font-medium"
                    >
                      Copy Invite Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 