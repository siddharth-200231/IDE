'use client';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, ArrowLeft, ChevronRight, Terminal } from 'lucide-react';

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

export const LanguageSelection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />
      
      <nav className="sticky top-0 z-10 backdrop-blur-md bg-gray-950/80 border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-400 hover:text-cyan-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          <Terminal className="w-5 h-5 text-gray-500" />
        </div>
      </nav>

      <main className="relative max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gray-800/30 border border-gray-700/50 mb-6">
            <Code2 className="w-8 h-8 text-cyan-500" />
          </div>
          <h1 className="text-3xl font-medium text-gray-100 mb-3">
            Choose your language
          </h1>
          <p className="text-gray-400 max-w-md mx-auto">
            Select a programming language to begin your coding journey
          </p>
        </div>

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
      </main>
    </div>
  );
};

export default LanguageSelection;