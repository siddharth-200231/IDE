import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import {
  Play,
  Download,
  Share2,
  Sun,
  Moon,
  Files,
  Home,
  Terminal,
  Loader2,
  Code2,
  ChevronDown,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../components/Button";
import { pythonLanguage, javaLanguage } from "../utils/languageConfigs";
import { pythonConfig, javaConfig } from "../utils/editorConfigs";
import {
  pythonCompletions,
  javaCompletions,
} from "../utils/languageCompletions";
import { io } from "socket.io-client";

const defaultCode = {
  javascript:
    '// Write your JavaScript code here\nconsole.log("Hello World!");',
  python: '# Write your Python code here\nprint("Hello World!")',
  java: '// Write your Java code here\nclass Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}',
};

const languages = [
  { id: "javascript", name: "JavaScript" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
];

const socket = io("http://localhost:3000");

export const CodeEditor: React.FC = () => {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const initialLang = languages.find(lang => lang.id === language);
    return initialLang || languages[0];
  });

  useEffect(() => {
    const currentLang = languages.find(lang => lang.id === language);
    if (currentLang) {
      setSelectedLanguage(currentLang);
      setCode(defaultCode[currentLang.id]);
    }
  }, [language]);

  const handleLanguageChange = (lang: (typeof languages)[0]) => {
    setSelectedLanguage(lang);
    setCode(defaultCode[lang.id]);
    setIsDropdownOpen(false);
    navigate(`/editor/${lang.id}`);
  };

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [code, setCode] = useState(defaultCode[selectedLanguage.id]);

  useEffect(() => {
    if (monaco) {
      monaco.languages.register({ id: "python" });
      monaco.languages.setMonarchTokensProvider("python", pythonConfig);
      monaco.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: () => ({
          suggestions: [
            ...pythonCompletions.keywords.map((keyword) => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
            })),
            ...pythonCompletions.builtins.map((builtin) => ({
              label: builtin,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: builtin,
            })),
            ...pythonCompletions.snippets,
          ],
        }),
      });

      monaco.languages.register({ id: "java" });
      monaco.languages.setMonarchTokensProvider("java", javaConfig);
      monaco.languages.registerCompletionItemProvider("java", {
        provideCompletionItems: () => ({
          suggestions: [
            ...javaCompletions.keywords.map((keyword) => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
            })),
            ...javaCompletions.builtins.map((builtin) => ({
              label: builtin,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: builtin,
            })),
            ...javaCompletions.snippets,
          ],
        }),
      });
    }
  }, [monaco]);

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput("");
    socket.emit("execute_code", {
      language: selectedLanguage.id,
      code,
    });
  };

  useEffect(() => {
    socket.on("execution_status", (status) => {
      setOutput((prev) => `${prev}${status}\n`);
    });

    socket.on("code_output", (output) => {
      setOutput((prev) => `${prev}${output}`);
    });

    socket.on("execution_error", (error) => {
      setOutput((prev) => `${prev}\n\n\x1b[31mError: ${error}\x1b[0m`);
      setIsRunning(false);
    });

    socket.on("execution_complete", () => {
      setIsRunning(false);
    });

    return () => {
      socket.off("execution_status");
      socket.off("code_output");
      socket.off("execution_error");
      socket.off("execution_complete");
    };
  }, []);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="relative h-screen flex flex-col">
          {/* Enhanced Glassmorphic Navbar */}
          <nav className="sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/select-language")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all"
                >
                  <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Home
                  </span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all"
                  >
                    <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {selectedLanguage.name}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                      {languages.map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => handleLanguageChange(lang)}
                          className={`flex items-center w-full px-4 py-3 text-sm font-medium ${
                            lang.id === selectedLanguage.id
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                          } transition-colors`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm text-gray-600 dark:text-gray-300"
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </Button>
                <Button
                  onClick={handleRunCode}
                  isLoading={isRunning}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run Code</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </nav>

          {/* Main Editor Layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
            {/* Editor Panel */}
            <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {selectedLanguage.name}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={selectedLanguage.id}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  theme={isDarkMode ? "vs-dark" : "light"}
                  options={{
                    fontSize: 14,
                    fontFamily: "JetBrains Mono, monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 16 },
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: true,
                    automaticLayout: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: "on",
                    quickSuggestions: true,
                    snippetSuggestions: "top",
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                    folding: true,
                    lineDecorationsWidth: 10,
                    renderLineHighlight: "all",
                    scrollbar: {
                      vertical: "hidden",
                      horizontal: "hidden",
                      handleMouseWheel: true,
                    },
                  }}
                  onMount={(editor) => {
                    editor.focus();
                    if (selectedLanguage.id === "python") {
                      monaco.languages.setLanguageConfiguration(
                        "python",
                        pythonConfig
                      );
                    } else if (selectedLanguage.id === "java") {
                      monaco.languages.setLanguageConfiguration("java", javaConfig);
                    }
                  }}
                />
              </div>
            </div>

            {/* Console Output */}
            <div className="lg:w-[420px] flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Console Output
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setOutput("")}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-50/50 dark:bg-gray-900/20">
                {output ? (
                  <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {output.split("\n").map((line, i) => {
                      const isError = line.includes("Error:");
                      return (
                        <div key={i} className="flex items-start gap-2">
                          {isRunning ? (
                            <Loader2 className="w-4 h-4 mt-1 flex-shrink-0 animate-spin text-gray-400" />
                          ) : isError ? (
                            <XCircle className="w-4 h-4 mt-1 flex-shrink-0 text-red-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mt-1 flex-shrink-0 text-green-500" />
                          )}
                          <code
                            className={`flex-1 ${isError ? "text-red-500 dark:text-red-400" : ""}`}
                          >
                            {line}
                          </code>
                        </div>
                      );
                    })}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                    Your program output will appear here...
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