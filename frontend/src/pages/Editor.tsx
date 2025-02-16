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
  
  // 2. Find the matching language from URL parameter
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const initialLang = languages.find(lang => lang.id === language);
    return initialLang || languages[0];
  });

  // 3. Update code when language changes from URL
  useEffect(() => {
    const currentLang = languages.find(lang => lang.id === language);
    if (currentLang) {
      setSelectedLanguage(currentLang);
      setCode(defaultCode[currentLang.id]);
    }
  }, [language]);

  // 4. Update URL when language changes from dropdown
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative h-[100dvh] flex flex-col">
        {/* Enhanced Navbar */}
        <nav className="sticky top-0 z-50 border-b border-cyan-500/20 backdrop-blur-xl bg-gray-900/80">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/select-language")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-cyan-500/10 transition-all group"
              >
                <Home className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                <span className="text-sm font-medium text-cyan-400 group-hover:text-cyan-300">
                  Home
                </span>
              </button>

              <div className="relative z-50">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/70 border border-cyan-500/20 hover:border-cyan-400/40 transition-all"
                >
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-semibold text-gray-200">
                    {selectedLanguage.name}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-cyan-400 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-gray-800 border border-cyan-500/20 shadow-2xl z-50 overflow-hidden">
                      {languages.map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => handleLanguageChange(lang)}
                          className={`flex items-center w-full px-4 py-3 text-sm font-medium ${
                            lang.id === selectedLanguage.id
                              ? "bg-cyan-500/10 text-cyan-400"
                              : "text-gray-300 hover:bg-cyan-500/5"
                          } transition-colors`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleRunCode}
                isLoading={isRunning}
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-gray-900 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-cyan-500/20 transition-all"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </nav>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 h-[calc(100dvh-76px)] overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 min-h-[40vh] lg:min-h-0 rounded-2xl border border-cyan-500/20 bg-gray-900/50 overflow-hidden shadow-xl shadow-cyan-500/10">
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

          {/* Console Output */}
          <div className="flex-none lg:w-[400px] h-[40vh] lg:h-auto rounded-2xl border border-cyan-500/20 bg-gray-900/50 shadow-xl shadow-cyan-500/10 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="border-b border-cyan-500/20 px-6 py-3 bg-gray-900/50">
                <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Console Output
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-900/30">
                {output ? (
                  <pre className="text-gray-300 whitespace-pre-wrap break-words">
                    {output.split("\n").map((line, i) => (
                      <code
                        key={i}
                        className={`block ${
                          line.startsWith("Error:") ? "text-red-400" : ""
                        }`}
                      >
                        {line}
                      </code>
                    ))}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    Click "Run Code" to see the output here
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
