import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Code2, 
  Terminal, 
  Users, 
  Zap, 
  Brain, 
  Laptop, 
  Sparkles, 
  BookOpen,
  Globe,
  ArrowRight,
  FolderOpen,
  Save,
  Clock,
  Lightbulb,
  Code,
  RotateCw,
  PlayCircle
} from "lucide-react";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/select-language");
  }, [navigate]);

  // Main features of your platform
  const mainFeatures = [
    {
      icon: <Users className="w-8 h-8 text-indigo-500" />,
      title: "Live Collaboration",
      description: "Code together in real-time with anyone, anywhere. See changes instantly as collaborators type."
    },
    {
      icon: <Globe className="w-8 h-8 text-cyan-500" />,
      title: "Multi-Language Support",
      description: "JavaScript, Python, and Java environments ready to use with no setup required."
    },
    {
      icon: <Brain className="w-8 h-8 text-purple-500" />,
      title: "AI-Powered Assistance",
      description: "Get intelligent code suggestions, explanations, and improvements using built-in AI features."
    },
    {
      icon: <Terminal className="w-8 h-8 text-green-500" />,
      title: "Instant Code Execution",
      description: "Run your code directly in the browser and see results immediately in the console."
    }
  ];

  // Additional features
  const additionalFeatures = [
    {
      icon: <FolderOpen className="w-6 h-6 text-amber-500" />,
      title: "File Management",
      description: "Save, organize, and access your code files from anywhere. No local setup required."
    },
    {
      icon: <Save className="w-6 h-6 text-blue-500" />,
      title: "Auto-Save",
      description: "Never lose your work with automatic saving of your code as you type."
    },
    {
      icon: <Clock className="w-6 h-6 text-emerald-500" />,
      title: "Version History",
      description: "Access previous versions of your code to track changes and recover work."
    },
    {
      icon: <Lightbulb className="w-6 h-6 text-yellow-500" />,
      title: "Code Explanations",
      description: "Get AI-generated explanations of any code block to aid learning and understanding."
    },
    {
      icon: <Code className="w-6 h-6 text-pink-500" />,
      title: "Syntax Highlighting",
      description: "Enhanced readability with language-specific syntax highlighting for all supported languages."
    },
    {
      icon: <RotateCw className="w-6 h-6 text-teal-500" />,
      title: "Cross-Platform",
      description: "Code from any device with a browser - desktop, tablet, or mobile."
    },
    {
      icon: <PlayCircle className="w-6 h-6 text-red-500" />,
      title: "One-Click Run",
      description: "Execute your code instantly without any configuration or setup."
    },
    {
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      title: "Fast Performance",
      description: "Optimized for speed with real-time code execution and minimal latency."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

        {/* Hero Section */}
      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
                Collaborative Coding Platform
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Code together in real-time, execute instantly, and get AI-powered suggestions across JavaScript, Python, and Java.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => navigate("/signup")}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started Free
                </motion.button>
                <motion.button
                  onClick={() => navigate("/signin")}
                  className="px-8 py-4 rounded-xl border border-gray-600 hover:border-gray-400 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white font-medium text-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign In
                </motion.button>
              </div>
            </motion.div>
          </div>
          
          {/* Code Preview */}
          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="rounded-xl overflow-hidden border border-gray-700 shadow-2xl bg-gray-900">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-sm font-mono bg-gray-700 px-3 py-1 rounded-md text-gray-300 flex-1 text-center">
                  Collaborative JavaScript
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-400">2 online</span>
                </div>
              </div>
              <div className="p-6 font-mono text-sm text-gray-300">
                <pre className="leading-loose">
                  <span className="text-blue-400">const</span> <span className="text-green-400">greeting</span> = <span className="text-yellow-300">"Hello, World!"</span>;
                  <br/>
                  <br/>
                  <span className="text-blue-400">function</span> <span className="text-purple-400">displayMessage</span>() {'{'} 
                  <br/>
                  {'  '}<span className="text-blue-400">const</span> <span className="text-green-400">element</span> = <span className="text-cyan-400">document</span>.<span className="text-purple-400">getElementById</span>(<span className="text-yellow-300">"app"</span>);
                  <br/>
                  {'  '}<span className="text-green-400">element</span>.<span className="text-purple-400">innerHTML</span> = <span className="text-green-400">greeting</span>;
                  <br/>
                  {'  '}<span className="text-cyan-400">console</span>.<span className="text-purple-400">log</span>(<span className="text-yellow-300">"Message displayed!"</span>);
                  <br/>
                  {'}'}
                  <br/>
                  <br/>
                  <span className="text-gray-500">// Call the function</span>
                  <br/>
                  <span className="text-purple-400">displayMessage</span>();
                </pre>
              </div>
              <div className="bg-gray-800 border-t border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Output:</span>
                  <span className="text-xs font-medium bg-green-900/30 text-green-400 px-2 py-0.5 rounded">Running...</span>
                </div>
                <div className="mt-2 text-sm text-gray-300 font-mono">
                  <span className="text-gray-400">{'>'}</span> Message displayed!
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Main Features Section */}
        <div className="mt-24">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Key Features
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl p-6 hover:bg-gray-700/50 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 * (index + 3) }}
                whileHover={{ y: -8 }}
              >
                <div className="mb-4 bg-gray-900 w-16 h-16 rounded-lg flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* File Storage Section */}
        <motion.div 
          className="mt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 order-2 md:order-1">
              <div className="bg-gray-800/50 backdrop-blur-lg border border-gray-700 rounded-xl overflow-hidden shadow-xl">
                <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-yellow-500" />
                    <span>My Files</span>
                  </h3>
                  <span className="text-sm text-gray-400">Recently Updated</span>
                </div>
                <div className="divide-y divide-gray-700">
                  <div className="px-6 py-4 hover:bg-gray-700/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code2 className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-medium">main.js</p>
                        <p className="text-xs text-gray-400">JavaScript • Updated 2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white">
                        <PlayCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white">
                        <Users className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-700/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code2 className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-medium">data_analysis.py</p>
                        <p className="text-xs text-gray-400">Python • Updated yesterday</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white">
                        <PlayCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white">
                        <Users className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 hover:bg-gray-700/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code2 className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="font-medium">App.java</p>
                        <p className="text-xs text-gray-400">Java • Updated 3 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white">
                        <PlayCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white">
                        <Users className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/80">
                  <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
                    <span>View all files</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-4">Secure File Storage & Management</h2>
              <p className="text-gray-300 mb-6">
                Store all your code files securely in the cloud and access them from anywhere. Our platform provides effortless file management, allowing you to:
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-indigo-900/30 p-1.5 rounded-md text-indigo-400">
                    <Save className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium">Save & Organize Files</span>
                    <p className="text-gray-400 text-sm mt-1">Create, save, and organize your code files by language and project.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-indigo-900/30 p-1.5 rounded-md text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium">Share & Collaborate</span>
                    <p className="text-gray-400 text-sm mt-1">Share your files with others for real-time collaborative editing.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-indigo-900/30 p-1.5 rounded-md text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium">Version Control</span>
                    <p className="text-gray-400 text-sm mt-1">Keep track of changes with integrated version history for all your files.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
        
        {/* Additional Features Grid */}
        <div className="mt-24">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            More Powerful Features
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-5 hover:bg-gray-700/30 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * (index + 10) }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-gray-900 p-2 rounded-md">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* AI Assistance Highlight */}
        <motion.div 
          className="mt-24 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 backdrop-blur-lg rounded-xl p-8 border border-purple-700/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="md:w-1/2">
              <h3 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">AI-Powered Coding</h3>
              <p className="text-gray-300 mb-6">
                Our platform integrates advanced AI capabilities to enhance your coding experience:
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="bg-purple-900/30 p-1.5 rounded-full text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Code completion and suggestions</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-purple-900/30 p-1.5 rounded-full text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Bug detection and fixes</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-purple-900/30 p-1.5 rounded-full text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Code explanation in plain language</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-purple-900/30 p-1.5 rounded-full text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Code optimization suggestions</span>
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 bg-gray-900 rounded-lg p-5 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h4 className="text-lg font-medium">AI Suggestion</h4>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300">
                <p className="text-yellow-300 mb-2">// This loop can be optimized using Array.forEach</p>
                <p className="text-red-400 line-through">for (let i = 0; i {'<'} items.length; i++) {'{'}</p>
                <p className="text-red-400 line-through">{'  '}console.log(items[i]);</p>
                <p className="text-red-400 line-through">{'}'}</p>
                <p className="text-green-400 mt-2">items.forEach(item {'=>'} {'{'}</p>
                <p className="text-green-400">{'  '}console.log(item);</p>
                <p className="text-green-400">{'}'}); </p>
                <p className="text-gray-400 mt-3 text-xs">Benefits: Cleaner syntax, better readability, and functional approach</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Live Collaboration CTA */}
        <motion.div 
          className="mt-24 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 backdrop-blur-lg rounded-xl p-8 border border-indigo-700/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Start Collaborating Now</h3>
              <p className="text-gray-300 max-w-xl">
                Experience the power of real-time collaborative coding with built-in AI assistance. Create a free account to get started.
              </p>
            </div>
            <motion.button
              onClick={() => navigate("/signup")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Try It Free</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
        
        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Collaborative Coding Platform. All rights reserved.</p>
        </footer>
        </div>
    </div>
  );
};

export default Home;
