'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, LogOut, Flame, Folder, FilePlus, Book, Plus, ChevronDown, Trash2, Check, AlertTriangle, X, Users, Share2 } from 'lucide-react';
import axios from 'axios';
import { useUser } from '../context/userContext';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { BASE_URL, API_ENDPOINTS } from "../api";

// Update the languages array with new styling properties
const languages = [
  {
    id: 'javascript',
    name: 'JavaScript',
    description: 'Modern web development with ES6+ features',
    icon: '🟨',
    popular: true,
    color: 'text-yellow-400',
    gradient: 'from-yellow-400/10 to-orange-500/10',
    border: 'border-yellow-400/20',
    hoverBorder: 'hover:border-yellow-400/40',
    iconBg: 'bg-yellow-400/10'
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Data science & machine learning',
    icon: '🐍',
    popular: true,
    color: 'text-emerald-400',
    gradient: 'from-emerald-400/10 to-teal-500/10',
    border: 'border-emerald-400/20',
    hoverBorder: 'hover:border-emerald-400/40',
    iconBg: 'bg-emerald-400/10'
  },
  {
    id: 'java',
    name: 'Java',
    description: 'Enterprise-scale applications',
    icon: '☕',
    popular: false,
    color: 'text-red-400',
    gradient: 'from-red-400/10 to-orange-500/10',
    border: 'border-red-400/20',
    hoverBorder: 'hover:border-red-400/40',
    iconBg: 'bg-red-400/10'
  },
];

const getFileExtension = (languageId: string) => {
  const extensions: Record<string, string> = {
    javascript: '.js',
    python: '.py',
    java: '.java'
  };
  return extensions[languageId] || '.txt';
};

interface UserProfile {
  name: string;
  email: string;
}

interface SavedFile {
  name: string;
  s3Key: string;
  language: string;
  createdAt: string;
}

interface ToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | '';
}

