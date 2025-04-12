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
    } catch (error) {
      console.error("Failed to save file:", error);
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

    return () => {
      if (socket) {
        socket.disconnect();
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

  const handleGenerateCode = async () => {
    if (!codePrompt.trim() || !editorRef) return;
    
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
      
      // Step 2: Split code into lines
      const lines = generatedCode.split('\n');
      
      // Function to type text with animation
      const typeText = async () => {
        let currentPosition = { lineNumber: 1, column: 1 };
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          
          // Insert line break if needed
          if (lineIndex > 0) {
            model.pushEditOperations(
              [],
              [{
                range: new monaco.Range(
                  currentPosition.lineNumber,
                  currentPosition.column,
                  currentPosition.lineNumber,
                  currentPosition.column
                ),
                text: '\n'
              }],
              () => null
            );
            currentPosition = { lineNumber: currentPosition.lineNumber + 1, column: 1 };
            await new Promise(resolve => setTimeout(resolve, 20)); // Pause between lines (2.5x faster)
          }
          
          // Type each character in the line
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            
            // Insert character at current position
            model.pushEditOperations(
              [],
              [{
                range: new monaco.Range(
                  currentPosition.lineNumber,
                  currentPosition.column,
                  currentPosition.lineNumber,
                  currentPosition.column
                ),
                text: char
              }],
              () => null
            );
            
            // Update cursor position
            currentPosition = {
              lineNumber: currentPosition.lineNumber,
              column: currentPosition.column + 1
            };
            editorRef.setPosition(currentPosition);
            
            // Random delay between 8-20ms (2.5x faster)
            await new Promise(resolve => 
              setTimeout(resolve, Math.floor(Math.random() * 2) + 5)
            );
          }
        }
        
        // Animation complete
        setIsGeneratingCode(false);
        
        // Final cursor position (already set by the loop)
        editorRef.setPosition(currentPosition);
        
        // Show completion message
        setOutput(`✅ Successfully generated and applied ${selectedLanguage.name} code!

🔍 Prompt: "${codePrompt}"

💡 The code has been generated and applied to the editor.`);
        
        // Reset prompt
        setCodePrompt("");
      };
      
      // Start the typing animation
      typeText().catch(error => {
        console.error("Error during typing animation:", error);
        // Fallback: insert code immediately if animation fails
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
          toast.info("No code issues found - your code looks good!");
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
    
    setIsGeneratingCode(true);
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
        // Extract JSON from the response
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : resultText;
        const result = JSON.parse(jsonString);
        
        if (result.refactoringOptions && Array.isArray(result.refactoringOptions)) {
          setRefactoringOptions(result.refactoringOptions);
        } else {
          // Set empty array but with a message
          setRefactoringOptions([]);
          toast.info("No refactoring suggestions available for this code");
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        toast.error("Failed to generate refactoring options");
      }
    } catch (error) {
      console.error("Error generating refactoring options:", error);
      toast.error("Failed to generate refactoring options");
    } finally {
      setIsGeneratingCode(false);
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
                                      {/* Show language-specific icon with Font Awesome */}
                                      <span className="mr-2 w-5 h-5 flex-shrink-0 flex items-center justify-center">
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

                {/* New AI tooling dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowAiToolsDropdown(!showAiToolsDropdown)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <span className="hidden md:inline">AI Tools</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showAiToolsDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            setShowAiToolsDropdown(false);
                            setGenerationMode('generate');
                            setIsGenerateModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Code2 className="w-4 h-4 text-purple-500" />
                          <span>Generate Code</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowAiToolsDropdown(false);
                            setGenerationMode('explain');
                            setIsGenerateModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Terminal className="w-4 h-4 text-blue-500" />
                          <span>Explain Code</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowAiToolsDropdown(false);
                            handleDetectCodeSmells();
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span>Detect Code Smells</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowAiToolsDropdown(false);
                            handleGenerateRefactoringOptions();
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <RotateCw className="w-4 h-4 text-green-500" />
                          <span>Suggest Refactoring</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowAiToolsDropdown(false);
                            analyzeTimeComplexity();
                          }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-red-500" />
                          <span>Analyze Complexity</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                      AI Code Assistant
                    </h3>
                    <button
                      onClick={() => !isGeneratingCode && setIsGenerateModalOpen(false)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      disabled={isGeneratingCode}
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  
                  {/* Mode selector tabs */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setGenerationMode('generate')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        generationMode === 'generate'
                          ? 'text-purple-600 border-b-2 border-purple-500 dark:text-purple-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      Generate Code
                    </button>
                    <button
                      onClick={() => setGenerationMode('explain')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        generationMode === 'explain'
                          ? 'text-purple-600 border-b-2 border-purple-500 dark:text-purple-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      Explain Code
                    </button>
                  </div>
                  
                  <div className="p-6">
                    {generationMode === 'generate' ? (
                      // Generate code UI
                      <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Describe what code you want to generate:
                        </label>
                        <textarea
                          value={codePrompt}
                          onChange={(e) => setCodePrompt(e.target.value)}
                          placeholder="E.g., Create a binary search tree implementation with insert and search methods"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[120px] resize-none"
                          disabled={isGeneratingCode}
                        />
                        
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-purple-500">Note:</span>
                          <span>
                            The AI will analyze your current code and generate a completely new solution
                            based on your prompt. All existing code will be replaced.
                          </span>
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
                          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <Terminal className="w-4 h-4 text-purple-500" />
                              Current Code
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              The AI will analyze and explain the code currently in your editor.
                            </p>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Get an in-depth explanation of your code's functionality, structure, algorithms,
                            and best practices. This can help you understand complex code or learn new programming concepts.
                          </p>
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
                            onClick={handleExplainCode}
                            className="px-6 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-2"
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
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsRefactoringModalOpen(false)}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <RotateCw className="w-5 h-5 text-green-500" />
                      Refactoring Suggestions
                    </h2>
                    <button
                      onClick={() => setIsRefactoringModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {isGeneratingCode ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Generating refactoring options...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {refactoringOptions.length > 0 ? (
                          refactoringOptions.map((option, index) => (
                            <div 
                              key={index}
                              className={`border ${selectedRefactoring === index 
                                ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20' 
                                : 'border-gray-200 dark:border-gray-700'} 
                                rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                              onClick={() => setSelectedRefactoring(index)}
                            >
                              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
                                {option.title}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400 mb-3">
                                {option.description}
                              </p>
                              <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-3">
                                <pre className="text-sm overflow-x-auto max-h-32 whitespace-pre-wrap">
                                  <code>{option.code}</code>
                                </pre>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">
                              No refactoring options available. Try with a different code snippet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                      onClick={() => setIsRefactoringModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => selectedRefactoring !== null && applyRefactoring(selectedRefactoring)}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsTimeComplexityModalOpen(false)}
              >
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-red-500" />
                      Complexity Analysis
                    </h2>
                    <button
                      onClick={() => setIsTimeComplexityModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {isGeneratingCode ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Analyzing code complexity...</p>
                      </div>
                    ) : complexityAnalysis ? (
                      <div className="space-y-6">
                        <div className="flex gap-6">
                          <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-300">Time Complexity</h3>
                            <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">{complexityAnalysis.time}</p>
                          </div>
                          <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                            <h3 className="text-lg font-semibold mb-2 text-purple-800 dark:text-purple-300">Space Complexity</h3>
                            <p className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">{complexityAnalysis.space}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Explanation</h3>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-gray-700 dark:text-gray-300">
                            <p className="whitespace-pre-wrap">{complexityAnalysis.explanation}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600 dark:text-gray-400">
                          No analysis available. Try with a different code snippet.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                      onClick={() => setIsTimeComplexityModalOpen(false)}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
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

<style jsx>{`
  .errorLineDecoration {
    background: rgba(255, 0, 0, 0.1);
    border-left: 3px solid #ff5252;
  }
  .warningLineDecoration {
    background: rgba(255, 204, 0, 0.1);
    border-left: 3px solid #ffcc00;
  }
  .errorGlyphMargin {
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16' fill='%23ff5252'%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z'/%3E%3C/svg%3E") center center no-repeat;
  }
  .warningGlyphMargin {
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16' fill='%23ffcc00'%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z'/%3E%3C/svg%3E") center center no-repeat;
  }
`}</style>