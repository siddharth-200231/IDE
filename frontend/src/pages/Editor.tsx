import React, { useState, useEffect, useRef } from "react";
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
  AlertTriangle,
  RotateCw,
  Clock,
  FileCode,
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faJs, faPython, faJava } from '@fortawesome/free-brands-svg-icons';
import { toast } from "react-hot-toast";
import { useDebouncedCallback } from 'use-debounce';

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
  const debouncedSetCode = useDebouncedCallback((value: string) => {
    setCode(value);
  }, 500);
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
  const [isGeneratingRefactorOptions, setIsGeneratingRefactorOptions] = useState(false);
  const [editorRef, setEditorRef] = useState<any>(null);
  const [replaceAllCode, setReplaceAllCode] = useState(false);
  const [generationMode, setGenerationMode] = useState<'generate' | 'explain'>('generate');
  const socketRef = useRef<any>(null);
  const [isAiSuggestionsEnabled, setIsAiSuggestionsEnabled] = useState<boolean>(true);
  const [aiSuggestionsHistory, setAiSuggestionsHistory] = useState<Array<{suggestion: string, applied: boolean}>>([]);
  const [isCodeSmellDetectionEnabled, setIsCodeSmellDetectionEnabled] = useState<boolean>(true);
  const [codeSmells, setCodeSmells] = useState<Array<{line: number, message: string, severity: 'warning' | 'error'}>>([]);
  const [isRefactoringModalOpen, setIsRefactoringModalOpen] = useState<boolean>(false);
  const [refactoringOptions, setRefactoringOptions] = useState<Array<{title: string, description: string, code: string}>>([]);
  const [selectedRefactoring, setSelectedRefactoring] = useState<number | null>(null);
  const [isTimeComplexityModalOpen, setIsTimeComplexityModalOpen] = useState<boolean>(false);
  const [complexityAnalysis, setComplexityAnalysis] = useState<{time: string, space: string, explanation: string} | null>(null);
  const [showAiToolsDropdown, setShowAiToolsDropdown] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const [languageOptions, setLanguageOptions] = useState(languages);
  const monacoContainerRef = useRef<HTMLDivElement>(null);
  const [isTypingAnimation, setIsTypingAnimation] = useState(false);

  // Add keyboard shortcuts for saving and code execution
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘S/Ctrl+S for saving
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // ⌘Enter/Ctrl+Enter for code execution
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) {
          handleRunCode();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRunning]);
  
  // Add click outside handler for language dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Memory leak fix: Clean up Monaco editor on unmount
  useEffect(() => {
    return () => {
      try {
        // Check if editorRef exists and has a dispose method
        if (editorRef && editorRef.current && typeof editorRef.current.dispose === 'function') {
          editorRef.current.dispose();
        }
      } catch (error) {
        console.error('Error during editor cleanup:', error);
      }
    };
  }, []);

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
      try {
        const response = await axios.get(`${BASE_URL}/files/${encodeURIComponent(fileId)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setCode(response.data.content);
        setFileName(response.data.file.name);
        
        // Fix language persistence on file load
        if (response.data.file.language) {
          const fileLanguage = languages.find(l => l.id === response.data.file.language);
          if (fileLanguage) {
            setSelectedLanguage(fileLanguage);
          }
        }
        
        setIsFileLoaded(true);
      } catch (error: any) {
        toast.error(`Failed to load file: ${error.message}`);
        navigate(`/editor/${selectedLanguage.id}`);
      } finally {
        setIsLoadingFile(false);
      }
    };

    loadFile();
  }, [fileId, selectedLanguage.id, navigate]);

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
      // Use the existing fileName if available, otherwise create a new filename
      const name =
        fileName ||
        `untitled-${Date.now()}.${
          selectedLanguage.id === "javascript"
            ? "js"
            : selectedLanguage.id === "python"
            ? "py"
            : "java"
        }`;

      console.log("Saving file:", {
        fileName: name,
        fileId: searchParams.get("file"),
        existingFile: !!searchParams.get("file")
      });

      const response = await axios.post(
        `${BASE_URL}/files/save`,
        {
          content: code,
          filename: name,
          language: selectedLanguage.id,
          fileId: fileId, // Use the fileId from state instead of getting it directly from searchParams
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Set the filename after successful save
      setFileName(name);
      
      // Only update the URL if we're creating a new file (not updating an existing one)
      if (!fileId && response.data.fileId) {
        // Store the new fileId in our state too 
        const newFileId = response.data.fileId;
        navigate(`/editor/${selectedLanguage.id}?file=${newFileId}`);
      }

      // Refresh the file list
      const filesResponse = await axios.get(`${BASE_URL}${API_ENDPOINTS.FILES.LIST}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (filesResponse.data && Array.isArray(filesResponse.data.files)) {
        setUserFiles(filesResponse.data.files);
      }

      console.log("Save successful:", response.data);
      toast.success("File saved successfully");
    } catch (error: any) {
      console.error("Failed to save file:", error);
      toast.error("Failed to save file: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(BASE_URL, {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected successfully");
    });

    socket.on("execution_status", (status) => {
      setOutput(prev => `${prev}${status}\n`);
    });

    socket.on("code_output", (output) => {
      setOutput(prev => `${prev}${output}`);
    });

    socket.on("execution_error", (error) => {
      setOutput(prev => `${prev}\nError: ${error}`);
      setIsRunning(false);
    });

    socket.on("execution_complete", () => {
      setIsRunning(false);
    });

    // Update socket handlers to prevent stuck states
    const handleDisconnect = () => {
      setIsRunning(false);
      setOutput("\nConnection lost - attempting to reconnect...");
      
      // Add reconnect logic with null check
      setTimeout(() => {
        if (socketRef.current) {
          try {
            socketRef.current.connect();
          } catch (error) {
            console.error('Error reconnecting socket:', error);
          }
        }
      }, 1000);
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);

    return () => {
      try {
        if (socket) {
          socket.disconnect();
          socket.off("disconnect", handleDisconnect);
          socket.off("connect_error", handleDisconnect);
        }
      } catch (error) {
        console.error('Error during socket cleanup:', error);
      }
    };
  }, []); // Empty dependency array as we only want to initialize once

  const handleRunCode = () => {
    if (!socketRef.current || isRunning) return;

    setIsRunning(true);
    setOutput('');
    
    socketRef.current.emit('execute_code', {
      language: selectedLanguage.id,
      code
    });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Create a ref to store the current controller
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerateCode = async () => {
    if (!codePrompt.trim() || !editorRef) return;
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsGeneratingCode(true);
    setOutput("⏳ Generating code from your description...");
    
    try {
      // Get the API key from the Chatbot component
      const API_KEY = "AIzaSyClNi8sXsBRlg7uJx6qXV5mOJ-bfWjHZvA";
      
      // Always get the current code to include in the prompt
      const currentCode = code.trim();
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert ${selectedLanguage.name} programmer. Generate complete, well-structured ${selectedLanguage.name} code for the following task.

Context: This is for a code learning platform where users write and run code in JavaScript, Python, and Java.

CURRENT CODE IN EDITOR:
\`\`\`${selectedLanguage.id}
${currentCode}
\`\`\`

TASK: ${codePrompt}

Important instructions:
- Generate a complete, executable ${selectedLanguage.name} solution
- The code should follow best practices for ${selectedLanguage.name}
- Include proper error handling where appropriate
- Your response will COMPLETELY REPLACE the current code in the editor
- Provide ONLY the code without any explanations, comments (unless they're part of the code), or markdown formatting
- Make sure the code is immediately runnable in our platform
- The code should handle the specific task described while preserving the general intent of the original code if appropriate`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to generate code: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      let generatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Clean the generated code by removing markdown code blocks if present
      generatedCode = generatedCode
        .replace(/```[\w]*\n/g, '')   // Remove starting code fence
        .replace(/```$/g, '')          // Remove ending code fence
        .trim();
      
      // Add a trailing newline for better code formatting
      if (!generatedCode.endsWith('\n')) {
        generatedCode += '\n';
      }

      // Step 1: Close modal and prepare editor
      setIsGenerateModalOpen(false);
      setOutput("Applying generated code...");
      
      // Get the editor model
      const model = editorRef.getModel();
      if (!model) return;

      // Clear existing content
      model.setValue("");
      
      // Completely new method for smooth typing animation with enhanced visual effects
      const executeCodeAnimation = async () => {
        setIsTypingAnimation(true);
        try {
          // First set empty content
          model.setValue('');
          
          // Then gradually add content
          let visibleText = '';
          const lines = generatedCode.split('\n');
          const modelDecorations: any[] = [];
          
          // Random typing speeds simulation
          const getTypeSpeed = () => {
            // Weighted random - mostly fast with occasional pauses
            const speeds = [5, 8, 10, 15, 30, 60, 100];
            const weights = [60, 20, 10, 5, 3, 1.5, 0.5]; // 60% chance of 5ms, etc.
            
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            const random = Math.random() * totalWeight;
            
            let sum = 0;
            for (let i = 0; i < speeds.length; i++) {
              sum += weights[i];
              if (random <= sum) return speeds[i];
            }
            return 10; // fallback
          };
          
          // Process line by line for more natural typing
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            // Add line break between lines
            if (lineIndex > 0) {
              visibleText += '\n';
              model.setValue(visibleText);
              await new Promise(resolve => requestAnimationFrame(resolve));
            }
            
            // Enhanced batching logic - natural typing rhythm
            let charIndex = 0;
            while (charIndex < line.length) {
              // Determine batch size based on context
              // Typing in "bursts" feels more natural than uniform speed
              let batchSize = Math.floor(Math.random() * 4) + 1;
              
              // Type faster for simple characters, slower for special ones
              if (line[charIndex] === ' ' || line[charIndex] === '.') {
                batchSize = batchSize + 1;
              } else if (/[{}();]/.test(line[charIndex])) {
                batchSize = 1; // Type special chars one by one
              }
              
              const endIndex = Math.min(charIndex + batchSize, line.length);
              const chars = line.substring(charIndex, endIndex);
              
              visibleText += chars;
              model.setValue(visibleText);
              
              // Calculate cursor position
              const position = model.getPositionAt(visibleText.length);
              if (position) {
                // Highlight newly added text with animation
                const decorationId = editorRef.deltaDecorations([], [{
                  range: new monaco.Range(
                    position.lineNumber,
                    Math.max(1, position.column - chars.length),
                    position.lineNumber,
                    position.column
                  ),
                  options: {
                    className: 'typing-animation-effect',
                    isWholeLine: false
                  }
                }]);
                
                modelDecorations.push(...decorationId);
                
                // Keep only last 5 decorations to avoid performance issues
                if (modelDecorations.length > 5) {
                  const oldDecorations = modelDecorations.splice(0, modelDecorations.length - 5);
                  editorRef.deltaDecorations(oldDecorations, []);
                }
                
                editorRef.setPosition(position);
                editorRef.revealPositionInCenter(position);
              }
              
              // Dynamic typing speed calculation - renamed to avoid any potential duplicate
              const typingSpeed = getTypeSpeed();
              
              // Determine additional context-based delay
              let contextDelay = 0;
              
              // Longer pauses around special characters
              if (/[.{}();:]/.test(chars)) {
                contextDelay += 40;
              }
              
              // Pause slightly at spaces to simulate natural word breaks
              if (chars.includes(' ')) {
                contextDelay += 20;
              }
              
              // Longer pause at line end
              if (endIndex === line.length) {
                contextDelay += 30;
              }
              
              // Wait for the calculated delay
              await new Promise(resolve => setTimeout(resolve, typingSpeed + contextDelay));
              
              // Move to next batch
              charIndex = endIndex;
            }
            
            // Longer pauses at meaningful line endings
            if (line.trim().endsWith('{') || line.trim().endsWith('}')) {
              await new Promise(resolve => setTimeout(resolve, 150));
            } else if (line.trim().endsWith(';')) {
              await new Promise(resolve => setTimeout(resolve, 70));
            }
          }
          
          // Clear all decorations
          if (modelDecorations.length > 0) {
            editorRef.deltaDecorations(modelDecorations, []);
          }
          
          // Ensure final content is correct
          model.setValue(generatedCode);
          
          // Move cursor to a good starting position
          const startLine = 1;
          editorRef.setPosition({ lineNumber: startLine, column: 1 });
          editorRef.revealLineInCenter(startLine);
          
          // Animation complete
          setIsGeneratingCode(false);
          
          // Show completion message
          setOutput(`✅ Successfully generated and applied ${selectedLanguage.name} code!
🔍 Prompt: "${codePrompt}"
💡 The code has been generated and applied to the editor.`);
          
          // Reset prompt
          setCodePrompt("");
          
          return true;
        } catch (error) {
          console.error("Error during animation:", error);
          // Fallback: set the content all at once
          model.setValue(generatedCode);
          setIsGeneratingCode(false);
          setOutput(`✅ Code generated and applied (animation skipped).
🔍 Prompt: "${codePrompt}"`);
          setCodePrompt("");
          return false;
        } finally {
          setIsTypingAnimation(false);
        }
      };
      
      // Start the typing animation
      executeCodeAnimation().catch(error => {
        console.error("Error during typing animation:", error);
        model.setValue(generatedCode);
        setIsGeneratingCode(false);
        setOutput(`❌ Error during animation. Code applied directly.
${error.message || 'Unknown animation error'}`);
      });
      
    } catch (error: any) {
      console.error("Code generation error:", error);
      setOutput(`❌ Error generating code: ${error.message || "Unknown error occurred"}\n\nPlease try again with a different prompt.`);
      setIsGeneratingCode(false);
    }
  };

  const handleExplainCode = async () => {
    if (!editorRef) return;
    
    setIsGeneratingCode(true);
    setOutput("⏳ Analyzing your code...");
    
    try {
      // Get the API key from the Chatbot component
      const API_KEY = "AIzaSyClNi8sXsBRlg7uJx6qXV5mOJ-bfWjHZvA";
      
      // Get the current code
      const currentCode = code.trim();
      
      // If there's no code to explain, show an error
      if (!currentCode || currentCode === defaultCode[selectedLanguage.id].trim()) {
        throw new Error("There's no custom code to explain. Please write or generate some code first.");
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You're an expert ${selectedLanguage.name} programmer. Analyze and explain the following ${selectedLanguage.name} code in depth.

CODE TO EXPLAIN:
\`\`\`${selectedLanguage.id}
${currentCode}
\`\`\`

Please provide a detailed explanation covering:
1. Overall purpose and functionality of the code
2. Breakdown of key functions/classes and what they do
3. Important algorithms or data structures used
4. Potential edge cases or performance considerations
5. Any best practices followed or areas for improvement

Make your explanation clear and educational, suitable for a programming student.`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to analyze code: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation generated.";
      
      // Display the explanation in the console output
      setOutput(`## Code Analysis: ${selectedLanguage.name}

${explanation}`);
      
      // Close the modal
      setIsGenerateModalOpen(false);
      setCodePrompt("");
    } catch (error: any) {
      console.error("Code analysis error:", error);
      setOutput(`❌ Error analyzing code: ${error.message || "Unknown error occurred"}`);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDetectCodeSmells = async () => {
    if (!code.trim()) return;
    
    setIsGeneratingCode(true);
    try {
      // Use the consistent API key and endpoint
      const API_KEY = "AIzaSyClNi8sXsBRlg7uJx6qXV5mOJ-bfWjHZvA";
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a code review assistant. Analyze this ${selectedLanguage.id} code and identify any code smells, potential bugs, or areas for improvement. Focus on:
1. Performance issues
2. Best practices violations
3. Potential bugs
4. Readability issues

Return JSON in this format only:
{
  "codeSmells": [
    {"line": <line_number>, "message": "<detailed_description>", "severity": "<warning or error>"}
  ]
}

Code to analyze:
${code}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to analyze code: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      try {
        // Extract JSON from the response (handling both direct JSON and JSON within text)
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : resultText;
        const result = JSON.parse(jsonString);
        
        if (result.codeSmells && Array.isArray(result.codeSmells)) {
          setCodeSmells(result.codeSmells);
          
          // Add model decorations for the code smells
          if (editorRef.current) {
            const decorations = result.codeSmells.map((smell: any) => ({
              range: new monaco.Range(smell.line, 1, smell.line, 1),
              options: {
                isWholeLine: true,
                className: smell.severity === 'error' ? 'errorLineDecoration' : 'warningLineDecoration',
                glyphMarginClassName: smell.severity === 'error' ? 'errorGlyphMargin' : 'warningGlyphMargin',
                hoverMessage: { value: smell.message }
              }
            }));
            
            editorRef.current.deltaDecorations([], decorations);
          }
          
          // Show success message
          toast.success(`Found ${result.codeSmells.length} code issues`);
        } else {
          // If no code smells found, inform the user
          setCodeSmells([]);
          toast.success("No code issues found - your code looks good!", {
            icon: '✓',
            style: {
              backgroundColor: '#f0fdf4',
              color: '#14532d',
              border: '1px solid #bbf7d0'
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        toast.error("Failed to analyze code smells");
      }
    } catch (error) {
      console.error("Error detecting code smells:", error);
      toast.error("Failed to analyze code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleGenerateRefactoringOptions = async () => {
    if (!code.trim()) return;
    
    setIsGeneratingRefactorOptions(true);
    setIsRefactoringModalOpen(true);
    
    try {
      // Use the consistent API key and endpoint
      const API_KEY = "AIzaSyClNi8sXsBRlg7uJx6qXV5mOJ-bfWjHZvA";
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a code refactoring assistant. For this ${selectedLanguage.id} code, suggest 3 different refactoring options that would improve the code quality, maintainability, or performance.

For each option, provide:
1. A title for the refactoring
2. A brief description of the benefits
3. The complete refactored code

Return JSON in this format only:
{
  "refactoringOptions": [
    {
      "title": "<refactoring_title>",
      "description": "<benefits_description>",
      "code": "<complete_refactored_code>"
    },
    ...
  ]
}

Code to refactor:
${code}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to generate refactoring options: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      try {
        // Extract JSON from the response - handle markdown code blocks
        let jsonString = resultText;
        
        // Remove markdown code blocks if present
        if (resultText.includes('```json')) {
          jsonString = resultText.replace(/```json\n|```/g, '');
        } else {
          // Try to extract JSON object
          const jsonMatch = resultText.match(/\{[\s\S]*\}/);
          jsonString = jsonMatch ? jsonMatch[0] : resultText;
        }
        
        // Parse the JSON
        const result = JSON.parse(jsonString);
        
        if (result.refactoringOptions && Array.isArray(result.refactoringOptions)) {
          setRefactoringOptions(result.refactoringOptions);
        } else if (result.candidates && result.candidates[0]?.content?.parts) {
          // Handle the nested response format shown in the example
          try {
            const nestedText = result.candidates[0].content.parts[0].text;
            // Extract JSON from nested text
            const nestedJsonMatch = nestedText.match(/\{[\s\S]*\}/);
            const nestedJsonString = nestedJsonMatch ? nestedJsonMatch[0] : nestedText;
            
            // Remove markdown code blocks if present
            const cleanedNestedJson = nestedJsonString.replace(/```json\n|```/g, '');
            
            const nestedResult = JSON.parse(cleanedNestedJson);
            if (nestedResult.refactoringOptions && Array.isArray(nestedResult.refactoringOptions)) {
              setRefactoringOptions(nestedResult.refactoringOptions);
            } else {
              throw new Error('Invalid nested response format');
            }
          } catch (nestedError) {
            console.error('Failed to parse nested response:', nestedError);
            setRefactoringOptions([]);
            toast.error('Failed to parse refactoring options');
          }
        } else {
          // Set empty array but with a message
          setRefactoringOptions([]);
          toast.success("No refactoring suggestions available for this code", {
            icon: 'ℹ️',
            style: {
              backgroundColor: '#f0f9ff',
              color: '#0c4a6e',
              border: '1px solid #bae6fd'
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        toast.error("Failed to generate refactoring options");
      }
    } catch (error) {
      console.error("Error generating refactoring options:", error);
      toast.error("Failed to generate refactoring options");
    } finally {
      setIsGeneratingRefactorOptions(false);
    }
  };

  const applyRefactoring = (index: number) => {
    if (index >= 0 && index < refactoringOptions.length) {
      setCode(refactoringOptions[index].code);
      setIsRefactoringModalOpen(false);
      toast.success("Refactoring applied successfully");
    }
  };

  const analyzeTimeComplexity = async () => {
    if (!code.trim()) return;
    
    setIsGeneratingCode(true);
    setIsTimeComplexityModalOpen(true);
    
    try {
      // Use the consistent API key and endpoint
      const API_KEY = "AIzaSyClNi8sXsBRlg7uJx6qXV5mOJ-bfWjHZvA";
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the time and space complexity of this ${selectedLanguage.id} code. Provide Big O notation and explain your reasoning in detail.

Return JSON in this format only:
{
  "timeComplexity": "<big_o_notation>",
  "spaceComplexity": "<big_o_notation>",
  "explanation": "<detailed_explanation>"
}

Code to analyze:
${code}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to analyze complexity: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      try {
        // Extract JSON from the response
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : resultText;
        const result = JSON.parse(jsonString);
        
        setComplexityAnalysis({
          time: result.timeComplexity || "O(1)",
          space: result.spaceComplexity || "O(1)",
          explanation: result.explanation || "The code is very simple with constant time and space complexity."
        });
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        // Fallback response for simple code
        setComplexityAnalysis({
          time: "O(1)",
          space: "O(1)",
          explanation: "The code is simple with likely constant time and space complexity. (Detailed analysis failed to generate)"
        });
      }
    } catch (error: any) {
      console.error("Error analyzing complexity:", error);
      toast.error(`Failed to analyze complexity: ${error.message || "Unknown error"}`);
      
      // Close the modal on error
      setIsTimeComplexityModalOpen(false);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleEditorMount = (editor: any) => {
    setEditorRef(editor);
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
    });
  };

  // Move this INSIDE the component body, before the return statement
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
.editor-container {
  font-feature-settings: "liga" 1, "calt" 1;
}
.monaco-editor .margin {
  background-color: transparent !important;
}
.monaco-editor .line-numbers {
  color: rgba(156, 163, 175, 0.8) !important;
}
.monaco-editor .current-line {
  border: none !important;
  background-color: rgba(226, 232, 240, 0.1) !important;
}
.monaco-editor.vs-dark .current-line {
  background-color: rgba(30, 41, 59, 0.3) !important;
}
.monaco-editor .cursor {
  width: 2px !important;
  background-color: #3b82f6 !important;
}
.monaco-editor.vs-dark .cursor {
  background-color: #60a5fa !important;
}
.errorLineDecoration {
  background: rgba(239, 68, 68, 0.08);
  border-left: 2px solid #ef4444;
}
.warningLineDecoration {
  background: rgba(245, 158, 11, 0.08);
  border-left: 2px solid #f59e0b;
}
.errorGlyphMargin {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16' fill='%23ef4444'%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z'/%3E%3C/svg%3E") center center no-repeat;
}
.warningGlyphMargin {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16' fill='%23f59e0b'%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z'/%3E%3C/svg%3E") center center no-repeat;
}
.monaco-editor .selected-text {
  background-color: rgba(147, 197, 253, 0.25) !important;
}
.monaco-editor.vs-dark .selected-text {
  background-color: rgba(59, 130, 246, 0.35) !important;
}
.typing-animation-effect {
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.3);
  border-radius: 2px;
  animation: typing-pulse 1s ease-in-out;
}
@keyframes typing-pulse {
  0% { box-shadow: 0 0 0 0px rgba(147, 197, 253, 0.5); }
  50% { box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.3); }
  100% { box-shadow: 0 0 0 0px rgba(147, 197, 253, 0.0); }
}
.monaco-editor-hover {
  border-radius: 6px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid rgba(203, 213, 225, 0.5) !important;
}
  `;
  document.head.appendChild(styleElement);
  
  return () => {
    document.head.removeChild(styleElement);
  };
}, []);

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
        <div className="relative h-screen flex flex-col md:flex-row">
          {/* Left sidebar - adjusted width and padding */}
          <aside className="md:w-16 lg:w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col transition-all duration-300">
            {/* Logo area */}
            <div className="h-14 flex items-center justify-center lg:justify-start px-3 border-b border-slate-200 dark:border-slate-800">
                <motion.button
                  onClick={() => navigate("/select-language")}
                className="flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {selectedLanguage.id === 'javascript' ? 'JS' : selectedLanguage.id === 'python' ? 'PY' : 'JV'}
                </div>
                <span className="text-lg font-semibold hidden lg:block text-slate-700 dark:text-slate-200">fluxIDE</span>
                </motion.button>
            </div>
            
            {/* Sidebar actions - improved spacing */}
            <div className="flex-1 flex flex-col py-2">
              <div className="px-2">
                <div className="mb-4 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 hidden lg:block mb-1">Main</div>
                  
                  {/* Language selector - improved padding and spacing */}
                <div className="relative">
                  <motion.button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div className="hidden lg:flex flex-col flex-1 items-start">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {selectedLanguage.name}
                    </span>
                        <span className="text-xs text-slate-500">Select language</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden lg:block" />
                  </motion.button>

                  <AnimatePresence>
                  {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-0 left-12 lg:top-full lg:left-0 lg:mt-1 w-48 rounded-lg bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
                      >
                      {languages.map((lang) => (
                          <motion.button
                          key={lang.id}
                          onClick={() => handleLanguageChange(lang)}
                              className={`flex items-center w-full px-4 py-2.5 text-sm ${
                            lang.id === selectedLanguage.id
                                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                              } transition-colors duration-150`}
                              whileHover={{ x: 2 }}
                            >
                              {lang.id === 'javascript' && <FontAwesomeIcon icon={faJs} className="mr-2 text-yellow-500" />}
                              {lang.id === 'python' && <FontAwesomeIcon icon={faPython} className="mr-2 text-green-500" />}
                              {lang.id === 'java' && <FontAwesomeIcon icon={faJava} className="mr-2 text-orange-500" />}
                          {lang.name}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                  {/* Files button - improved padding and spacing */}
                  <div className="relative">
                  <motion.button
                    onClick={() => setIsFilesDropdownOpen(!isFilesDropdownOpen)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="hidden lg:flex flex-col flex-1 items-start">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Files
                    </span>
                        <span className="text-xs text-slate-500">{userFiles.length} file(s)</span>
                      </div>
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden lg:block ${
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
                          transition={{ duration: 0.15 }}
                          className="absolute top-0 left-12 lg:top-full lg:left-0 lg:mt-1 w-72 max-h-[450px] overflow-y-auto rounded-lg bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 z-50"
                      >
                        <div className="p-2">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 py-1.5">
                            Your Files
                          </h3>
                              
                              <motion.button
                                onClick={() => {
                                  navigate("/select-language");
                                  setIsFilesDropdownOpen(false);
                                }}
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          
                          {isLoadingFiles && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                                <span className="ml-2 text-sm text-slate-600 dark:text-slate-300">
                                Loading files...
                              </span>
                            </div>
                          )}
                          
                          {!isLoadingFiles && userFiles.length === 0 && (
                            <div className="text-center py-4 px-2">
                                <Files className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                No saved files found
                              </p>
                            </div>
                          )}
                          
                          {!isLoadingFiles && userFiles.length > 0 && (
                            <div className="space-y-1">
                              {userFiles.map((file) => {
                                const isCurrentFile = file.s3Key === searchParams.get("file");
                                
                                return (
                                  <motion.button
                                    key={file.s3Key}
                                    onClick={() => {
                                      if (!isCurrentFile) {
                                        navigate(`/editor/${file.language}?file=${file.s3Key}`);
                                        setIsFilesDropdownOpen(false);
                                      }
                                    }}
                                      className={`flex items-center w-full px-3 py-2 text-sm rounded-md text-left ${
                                      isCurrentFile
                                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                      } transition-colors duration-150`}
                                      whileHover={{ x: 2 }}
                                  >
                                    <div className="flex-1 truncate flex items-center">
                                        <span className="mr-2 w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                        {file.language === 'javascript' && (
                                          <FontAwesomeIcon icon={faJs} className="text-yellow-500" />
                                        )}
                                        {file.language === 'python' && (
                                          <FontAwesomeIcon icon={faPython} className="text-green-500" />
                                        )}
                                        {file.language === 'java' && (
                                          <FontAwesomeIcon icon={faJava} className="text-orange-500" />
                                        )}
                                      </span>
                                      <span className="truncate">{file.name}</span>
                                    </div>
                                    {isCurrentFile && (
                                        <ChevronRight className="w-3.5 h-3.5 ml-1 text-blue-500" />
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                        </div>

                {/* AI Tools section - improved spacing */}
                <div className="mb-4 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 hidden lg:block mb-1">AI Tools</div>
                  
                          <motion.button
                            onClick={() => {
                      setGenerationMode('generate');
                      setIsGenerateModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden lg:block">Generate Code</span>
                          </motion.button>
                  
                  <motion.button
                    onClick={() => {
                      setGenerationMode('explain');
                      setIsGenerateModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Terminal className="w-4 h-4" />
                        </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden lg:block">Explain Code</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={handleDetectCodeSmells}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden lg:block">Detect Issues</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={handleGenerateRefactoringOptions}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                      <RotateCw className="w-4 h-4" />
              </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden lg:block">Refactor Code</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={analyzeTimeComplexity}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden lg:block">Analyze Complexity</span>
                  </motion.button>
                </div>
              </div>
              
              {/* Bottom actions */}
              <div className="mt-auto p-2 border-t border-slate-200 dark:border-slate-800">
                <motion.button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  {isDarkMode ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                      <Moon className="w-4 h-4 text-blue-600" />
                  )}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden lg:block">
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </span>
                </motion.button>
              </div>
            </div>
          </aside>
          
          {/* Main content area - improved layout */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Top toolbar */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-4">
              <div className="flex items-center">
                <span className="text-sm font-mono text-slate-500 dark:text-slate-400 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 flex items-center">
                  {fileName ? (
                    <>
                      {selectedLanguage.id === 'javascript' && <FontAwesomeIcon icon={faJs} className="mr-2 text-yellow-500" />}
                      {selectedLanguage.id === 'python' && <FontAwesomeIcon icon={faPython} className="mr-2 text-green-500" />}
                      {selectedLanguage.id === 'java' && <FontAwesomeIcon icon={faJava} className="mr-2 text-orange-500" />}
                      {fileName}
                    </>
                  ) : (
                    <>
                      {selectedLanguage.id === 'javascript' && <FontAwesomeIcon icon={faJs} className="mr-2 text-yellow-500" />}
                      {selectedLanguage.id === 'python' && <FontAwesomeIcon icon={faPython} className="mr-2 text-green-500" />}
                      {selectedLanguage.id === 'java' && <FontAwesomeIcon icon={faJava} className="mr-2 text-orange-500" />}
                      {`untitled.${selectedLanguage.id === 'javascript' ? 'js' : selectedLanguage.id === 'python' ? 'py' : 'java'}`}
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Action buttons */}
                <motion.button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
                    isSaving
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-emerald-500/90 text-white hover:bg-emerald-600 dark:bg-emerald-600/30 dark:text-emerald-400 dark:hover:bg-emerald-600/40"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
                    isRunning
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      : "bg-blue-500/90 text-white hover:bg-blue-600 dark:bg-blue-600/30 dark:text-blue-400 dark:hover:bg-blue-600/40"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Code</span>
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Copy code"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                  )}
                </motion.button>
                      </div>
                    </div>

            {/* Main editor and console area - improved layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Add custom CSS for line number contrast in dark mode */}
              <style jsx>{`
                .dark .monaco-editor .line-numbers {
                  color: rgba(156, 163, 175, 0.9) !important;
                }
              `}</style>
            <AnimatePresence>
              {isLoadingFile && (
                <motion.div 
                    className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                  <motion.div 
                    className="flex flex-col items-center"
                      initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                  >
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-3 border-blue-500/30 animate-pulse" />
                        <div className="absolute inset-0 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
                    </div>
                      <p className="mt-4 text-blue-600 dark:text-blue-400 font-medium">
                        Loading file...
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
              {/* Code editor panel - improved layout */}
              <div className="flex-1 overflow-hidden flex flex-col relative">
                {(!fileId || isFileLoaded) && (
                  <>
                    <Editor
                      height="100%"
                      language={selectedLanguage.id}
                      value={code}
                      onChange={(value) => debouncedSetCode(value || "")}
                      theme={isDarkMode ? "vs-dark" : "light"}
                      onMount={(editor) => handleEditorMount(editor)}
                      options={{
                        fontSize: 15,
                        fontFamily: "'JetBrains Mono', 'Menlo', 'Monaco', monospace",
                        minimap: { enabled: window.innerWidth > 768, scale: 10, showSlider: "mouseover", renderCharacters: false },
                        padding: { top: 20 },
                        scrollBeyondLastLine: false,
                        scrollbar: { 
                          vertical: 'auto', 
                          horizontalScrollbarSize: 8,
                          verticalScrollbarSize: 8,
                          alwaysConsumeMouseWheel: false
                        },
                        smoothScrolling: true,
                        cursorSmoothCaretAnimation: "on",
                        cursorBlinking: "smooth",
                        wordWrap: "on",
                        wrappingIndent: "same",
                        renderLineHighlight: "all",
                        lineHeight: 1.6,
                        letterSpacing: 0.5,
                        bracketPairColorization: { enabled: true },
                        guides: { bracketPairs: true, indentation: true, highlightActiveIndentation: true },
                        renderWhitespace: "selection",
                        contextmenu: true,
                        linkedEditing: true,
                        snippetSuggestions: "inline",
                        tabCompletion: "on",
                        suggest: { 
                          showMethods: true, 
                          showFunctions: true, 
                          showConstructors: true, 
                          showFields: true, 
                          showVariables: true, 
                          showClasses: true, 
                          showKeywords: true,
                          preview: true,
                          showIcons: true
                        },
                        folding: true,
                        foldingHighlight: true,
                        parameterHints: {
                          enabled: true,
                          cycle: true
                        },
                        formatOnPaste: true,
                        formatOnType: true,
                        glyphMargin: true,
                        rulers: [],
                        colorDecorators: true,
                        codeLens: true
                      }}
                      className="editor-container"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50/80 to-transparent dark:from-slate-900/80 pointer-events-none z-10"></div>
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-2 pointer-events-none z-10">
                      <div className="flex space-x-1 pointer-events-auto">
                        <motion.div 
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600'
                          } shadow-sm border border-slate-200 dark:border-slate-700 flex items-center`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.05 }}
                          title="Line count"
                        >
                          {code.split('\n').length} lines
                        </motion.div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Enhanced Console UI with improved styling */}
              <div className="h-64 lg:h-auto lg:w-[400px] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col">
                {/* Console Header with improved tabs */}
                <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex">
                      <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 transition-colors">
                        <Terminal className="w-4 h-4" />
                        <span className="relative">
                          Console
                          {isRunning && (
                            <motion.span 
                              className="absolute -right-1.5 -top-1.5 w-2 h-2 rounded-full bg-blue-500"
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                          )}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigator.clipboard.writeText(output)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                        disabled={!output}
                        title="Copy output"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setOutput("")}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                        disabled={!output || isRunning}
                        title="Clear console"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Console Content with improved styling */}
                <div 
                  className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 font-mono text-sm relative"
                  style={{
                    backgroundImage: isDarkMode ? 
                      "linear-gradient(to bottom, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0) 10px)" : 
                      "linear-gradient(to bottom, rgba(226,232,240,0.5) 0%, rgba(226,232,240,0) 10px)"
                  }}
                >
                  {output ? (
                    <motion.div 
                      className="p-3 pb-12"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {output.split("\n").map((line, i) => {
                        // Add error code parsing
                        const errorMatch = line.match(/(Error:\s+)(E\d+):\s*(.+)/);
                        if (errorMatch) {
                          return (
                            <motion.div 
                              key={i} 
                              className="mb-2 bg-red-50/50 dark:bg-red-900/10 rounded-md overflow-hidden"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="px-3 py-1 bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-300 font-semibold text-xs border-l-2 border-red-500 flex items-center">
                                <XCircle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                                Error {errorMatch[2]}
                              </div>
                              <div className="p-2.5 text-red-600 dark:text-red-400">
                                {errorMatch[3]}
                              </div>
                            </motion.div>
                          );
                        }
                        const isError = line.includes("Error:");
                        const isSuccess = line.includes("Successfully") || line.includes("✅");
                        const isWarning = line.includes("Warning:") || line.includes("⚠️");
                        const isInfo = line.includes("💡") || line.includes("Note:") || line.startsWith("##");
                        const isPrompt = line.includes("Prompt:") || line.includes("🔍");
                        const isRunningMsg = line.includes("⏳") || line.includes("Generating") || line.includes("Analyzing");
                        const isCodeBlock = line.trim().startsWith("```") || line.trim().endsWith("```");
                        const isCodeOutput = line.trim().startsWith(">") || line.trim().startsWith("$");
                        
                        // Format markdown-style headers
                        let formattedLine = line;
                        if (line.startsWith("##")) {
                          formattedLine = line.replace(/^##\s+(.+)$/, "$1");
                        }
                        
                        return (
                          <motion.div 
                            key={i}
                            className={`flex items-start gap-2 py-1.5 px-2 rounded-md mb-1.5 ${
                              isError ? "bg-red-50/50 dark:bg-red-900/10 border-l-2 border-red-500" : 
                              isSuccess ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-l-2 border-emerald-500" :
                              isWarning ? "bg-amber-50/50 dark:bg-amber-900/10 border-l-2 border-amber-500" :
                              isInfo ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-blue-500" :
                              isCodeBlock || isCodeOutput ? "bg-slate-100 dark:bg-slate-800/50 font-mono rounded border border-slate-200 dark:border-slate-700" :
                            ""
                            }`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.02 }}
                          >
                            <div className="flex flex-col items-start">
                              <div className="text-[10px] text-slate-400 dark:text-slate-600 mb-0.5">
                                {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mt-0.5 shrink-0">
                              {isRunning ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              ) : isError ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : isWarning ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              ) : isInfo ? (
                                <Code2 className="w-4 h-4 text-blue-500" />
                              ) : isPrompt ? (
                                <span className="text-purple-500 w-4 h-4 flex items-center justify-center">🔍</span>
                              ) : isRunningMsg ? (
                                <span className="text-blue-500 w-4 h-4 flex items-center justify-center">⏳</span>
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            
                            <div className={`flex-1 ${
                              isError ? "text-red-700 dark:text-red-400" : 
                              isSuccess ? "text-emerald-700 dark:text-emerald-400" :
                              isWarning ? "text-amber-700 dark:text-amber-400" :
                              isInfo ? "text-blue-700 dark:text-blue-400 font-medium" :
                              isPrompt ? "text-purple-700 dark:text-purple-400 italic" :
                              isCodeBlock || isCodeOutput ? "text-slate-800 dark:text-slate-300 font-mono text-xs px-2 py-1" :
                              "text-slate-700 dark:text-slate-300"
                            }`}>
                              {/* Show timestamp for each message */}
                              {i === 0 && (
                                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">
                                  {new Date().toLocaleTimeString()}
                                </div>
                              )}
                              
                              {/* Format the output with appropriate styling */}
                              {isInfo && line.startsWith("##") ? (
                                <h3 className="text-sm font-semibold">{formattedLine}</h3>
                              ) : (
                                <div className="whitespace-pre-wrap break-words">
                                  {formattedLine}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6">
                      <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center max-w-xs mx-auto">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full mb-4">
                          <Terminal className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                        </div>
                        <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Console Output</h3>
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-4">
                          Click the "Run Code" button to execute your code and see the results here
                        </p>
                        <motion.button
                          onClick={handleRunCode}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Run Code
                        </motion.button>
                      </div>
                    </div>
                  )}
                  {/* Add fading effect at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-900 pointer-events-none"></div>
                </div>
                
                {/* Console Status Bar */}
                <div className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-1.5 px-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-xs font-medium">Running...</span>
                      </div>
                    ) : output && output.includes("Error:") ? (
                      <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-xs font-medium">Execution Failed</span>
                      </div>
                    ) : output ? (
                      <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-medium">Execution Complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                        <span className="text-xs">Ready</span>
                      </div>
                    )}
                  </div>
                  {/* Add a resize handle */}
                  <div className="text-xs text-slate-400 dark:text-slate-600">
                    {isRunning && <Clock className="w-3 h-3 animate-pulse" />}
                  </div>
                </div>
              </div>
          </div>

            {/* Status bar */}
            <div className="h-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 px-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  {selectedLanguage.id === 'javascript' && <FontAwesomeIcon icon={faJs} className="text-yellow-500" />}
                  {selectedLanguage.id === 'python' && <FontAwesomeIcon icon={faPython} className="text-green-500" />}
                  {selectedLanguage.id === 'java' && <FontAwesomeIcon icon={faJava} className="text-orange-500" />}
                  {selectedLanguage.name}
                </span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono"
                >
                  {fileName || `untitled.${selectedLanguage.id === 'javascript' ? 'js' : selectedLanguage.id === 'python' ? 'py' : 'java'}`}
                </motion.span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 bg-white/30 dark:bg-slate-700/30 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  Ln {cursorPosition.line}, Col {cursorPosition.column}
                </span>
                <span>UTF-8</span>
                {codeSmells.length > 0 && (
                  <button 
                    onClick={() => editorRef.current?.deltaDecorations([], [])}
                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Clear Issues ({codeSmells.length})
                  </button>
                )}
                {isRunning && 
                  <span className="text-blue-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> 
                    Running...
                  </span>
                }
              </div>
            </div>
          </main>

          {/* Add Chatbot component */}
          <div className="fixed bottom-6 right-6 z-[60]">
            <Chatbot />
          </div>
        </div>
      </div>

          {/* Code Generation Modal */}
          <AnimatePresence>
            {isGenerateModalOpen && (
              <motion.div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
              >
                <motion.div
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50"
              initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  {generationMode === 'generate' ? (
                    <>
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      AI Code Generator
                    </>
                  ) : (
                    <>
                      <Terminal className="w-5 h-5 text-blue-500" />
                      Code Explanation
                    </>
                  )}
                    </h3>
                    <button
                      onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      disabled={isGeneratingCode}
                    >
                  <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  
                  {/* Mode selector tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setGenerationMode('generate')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        generationMode === 'generate'
                      ? 'text-purple-600 border-b-2 border-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      Generate Code
                    </button>
                    <button
                      onClick={() => setGenerationMode('explain')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        generationMode === 'explain'
                      ? 'text-blue-600 border-b-2 border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      Explain Code
                    </button>
                  </div>
                  
                  <div className="p-6">
                    {generationMode === 'generate' ? (
                      // Generate code UI
                      <>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      What would you like to create?
                        </label>
                        <textarea
                          value={codePrompt}
                          onChange={(e) => setCodePrompt(e.target.value)}
                          placeholder="Example: Create a REST API endpoint with Express.js that handles user authentication..."
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[120px] resize-none text-sm"
                          disabled={isGeneratingCode}
                        />
                        
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/20">
                      <span className="text-purple-500 mt-0.5">💡</span>
                          <span>
                        AI will generate a complete solution based on your prompt, replacing the current code in the editor.
                          </span>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            disabled={isGeneratingCode}
                          >
                            Cancel
                          </button>
                          <motion.button
                            onClick={handleGenerateCode}
                        className="px-6 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-2 text-sm disabled:bg-purple-300 dark:disabled:bg-purple-900/30"
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
                                <span>Generate & Replace</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </>
                    ) : (
                      // Explain code UI
                      <>
                        <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/20">
                        <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-blue-500" />
                          Code Analysis
                            </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          AI will analyze your code and provide an in-depth explanation of its functionality, structure, and potential improvements.
                            </p>
                          </div>
                          
                      <p className="text-sm text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        Perfect for understanding complex code, learning new concepts, or improving your programming skills.
                          </p>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            disabled={isGeneratingCode}
                          >
                            Cancel
                          </button>
                          <motion.button
                            onClick={handleExplainCode}
                        className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm disabled:bg-blue-300 dark:disabled:bg-blue-900/30"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isGeneratingCode}
                          >
                            {isGeneratingCode ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Analyzing...</span>
                              </>
                            ) : (
                              <>
                                <Code2 className="w-4 h-4" />
                                <span>Analyze & Explain</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Refactoring Options Modal */}
          <AnimatePresence>
            {isRefactoringModalOpen && (
              <motion.div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsRefactoringModalOpen(false)}
              >
                <motion.div
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-200/50 dark:border-slate-700/50"
              initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <RotateCw className="w-5 h-5 text-green-500" />
                      Refactoring Suggestions
                    </h2>
                    <button
                      onClick={() => setIsRefactoringModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                  <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  
              <div className="p-5 overflow-y-auto max-h-[70vh]">
                    {isGeneratingRefactorOptions ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative w-12 h-12">
                          <div className="absolute inset-0 rounded-full border-3 border-green-500/30 animate-pulse" />
                          <div className="absolute inset-0 rounded-full border-3 border-green-500 border-t-transparent animate-spin" />
                        </div>
                        <p className="mt-4 text-slate-600 dark:text-slate-400">Analyzing code and generating refactoring options...</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">This may take a moment for complex code</p>
                      </div>
                    ) : (
                  <div className="space-y-5">
                        {refactoringOptions.length > 0 ? (
                          refactoringOptions.map((option, index) => (
                            <div 
                              key={index}
                              className={`border ${selectedRefactoring === index 
                            ? 'border-green-500 dark:border-green-500/50 bg-green-50 dark:bg-green-900/10' 
                            : 'border-slate-200 dark:border-slate-700'} 
                            rounded-lg p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors`}
                              onClick={() => setSelectedRefactoring(index)}
                            >
                          <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">
                                {option.title}
                              </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                {option.description}
                              </p>
                          <div className="max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-800 rounded">
                            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-md p-3 border border-slate-200 dark:border-slate-700">
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300 font-mono">
                                <code>{option.code}</code>
                              </pre>
                            </div>
                          </div>
                            </div>
                          ))
                        ) : (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-slate-600 dark:text-slate-400">
                              No refactoring options available. Try with a different code snippet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                      onClick={() => setIsRefactoringModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => selectedRefactoring !== null && applyRefactoring(selectedRefactoring)}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                      disabled={selectedRefactoring === null || isGeneratingCode}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Apply Selected Refactoring
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time Complexity Analysis Modal */}
          <AnimatePresence>
            {isTimeComplexityModalOpen && (
              <motion.div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsTimeComplexityModalOpen(false)}
              >
                <motion.div
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200/50 dark:border-slate-700/50"
              initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-red-500" />
                      Complexity Analysis
                    </h2>
                    <button
                      onClick={() => setIsTimeComplexityModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                  <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  
              <div className="p-5 overflow-y-auto max-h-[70vh]">
                    {isGeneratingCode ? (
                      <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-3 border-blue-500/30 animate-pulse" />
                      <div className="absolute inset-0 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
                    </div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">Analyzing code complexity...</p>
                      </div>
                    ) : complexityAnalysis ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/20">
                        <h3 className="text-base font-semibold mb-2 text-blue-800 dark:text-blue-300">Time Complexity</h3>
                            <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">{complexityAnalysis.time}</p>
                          </div>
                      <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-800/20">
                        <h3 className="text-base font-semibold mb-2 text-purple-800 dark:text-purple-300">Space Complexity</h3>
                            <p className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">{complexityAnalysis.space}</p>
                          </div>
                        </div>
                        
                        <div>
                      <h3 className="text-base font-semibold mb-2 text-slate-800 dark:text-slate-200">Explanation</h3>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <p className="whitespace-pre-wrap text-sm">{complexityAnalysis.explanation}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-slate-600 dark:text-slate-400">
                          No analysis available. Try with a different code snippet.
                        </p>
                      </div>
                    )}
                  </div>
                  
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/50">
                    <button
                      onClick={() => setIsTimeComplexityModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors text-sm"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Editor Area with improved shadows and borders */}
          <div className="flex-1 relative overflow-hidden border-t lg:border-t-0 border-slate-200 dark:border-slate-800 flex flex-col">
            {/* Enhanced Editor Toolbar */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-2 h-10">
              <div className="flex items-center overflow-x-auto hide-scrollbar">
                {/* File Tab with Icon */}
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 text-blue-700 dark:text-blue-400 text-sm font-medium max-w-[200px] truncate"
                  title={fileName || `untitled.${selectedLanguage.id === 'javascript' ? 'js' : selectedLanguage.id === 'python' ? 'py' : 'java'}`}
                >
                  {selectedLanguage.id === 'javascript' && <FileCode className="w-3.5 h-3.5 text-yellow-500" />}
                  {selectedLanguage.id === 'python' && <FileCode className="w-3.5 h-3.5 text-green-500" />}
                  {selectedLanguage.id === 'java' && <FileCode className="w-3.5 h-3.5 text-orange-500" />}
                  {fileName || `untitled.${selectedLanguage.id === 'javascript' ? 'js' : selectedLanguage.id === 'python' ? 'py' : 'java'}`}
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Improved button styles */}
                <button 
                  onClick={handleSave}
                  className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                    isSaving 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed" 
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  }`}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {isSaving ? "Saving..." : "Save"}
                </button>
                
                <button 
                  onClick={handleRunCode}
                  className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                    isRunning 
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 cursor-not-allowed" 
                      : "bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 dark:border-blue-500"
                  }`}
                  disabled={isRunning}
                >
                  {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                  {isRunning ? "Running..." : "Run Code"}
                </button>
                
                <button 
                  onClick={() => {
                    const editorValue = editorRef.current?.getValue() || "";
                    navigator.clipboard.writeText(editorValue);
                    toast.success("Code copied to clipboard");
                  }}
                  className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Copy code"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Language selection with improved dropdown */}
                <div className="relative" ref={languageDropdownRef}>
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 relative z-10"
                    title="Change language"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                  
                  {showLanguageDropdown && (
                     <motion.div 
                       className="absolute mt-2 left-0 w-48 origin-top-right bg-white dark:bg-slate-900 shadow-lg rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden z-10"
                       initial={{ opacity: 0, y: -5 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.15 }}
                     >
                      <div className="py-1">
                        {languageOptions.map((lang) => (
                          <button
                            key={lang.id}
                            className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                              selectedLanguage.id === lang.id
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            onClick={() => {
                              setShowLanguageDropdown(false);
                              setSelectedLanguage(lang);
                            }}
                          >
                            {lang.id === 'javascript' && <FontAwesomeIcon icon={faJs} className="text-yellow-500" />}
                            {lang.id === 'python' && <FontAwesomeIcon icon={faPython} className="text-green-500" />}
                            {lang.id === 'java' && <FontAwesomeIcon icon={faJava} className="text-orange-500" />}
                            {lang.name}
                            {selectedLanguage.id === lang.id && (
                              <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-blue-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Editor with improved loading state */}
            <div className="relative flex-1">
              {isLoadingFile ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 bg-opacity-90 dark:bg-opacity-90 z-10">
                  <motion.div 
                    className="flex flex-col items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Loading file...</p>
                  </motion.div>
                </div>
              ) : (
                <>
                  <div 
                    ref={monacoContainerRef} 
                    className="w-full h-full transition-all" 
                    style={{ 
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  />
                </>
              )}
              
              {/* Enhanced Typing Animation Indicator */}
              {isTypingAnimation && (
                <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-lg z-10">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                  <span>Generating code...</span>
                </div>
              )}
            </div>
          </div>
        </div>
  );
} // Removed the extra semicolon and comment

export default CodeEditor;
