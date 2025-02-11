import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, Download, Share2, Sun, Moon, Files, Home } from 'lucide-react';
import { Button } from '../components/Button';

const defaultCode = {
  javascript: 'console.log("Hello, World!");',
  python: 'print("Hello, World!")',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}'
};

export const CodeEditor: React.FC = () => {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput('Running code...');
    // Simulate code execution
    setTimeout(() => {
      setOutput('Hello, World!\nProgram completed successfully.');
      setIsRunning(false);
    }, 1500);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth')}
              className={`flex items-center gap-2 ${isDarkMode ? 'border-gray-700 text-gray-300' : ''}`}
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
            <div className="flex items-center space-x-4">
              <Files className={`w-6 h-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} />
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                main.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'java'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={isDarkMode ? 'border-gray-700 text-gray-300' : ''}
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={isDarkMode ? 'border-gray-700 text-gray-300' : ''}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={isDarkMode ? 'border-gray-700 text-gray-300' : ''}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-4 p-4 max-w-screen-2xl mx-auto">
        {/* Editor */}
        <div className={`rounded-lg overflow-hidden border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <Editor
            height="70vh"
            defaultLanguage={language}
            defaultValue={defaultCode[language as keyof typeof defaultCode]}
            theme={isDarkMode ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 16 },
            }}
          />
        </div>

        {/* Console */}
        <div className={`flex flex-col rounded-lg border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Console Output
            </span>
            <Button
              onClick={handleRunCode}
              isLoading={isRunning}
              size="sm"
            >
              <Play className="w-4 h-4 mr-1" />
              Run Code
            </Button>
          </div>
          <div className={`flex-1 p-4 font-mono text-sm whitespace-pre-wrap ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {output || 'Click "Run Code" to see the output'}
          </div>
        </div>
      </div>
    </div>
  );
};