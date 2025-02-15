'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, LogOut, Flame } from 'lucide-react';
import axios from 'axios';
import { useUser } from '../context/userContext';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
// ...or if using Material-UI
// import ChevronRight from '@mui/icons-material/ChevronRight';

const languages = [
  {
    id: 'javascript',
    name: 'JavaScript',
    description: 'Modern web development with ES6+ features',
    icon: '🟨',
    popular: true,
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Data science & machine learning',
    icon: '🐍',
    popular: true,
  },
  {
    id: 'java',
    name: 'Java',
    description: 'Enterprise-scale applications',
    icon: '☕',
    popular: false,
  },
];

interface UserProfile {
  name: string;
  email: string;
}

export const LanguageSelection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:3000/user/profile', {
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

  const handleLogout = async () => {
    try {
      await axios.get('http://localhost:3000/user/logout', {
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

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-gray-900/60">
        <div className="absolute inset-0 bg-[url(/grid.svg)] bg-center [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-10" />
      </div>

      {/* Navbar */}
      <nav className="relative border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Code2 className="w-7 h-7 text-indigo-400" />
            <span className="text-lg text-gray-200">
              {isLoading ? (
                <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
              ) : (
                <span className="font-medium">
                  Welcome back,{' '}
                  <span className="text-indigo-400">{profile?.name}</span>
                </span>
              )}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/40 backdrop-blur-sm rounded-lg text-gray-300 hover:text-indigo-300 transition-all duration-200 flex items-center gap-2 group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-gray-100 mb-6 animate-slide-up">
            Start{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Coding
            </span>
          </h1>
          <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto animate-fade-in">
            Select your preferred programming language to begin crafting your next masterpiece.
          </p>
        </div>

        {/* Language Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => navigate(`/editor/${lang.id}`)}
              className="group relative bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/20 p-6 text-left transition-all duration-300 hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl filter drop-shadow-lg">{lang.icon}</span>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-gray-100">{lang.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">{lang.description}</p>
                  </div>
                </div>
                <ChevronRightIcon className="w-6 h-6 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </div>

              {lang.popular && (
                <div className="absolute top-4 right-4 flex items-center space-x-1 px-3 py-1 bg-indigo-400/10 rounded-full text-xs font-medium text-indigo-400">
                  <Flame className="w-4 h-4" />
                  <span>Trending</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ambient Elements */}
      <div className="absolute top-1/3 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -z-10" />
    </div>
  );
};

export default LanguageSelection;