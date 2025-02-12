import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Play, Download, Share2, Sun, Moon, Files, Home, Terminal, Loader2, Code2, ChevronDown } from 'lucide-react';
import { Button } from '../components/Button';
import { pythonLanguage, javaLanguage } from '../utils/languageConfigs';
import { pythonConfig, javaConfig } from '../utils/editorConfigs';
import { pythonCompletions, javaCompletions } from '../utils/languageCompletions';

// Add default code for each language
const defaultCode = {
  javascript: '// Write your JavaScript code here\nconsole.log("Hello World!");',
  python: '# Write your Python code here\nprint("Hello World!")',
  java: '// Write your Java code here\nclass Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}'
};

const languages = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' }
];

export const CodeEditor: React.FC = () => {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [code, setCode] = useState(defaultCode[selectedLanguage.id]);

  // Update code when language changes
  const handleLanguageChange = (lang: typeof languages[0]) => {
    setSelectedLanguage(lang);
    setCode(defaultCode[lang.id]);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    if (monaco) {
      // Python Configuration
      monaco.languages.register({ id: 'python' });
      monaco.languages.setMonarchTokensProvider('python', pythonConfig);
      monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: () => ({
          suggestions: [
            ...pythonCompletions.keywords.map(keyword => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword
            })),
            ...pythonCompletions.builtins.map(builtin => ({
              label: builtin,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: builtin
            })),
            ...pythonCompletions.snippets
          ]
        })
      });

      // Java Configuration
      monaco.languages.register({ id: 'java' });
      monaco.languages.setMonarchTokensProvider('java', javaConfig);
      monaco.languages.registerCompletionItemProvider('java', {
        provideCompletionItems: () => ({
          suggestions: [
            ...javaCompletions.keywords.map(keyword => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword
            })),
            ...javaCompletions.builtins.map(builtin => ({
              label: builtin,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: builtin
            })),
            ...javaCompletions.snippets
          ]
        })
      });
    }
  }, [monaco]);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />

      <div className="relative h-[100dvh] flex flex-col">
        {/* Header/Navbar */}
        <nav className="sticky top-0 z-50 border-b border-gray-800/60 backdrop-blur-md bg-gray-900/50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="w-5 h-5 text-cyan-400" />
              <div className="relative z-[60]"> {/* Increased z-index */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-all"
                >
                  <span className="text-sm font-medium text-gray-200">{selectedLanguage.name}</span>
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`} 
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-48 rounded-lg bg-gray-800 border border-gray-700/50 shadow-xl z-50">
                      {languages.map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => handleLanguageChange(lang)}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleRunCode} isLoading={isRunning}
                className="bg-cyan-500 hover:bg-cyan-400 text-xs md:text-sm text-gray-900 px-3 py-1.5">
                {isRunning ? 'Running...' : 'Run Code'}
              </Button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 h-[calc(100dvh-64px)] overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 min-h-[40vh] lg:min-h-0 rounded-xl border border-gray-800/60 overflow-hidden">
            <div className="h-full">
              <Editor
                height="100%"
                language={selectedLanguage.id}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme={isDarkMode ? 'vs-dark' : 'light'}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: true,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  quickSuggestions: true,
                  snippetSuggestions: "top"
                }}
                onMount={(editor, monaco) => {
                  // Set up language-specific features
                  if (selectedLanguage.id === 'python') {
                    monaco.languages.setLanguageConfiguration('python', pythonConfig);
                  } else if (selectedLanguage.id === 'java') {
                    monaco.languages.setLanguageConfiguration('java', javaConfig);
                  }
                }}
              />
            </div>
          </div>

          {/* Console Panel */}
          <div className="flex-none lg:w-[400px] h-[40vh] lg:h-auto rounded-xl border border-gray-800/60 overflow-hidden">
            <div className="h-full flex flex-col bg-gray-900/50">
              <div className="border-b border-gray-800/60 px-4 py-2 backdrop-blur-sm">
                <span className="text-sm font-medium text-gray-300">Output</span>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                {output ? (
                  <pre className="text-gray-300 whitespace-pre-wrap">{output}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Run code to see output
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};