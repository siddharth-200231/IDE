'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, ArrowLeft, ChevronRight, Terminal, LogOut } from 'lucide-react';
import axios from 'axios';
import { useUser } from '../context/userContext';

const languages = [
  {
    id: 'javascript',
    name: 'JavaScript',
    description: 'Modern web development',
    icon: '🟨',
    popular: true
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Data science & automation',
    icon: '🐍',
    popular: true
  },
  {
    id: 'java',
    name: 'Java',
    description: 'Enterprise development',
    icon: '☕',
    popular: false
  }
];

interface UserProfile {
  name: string;
  email: string;
  // Add other fields as needed
}

export const LanguageSelection: React.FC = () => {
  const navigate = useNavigate();
  const { user  } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:3000/user/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
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

  const handleLogout = async () => {
    try {
      await axios.get('http://localhost:3000/user/logout', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      delete axios.defaults.headers.common['Authorization'];
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />
      
      {/* Navbar with Logout */}
      <nav className="relative border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Code2 className="w-6 h-6 text-cyan-400" />
            <span className="text-xl text-gray-200">
              {isLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : (
                <>
                  Hello, <span className="font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-transparent bg-clip-text animate-gradient">
                    {profile?.name}
                  </span>
                </>
              )}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-cyan-500 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>

      {/* Welcome Section */}
      <div className="relative max-w-5xl mx-auto px-6 pt-32 pb-20 text-center">
        <h1 className="text-7xl font-bold animate-fade-in">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-transparent bg-clip-text animate-gradient">
            Welcome back,{' '}
          </span>
          <span className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 text-transparent bg-clip-text animate-gradient font-extrabold">
            {profile?.name}
          </span>
          <span className="text-cyan-400">✨</span>
        </h1>
        <p className="mt-6 text-xl text-gray-400 animate-fade-in-up">
          Ready to start coding? Choose your language below.
        </p>
      </div>

      {/* Languages Grid */}
      <div className="relative max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => navigate(`/editor/${lang.id}`)}
              className="group relative bg-gray-800/20 backdrop-blur-lg rounded-lg border border-gray-700/50 p-6 text-left transition-all duration-200 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl filter drop-shadow-lg">{lang.icon}</span>
                  <h2 className="text-lg font-medium text-gray-200">
                    {lang.name}
                  </h2>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-500 transition-colors" />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {lang.description}
              </p>
              {lang.popular && (
                <span className="absolute top-4 right-4 px-2 py-1 bg-cyan-500/10 rounded-full text-[10px] font-medium text-cyan-400">
                  Popular
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;