export const LanguageSelection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastProps>({ visible: false, message: '', type: '' });
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);
  const [joinSessionId, setJoinSessionId] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLanguage, setJoinLanguage] = useState('javascript');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/user/profile`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setProfile(response.data.user);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/files/list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSavedFiles(response.data.files || []);
      } catch (error: any) {
        console.error('Failed to fetch files:', error.response || error);
        setSavedFiles([]);
      }
    };

    fetchFiles();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.get(`${BASE_URL}/user/logout`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNewFile = async (languageId: string) => {
    setIsCreatingFile(true);
    try {
      const fileName = `new-file-${Date.now()}${getFileExtension(languageId)}`;
      const response = await axios.post(`${BASE_URL}/files/save`, {
        content: ' ',
        filename: fileName,
        language: languageId
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.fileId) {
        navigate(`/editor/${languageId}?file=${encodeURIComponent(response.data.fileId)}`);
      } else {
        console.error('No fileId returned from server');
      }
    } catch (error) {
      console.error('Failed to create new file:', error);
    } finally {
      setIsCreatingFile(false);
      setIsDropdownOpen(false);
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (isDeletingFile) return;

    // Show confirmation dialog
    setConfirmDelete(fileId);
  };

  const confirmFileDeletion = async (fileId: string) => {
    setIsDeletingFile(fileId);
    try {
      await axios.delete(`${BASE_URL}/files/${encodeURIComponent(fileId)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Update files list
      setSavedFiles(files => files.filter(f => f.s3Key !== fileId));
      
      // Show success toast
      setToast({
        visible: true,
        message: 'File deleted successfully',
        type: 'success'
      });
      
      setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
    } catch (error) {
      console.error('Failed to delete file:', error);
      setToast({
        visible: true,
        message: 'Failed to delete file',
        type: 'error'
      });
      setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
    } finally {
      setIsDeletingFile(null);
      setConfirmDelete(null);
    }
  };

  const cancelFileDeletion = () => {
    setConfirmDelete(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleCreateCollabSession = (languageId: string) => {
    const sessionId = uuidv4(); // Generate unique session ID
    
    // Ensure we only have the sessionId in the URL, not any extra URL parts
    const cleanSessionId = sessionId.trim().replace(/[^a-zA-Z0-9-]/g, '');
    
    // Log the generated session URL for debugging
    console.log(`Creating collab session with URL: /collab/${languageId}/${cleanSessionId}`);
    
    // Navigate to the properly formatted URL
    navigate(`/collab/${languageId}/${cleanSessionId}`);
  };

  // Add this helper function to normalize session IDs
  const normalizeSessionId = (id: string): string => {
    // Remove any spaces or special characters that might cause issues
    return id.trim().replace(/[^a-zA-Z0-9-]/g, '');
  };

  // Then update the handleJoinSession function
  const handleJoinSession = () => {
    const normalizedId = normalizeSessionId(joinSessionId);
    
    if (!normalizedId) {
      setToast({
        visible: true,
        message: 'Please enter a valid Session ID',
        type: 'error'
      });
      setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
      return;
    }
    
    // Navigate with the normalized ID
    navigate(`/collab/${joinLanguage}/${normalizedId}`);
    setShowJoinModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

      {/* Toast notification */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div 
            className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative">
        {/* Navbar */}
        <nav className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Code2 className="w-7 h-7 text-indigo-400" />
              <span className="text-lg font-medium text-gray-200">
                Welcome back, <span className="text-indigo-400">{profile?.name || 'Developer'}</span>
              </span>
            </motion.div>
            
            <motion.button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-all flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </motion.button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header Section */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Choose Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Programming Language</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Select a language to start coding. Each environment comes pre-configured with all the tools you need.
            </p>
          </motion.div>

          {/* Move Live Collaboration Section to the top */}
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-6 h-6 text-indigo-500" />
              <h2 className="text-2xl font-bold text-gray-100">Live Collaboration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create New Session Card */}
              <motion.div
                className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/30 overflow-hidden"
                whileHover={{ y: -5, boxShadow: "0 10px 30px -15px rgba(0,0,0,0.2)" }}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">
                    Create New Collaboration
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Start a new collaborative coding session and invite others to join.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {languages.map((lang) => (
                      <motion.button
                        key={lang.id}
                        onClick={() => handleCreateCollabSession(lang.id)}
                        className={`p-4 rounded-lg border ${lang.border} bg-gradient-to-br ${lang.gradient} flex flex-col items-center justify-center gap-2 hover:opacity-90`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="text-2xl">{lang.icon}</span>
                        <span className={`text-sm font-medium ${lang.color}`}>{lang.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
              
              {/* Join Existing Session Card */}
              <motion.div
                className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700/30 overflow-hidden"
                whileHover={{ y: -5, boxShadow: "0 10px 30px -15px rgba(0,0,0,0.2)" }}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">
                    Join Existing Session
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Enter a session ID to join an existing collaborative coding session.
                  </p>
                  
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Join Session</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Language Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {languages.map((lang, index) => (
              <motion.button
                key={lang.id}
                onClick={() => handleNewFile(lang.id)}
                className={`relative group bg-gradient-to-br ${lang.gradient} backdrop-blur-sm rounded-xl border ${lang.border} ${lang.hoverBorder} p-6 text-left transition-all duration-300`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${lang.iconBg}`}>
                    <span className="text-3xl">{lang.icon}</span>
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${lang.color} mb-2`}>
                      {lang.name}
                    </h3>
                    <p className="text-gray-400 text-sm">{lang.description}</p>
                  </div>
                </div>
                {lang.popular && (
                  <div className="absolute top-4 right-4 px-2 py-1 bg-indigo-500/20 rounded-full text-xs font-medium text-indigo-400 flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Popular
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Files Section */}
          <motion.div 
            className="mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
                <Book className="w-6 h-6 text-indigo-400" />
                Your Code Files
              </h2>
              <div className="relative w-full sm:w-auto">
                <motion.button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isCreatingFile}
                  className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg transition-all"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isCreatingFile ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>New File</span>
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </motion.button>

                <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div 
                      className="absolute right-0 mt-2 w-full sm:w-56 bg-gray-800 border border-gray-700/60 rounded-lg shadow-xl z-50 overflow-hidden"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                    {languages.map((lang) => (
                        <motion.button
                        key={lang.id}
                        onClick={() => handleNewFile(lang.id)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-700/60 text-gray-200 transition-colors"
                          whileHover={{ backgroundColor: 'rgba(79, 84, 92, 0.6)' }}
                          onHoverStart={() => setHoveredLanguage(lang.id)}
                          onHoverEnd={() => setHoveredLanguage(null)}
                      >
                        <span className={`text-xl ${lang.color}`}>{lang.icon}</span>
                        <span className="text-sm">{lang.name}</span>
                          {hoveredLanguage === lang.id && (
                            <motion.span
                              className="ml-auto text-indigo-400"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Plus className="w-4 h-4" />
                            </motion.span>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {savedFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedFiles.map((file) => (
                  <motion.div 
                    key={file.s3Key}
                    className="group relative bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:border-indigo-400/30 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <button
                      onClick={() => navigate(`/editor/${file.language}?file=${file.s3Key}`)}
                      className="w-full flex items-start gap-3 p-4 bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-700/30 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
                    >
                      <Folder className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 mb-1 truncate">
                          {file.name.replace(/\.[^/.]+$/, "")}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <p className="text-gray-400">
                            {formatDate(file.createdAt)}
                          </p>
                          <span className="px-2 py-1 rounded-full bg-gray-700/70 text-gray-300 capitalize">
                            {file.language}
                          </span>
                        </div>
                      </div>
                    </button>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteFile(e, file.s3Key)}
                      disabled={isDeletingFile === file.s3Key}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete file"
                    >
                      {isDeletingFile === file.s3Key ? (
                        <motion.span 
                          className="inline-block" 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          ⌛
                        </motion.span>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    
                    {/* Confirmation dialog */}
                    <AnimatePresence>
                      {confirmDelete === file.s3Key && (
                        <motion.div 
                          className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <motion.div 
                            className="bg-gray-800 p-4 rounded-lg shadow-lg max-w-[90%] text-center"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                          >
                            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                            <p className="text-gray-200 mb-4">Are you sure you want to delete this file?</p>
                            <div className="flex gap-2 justify-center">
                              <motion.button
                                onClick={() => confirmFileDeletion(file.s3Key)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Delete
                              </motion.button>
                              <motion.button
                                onClick={cancelFileDeletion}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Cancel
                              </motion.button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                className="text-center p-12 bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Folder className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-6">No saved files yet</p>
                <motion.button
                  onClick={() => setIsDropdownOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FilePlus className="w-5 h-5" />
                  <span>Create Your First File</span>
                </motion.button>
              </motion.div>
            )}
          </motion.div>

          {/* Join Session Modal */}
          <AnimatePresence>
            {showJoinModal && (
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowJoinModal(false)}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      Join Collaboration Session
                    </h3>
                    <button
                      onClick={() => setShowJoinModal(false)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Session ID
                        </label>
                        <input
                          type="text"
                          value={joinSessionId}
                          onChange={(e) => setJoinSessionId(e.target.value)}
                          placeholder="Paste the session ID here"
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Programming Language
                        </label>
                        <select
                          value={joinLanguage}
                          onChange={(e) => setJoinLanguage(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          {languages.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={() => setShowJoinModal(false)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <motion.button
                        onClick={handleJoinSession}
                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!joinSessionId.trim()}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Join Session</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;