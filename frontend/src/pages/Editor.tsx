import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Copy,
  Check,
  Save,
  FolderOpen,
  ChevronRight,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "../components/Button";
import { pythonLanguage, javaLanguage } from "../utils/languageConfigs";
import { pythonConfig, javaConfig } from "../utils/editorConfigs";
import {
  pythonCompletions,
  javaCompletions,
} from "../utils/languageCompletions";
import { io } from "socket.io-client";
import { BASE_URL, API_ENDPOINTS } from "../api";
import { Chatbot } from "../components/Chatbot";
import axios from "axios";
import { motion, AnimatePresence } from 'framer-motion';

const defaultCode: Record<string, string> = {
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

const socket = io(BASE_URL);

export const CodeEditor: React.FC = () => {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const initialLang = languages.find((lang) => lang.id === language);
    return initialLang || languages[0];
  });

  useEffect(() => {
    const currentLang = languages.find((lang) => lang.id === language);
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
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileId = searchParams.get("file");
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [userFiles, setUserFiles] = useState<Array<{name: string; s3Key: string; language: string; createdAt: string}>>([]);
  const [isFilesDropdownOpen, setIsFilesDropdownOpen] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [codePrompt, setCodePrompt] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [editorRef, setEditorRef] = useState<any>(null);

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

  useEffect(() => {
    const loadFile = async () => {
      if (!fileId) return;
      
      setIsLoadingFile(true);
      setIsFileLoaded(false);
      
      try {
        const response = await axios.get(`${BASE_URL}/files/${encodeURIComponent(fileId)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setCode(response.data.content);
        setFileName(response.data.file.name);
        setIsFileLoaded(true);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.warn("File not found. Treating as a new file.");
          // Mark as loaded to prevent repeated requests
          setIsFileLoaded(true);
        } else {
          console.error("Failed to load file:", error);
        }
      } finally {
        setIsLoadingFile(false);
      }
    };

    loadFile();
  }, [fileId]);

  useEffect(() => {
    const fetchUserFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.FILES.LIST}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        
        if (response.data && Array.isArray(response.data.files)) {
          setUserFiles(response.data.files);
        }
      } catch (error) {
        console.error("Failed to fetch user files:", error);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchUserFiles();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const name =
        fileName ||
        `untitled-${Date.now()}.${
          selectedLanguage.id === "javascript"
            ? "js"
            : selectedLanguage.id === "python"
            ? "py"
            : "java"
        }`;

      const response = await axios.post(
        `${BASE_URL}/files/save`,
        {
          content: code, // The current code in editor
          filename: name,
          language: selectedLanguage.id,
          fileId: searchParams.get("file"), // Use searchParams directly to get fileId
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Set filename and fileId after successful save
      setFileName(name);
      if (!searchParams.get("file") && response.data.fileId) {
        navigate(`/editor/${selectedLanguage.id}?file=${response.data.fileId}`);
      }

      const filesResponse = await axios.get(`${BASE_URL}${API_ENDPOINTS.FILES.LIST}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (filesResponse.data && Array.isArray(filesResponse.data.files)) {
        setUserFiles(filesResponse.data.files);
      }

      console.log("Save successful:", response.data);
    } catch (error) {
      console.error("Failed to save file:", error);
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleGenerateCode = async () => {
    if (!codePrompt.trim() || !editorRef) return;
    
    setIsGeneratingCode(true);
    setOutput("⏳ Generating code from your description...");
    
    try {
      // Get the API key from the Chatbot component
      const API_KEY = "AIzaSyClNi8sXsBRlg7uJx6qXV5mOJ-bfWjHZvA";
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate ${selectedLanguage.name} code for the following task. Only provide the code without explanations or markdown formatting:\n\n${codePrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        }),
      });
      
      if (!response.ok) throw new Error("Failed to generate code");
      
      const data = await response.json();
      let generatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Clean the generated code by removing markdown code blocks if present
      generatedCode = generatedCode
        .replace(/```[\w]*\n/g, '')   // Remove starting code fence
        .replace(/```$/g, '')          // Remove ending code fence
        .trim();
      
      // Insert the generated code at the cursor position or append to existing code
      const model = editorRef.getModel();
      const position = editorRef.getPosition();
      
      editorRef.executeEdits("generate-code", [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: generatedCode,
        forceMoveMarkers: true
      }]);
      
      setOutput(`✅ Generated code inserted successfully!\n\nPrompt: "${codePrompt}"\n\nGenerated code:\n\n${generatedCode}`);
      
      // Close the modal and reset the prompt
      setIsGenerateModalOpen(false);
      setCodePrompt("");
    } catch (error) {
      console.error("Code generation error:", error);
      setOutput("❌ Error generating code. Please try again.");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0F172A] dark:to-[#1E293B]">
        <div className="relative h-screen flex flex-col">
          <nav className="sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  onClick={() => navigate("/select-language")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Home</span>
                </motion.button>

                <div className="relative">
                  <motion.button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {selectedLanguage.name}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </motion.button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                      >
                        {languages.map((lang) => (
                          <motion.button
                            key={lang.id}
                            onClick={() => handleLanguageChange(lang)}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium ${
                              lang.id === selectedLanguage.id
                                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                            } transition-colors duration-200`}
                            whileHover={{ x: 4 }}
                          >
                            {lang.name}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* File Switcher Dropdown */}
                <div className="relative ml-2">
                  <motion.button
                    onClick={() => setIsFilesDropdownOpen(!isFilesDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      My Files
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                        isFilesDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </motion.button>

                  <AnimatePresence>
                    {isFilesDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200/50 dark:border-gray-700/50 z-50"
                      >
                        <div className="p-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2 py-1.5">
                            Your Files
                          </h3>
                          
                          {isLoadingFiles && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                                Loading files...
                              </span>
                            </div>
                          )}
                          
                          {!isLoadingFiles && userFiles.length === 0 && (
                            <div className="text-center py-4 px-2">
                              <Files className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                No saved files found
                              </p>
                            </div>
                          )}
                          
                          {!isLoadingFiles && userFiles.length > 0 && (
                            <div className="space-y-1">
                              {userFiles.map((file) => {
                                const isCurrentFile = file.s3Key === searchParams.get("file");
                                const fileExt = file.name.split('.').pop() || '';
                                
                                return (
                                  <motion.button
                                    key={file.s3Key}
                                    onClick={() => {
                                      if (!isCurrentFile) {
                                        navigate(`/editor/${file.language}?file=${file.s3Key}`);
                                        setIsFilesDropdownOpen(false);
                                      }
                                    }}
                                    className={`flex items-center w-full px-3 py-2 text-sm rounded-lg text-left ${
                                      isCurrentFile
                                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                                    } transition-colors duration-200`}
                                    whileHover={{ x: 4 }}
                                  >
                                    <div className="flex-1 truncate flex items-center">
                                      {/* Show language-specific icon */}
                                      <span className="mr-2 w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                        {file.language === 'javascript' && <span className="text-yellow-500">JS</span>}
                                        {file.language === 'python' && <span className="text-green-500">PY</span>}
                                        {file.language === 'java' && <span className="text-orange-500">JV</span>}
                                      </span>
                                      <span className="truncate">{file.name}</span>
                                    </div>
                                    {isCurrentFile && (
                                      <ChevronRight className="w-4 h-4 ml-1 text-indigo-500" />
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="px-2 py-2 border-t border-gray-100 dark:border-gray-700">
                          <motion.button
                            onClick={() => {
                              navigate("/select-language");
                              setIsFilesDropdownOpen(false);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm rounded-lg text-left text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors duration-200"
                            whileHover={{ x: 4 }}
                          >
                            <Plus className="w-4 h-4 mr-2 text-indigo-500" />
                            <span>Create New File</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-indigo-600" />
                  )}
                </motion.button>

                <motion.button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    isSaving
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    isRunning
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                      : "bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run Code</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-500/20 dark:text-purple-400 dark:hover:bg-purple-500/30 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate</span>
                </motion.button>
              </div>
            </div>
          </nav>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
            <AnimatePresence>
              {isLoadingFile && (
                <motion.div 
                  className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div 
                    className="flex flex-col items-center"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                  >
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-pulse" />
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                    <p className="mt-4 text-indigo-600 dark:text-indigo-400 text-lg font-medium">
                      Loading file content...
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div 
              className="flex-1 flex flex-col rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {fileName || `untitled.${selectedLanguage.id}`}
                </span>
                <motion.button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </motion.button>
              </div>
              <div className="flex-1 overflow-hidden">
                {(!fileId || isFileLoaded) && (
                  <Editor
                    height="100%"
                    language={selectedLanguage.id}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme={isDarkMode ? "vs-dark" : "light"}
                    onMount={(editor) => setEditorRef(editor)}
                    options={{
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      minimap: { enabled: false },
                      padding: { top: 20 },
                      smoothScrolling: true,
                      cursorSmoothCaretAnimation: "on",
                      renderLineHighlight: "all",
                      lineHeight: 1.6,
                      letterSpacing: 0.5,
                      scrollBeyondLastLine: false,
                    }}
                  />
                )}
              </div>
            </motion.div>

            <motion.div 
              className="lg:w-[420px] flex flex-col rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Console Output
                </h3>
                <motion.button
                  onClick={() => setOutput("")}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <XCircle className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-50/50 dark:bg-gray-900/50">
                {output ? (
                  <motion.pre 
                    className="whitespace-pre-wrap break-words"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {output.split("\n").map((line, i) => {
                      const isError = line.includes("Error:");
                      return (
                        <motion.div 
                          key={i}
                          className="flex items-start gap-2 mb-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                        >
                          {isRunning ? (
                            <Loader2 className="w-4 h-4 mt-1 animate-spin text-indigo-500" />
                          ) : isError ? (
                            <XCircle className="w-4 h-4 mt-1 text-red-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mt-1 text-emerald-500" />
                          )}
                          <code className={`${
                            isError 
                              ? "text-red-500 dark:text-red-400" 
                              : "text-gray-700 dark:text-gray-300"
                          }`}>
                            {line}
                          </code>
                        </motion.div>
                      );
                    })}
                  </motion.pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2">
                    <Terminal className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Your program output will appear here</p>
                    <p className="text-xs opacity-75">Click "Run Code" to execute your program</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <Chatbot />

          {/* Code Generation Modal */}
          <AnimatePresence>
            {isGenerateModalOpen && (
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      Generate Code with AI
                    </h3>
                    <button
                      onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      disabled={isGeneratingCode}
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Describe what code you want to generate:
                    </label>
                    <textarea
                      value={codePrompt}
                      onChange={(e) => setCodePrompt(e.target.value)}
                      placeholder="E.g., Write a function that calculates the factorial of a number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[120px] resize-none"
                      disabled={isGeneratingCode}
                    />
                    
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Be specific about what you want. The code will be generated in {selectedLanguage.name}.
                    </div>
                    
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        disabled={isGeneratingCode}
                      >
                        Cancel
                      </button>
                      <motion.button
                        onClick={handleGenerateCode}
                        className="px-6 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={!codePrompt.trim() || isGeneratingCode}
                      >
                        {isGeneratingCode ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate</span>
                          </>
                        )}
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