'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, LogOut, Flame, Folder, FilePlus, Book, Plus, ChevronDown, Trash2, Check, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import { useUser } from '../context/userContext';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { BASE_URL, API_ENDPOINTS } from "../api";

const languages = [
  {
    id: 'javascript',
    name: 'JavaScript',
    description: 'Modern web development with ES6+ features',
    icon: '🟨',
    popular: true,
    color: 'text-yellow-400',
    gradient: 'from-yellow-400/20 to-orange-500/20',
    border: 'border-yellow-400/30'
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Data science & machine learning',
    icon: '🐍',
    popular: true,
    color: 'text-emerald-400',
    gradient: 'from-emerald-400/20 to-teal-500/20',
    border: 'border-emerald-400/30'
  },
  {
    id: 'java',
    name: 'Java',
    description: 'Enterprise-scale applications',
    icon: '☕',
    popular: false,
    color: 'text-red-400',
    gradient: 'from-red-400/20 to-orange-500/20',
    border: 'border-red-400/30'
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

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-gray-900/60">
        <div className="absolute inset-0 bg-[url(/grid.svg)] bg-center [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-10" />
      </div>

      {/* Interactive gradient circles */}
      <motion.div 
        className="absolute top-1/3 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -z-10"
        initial={{ x: -100, opacity: 0.5 }}
        animate={{ 
          x: 0, 
          opacity: 0.7,
          scale: [1, 1.05, 1],
          transition: { 
            duration: 3, 
            repeat: Infinity, 
            repeatType: "reverse" 
          } 
        }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -z-10"
        initial={{ y: 100, opacity: 0.5 }}
        animate={{ 
          y: 0, 
          opacity: 0.7,
          scale: [1, 1.1, 1],
          transition: { 
            duration: 4, 
            repeat: Infinity, 
            repeatType: "reverse",
            delay: 1
          } 
        }}
      />

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

      {/* Navbar */}
      <nav className="relative border-b border-gray-700/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Code2 className="w-7 h-7 text-indigo-400" />
            <span className="text-lg text-gray-200">
              {isLoading ? (
                <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
              ) : (
                <motion.span 
                  className="font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Welcome back,{' '}
                  <span className="text-indigo-400">{profile?.name || 'Developer'}</span>
                </motion.span>
              )}
            </span>
          </motion.div>
          <motion.button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/40 backdrop-blur-sm rounded-lg text-gray-300 hover:text-indigo-300 transition-all duration-200 flex items-center gap-2 group"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Sign out
          </motion.button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 mb-6">
            Start{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Coding
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 font-light max-w-2xl mx-auto">
            Select your preferred programming language to begin crafting your next masterpiece.
          </p>
        </motion.div>

        {/* Files Section */}
        <motion.div 
          className="mb-20"
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

        {/* Language Cards Grid */}
        <motion.div 
          className="mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-gray-100 mb-8 flex items-center gap-2">
            <Code2 className="w-6 h-6 text-indigo-400" />
            Available Languages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {languages.map((lang) => (
              <motion.button
                key={lang.id}
                onClick={() => handleNewFile(lang.id)}
                className={`group relative bg-gradient-to-br ${lang.gradient} backdrop-blur-xl rounded-xl border ${lang.border} p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-${lang.color}/10`}
                whileHover={{ 
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <motion.span 
                      className={`text-3xl mt-1 filter drop-shadow-lg ${lang.color}`}
                      whileHover={{ scale: 1.2, rotate: [0, -10, 10, -10, 0] }}
                    >
                      {lang.icon}
                    </motion.span>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-100">{lang.name}</h3>
                      <p className="text-sm text-gray-400 mt-2">{lang.description}</p>
                    </div>
                  </div>
                  <motion.div
                    className="w-6 h-6 text-gray-500 group-hover:text-indigo-400 transition-all flex-shrink-0"
                    whileHover={{ x: 3 }}
                  >
                    <ChevronRightIcon />
                  </motion.div>
                </div>
                
                {lang.popular && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-indigo-400/10 rounded-full text-xs font-medium text-indigo-400">
                    <Flame className="w-4 h-4" />
                    <span>Trending</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LanguageSelection;