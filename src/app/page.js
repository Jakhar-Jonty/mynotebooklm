"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, File, X, Send, Loader2, FileText, Image, Video, FileJson, Plus, MessageCircle, Bot, Menu, Paperclip, Maximize2, Minimize2 } from "lucide-react"

export default function EnhancedMobileNotebookInterface() {
  const [resources, setResources] = useState([])
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "assistant",
      content: "Hello! Upload some resources and I'll help you analyze them. I can work with images, videos, PDFs, text files, JSON, and more.",
      timestamp: new Date().toISOString(),
    },
  ])

  const [inputMessage, setInputMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inputExpanded, setInputExpanded] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputMessage])

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
    if (type.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />
    if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
    if (type === 'application/json') return <FileJson className="h-4 w-4 text-green-500" />
    return <File className="h-4 w-4 text-gray-500" />
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFiles = async (files) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadedResources = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress(((i + 1) / files.length) * 100)

        const formData = new FormData()
        formData.append("file", file)
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
        
        const data = await response.json()
        
        const newResource = {
          id: Date.now().toString() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          serverPath: data.file?.path || '',
          filename: data.file?.filename || file.name
        }
        
        uploadedResources.push(newResource)
      }

      setResources((prev) => [...prev, ...uploadedResources])
      
      // Add a system message about successful upload
      const uploadMessage = {
        id: Date.now().toString() + '_upload',
        type: "system",
        content: `Successfully uploaded ${uploadedResources.length} file${uploadedResources.length > 1 ? 's' : ''}: ${uploadedResources.map(r => r.name).join(', ')}`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, uploadMessage])

    } catch (error) {
      console.error("Upload error:", error)
      const errorMessage = {
        id: Date.now().toString() + '_error',
        type: "error",
        content: `Upload failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const removeResource = async (id) => {
    setResources((prev) => prev.filter((resource) => resource.id !== id))
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    }

    // Add user message immediately
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputMessage("")
    setIsSending(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          messages: updatedMessages, 
          userId: "anonymous", 
          sessionId: "default",
          resources: resources
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()
      
      const aiResponse = {
        id: data.id || (Date.now() + 1).toString(),
        type: "assistant",
        content: data.message || data.content || "Sorry, I couldn't process your request.",
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiResponse])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage = {
        id: Date.now().toString() + '_chat_error',
        type: "error",
        content: "Sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Resources */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-50 w-full max-w-sm lg:max-w-none lg:w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 flex flex-col shadow-xl lg:shadow-lg transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 lg:p-6 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                Resources
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Enhanced Upload Area */}
          <div
            className={`border-2 border-dashed rounded-2xl p-4 lg:p-6 text-center transition-all duration-300 ${
              dragActive
                ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 scale-[1.02] shadow-lg"
                : "border-slate-300/60 dark:border-slate-600/60 hover:border-blue-300 hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50/30 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 hover:shadow-md"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full px-2 py-1 text-xs font-bold text-blue-600 shadow-md">
                    {Math.round(uploadProgress)}%
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Uploading files...</p>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-3 lg:p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-3 transform hover:scale-105 transition-transform duration-200">
                  <Upload className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Drop files here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 px-2">
                  Images, videos, PDFs, text, JSON and more
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/80 dark:bg-slate-700/80 hover:bg-blue-50 dark:hover:bg-slate-600 border-blue-200/60 dark:border-slate-600/60 text-blue-600 dark:text-blue-400 font-medium hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.txt,.json,.doc,.docx,.xls,.xlsx,.vtt,.srt"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Resources List */}
        <ScrollArea className="flex-1 p-3 lg:p-4">
          <div className="space-y-3">
            {resources.map((resource) => (
              <Card key={resource.id} className="p-3 lg:p-4 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-600/60 hover:shadow-lg hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.01] group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="p-2 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-200">
                      {getFileIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                        {resource.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {formatFileSize(resource.size)}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatTimestamp(resource.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResource(resource.id)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 hover:scale-110"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}

            {resources.length === 0 && (
              <div className="text-center py-8 lg:py-12">
                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <File className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-1">No resources yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Upload files to get started
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Side - Chat */}
      <div className="flex-1 flex flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
        {/* Enhanced Chat Header */}
        <div className="p-4 lg:p-6 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-slate-50/80 via-blue-50/40 to-indigo-50/40 dark:from-slate-800/80 dark:via-slate-700/60 dark:to-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden p-2 h-10 w-10 bg-white/80 dark:bg-slate-700/80 shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  AI Assistant
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Analyze your resources with AI
                </p>
              </div>
            </div>
            {resources.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
                <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {resources.length} file{resources.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Messages */}
        <ScrollArea className="flex-1 p-3 lg:p-6">
          <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex items-start gap-2 lg:gap-3 ${
                message.type === "user" ? "flex-row-reverse" : ""
              } animate-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${index * 50}ms` }}>
                {/* Enhanced Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full lg:rounded-2xl flex items-center justify-center shadow-lg ${
                  message.type === "user" 
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600" 
                    : message.type === "system"
                    ? "bg-gradient-to-br from-green-500 to-emerald-600"
                    : message.type === "error"
                    ? "bg-gradient-to-br from-red-500 to-rose-600"
                    : "bg-gradient-to-br from-slate-500 to-slate-700"
                }`}>
                  {message.type === "user" ? (
                    <div className="w-3 h-3 lg:w-4 lg:h-4 bg-white rounded-full" />
                  ) : message.type === "system" ? (
                    <Upload className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                  ) : message.type === "error" ? (
                    <X className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                  ) : (
                    <Bot className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                  )}
                </div>

                {/* Enhanced Message Content */}
                <div className={`max-w-[85%] lg:max-w-[75%] ${
                  message.type === "user" ? "text-right" : "text-left"
                }`}>
                  <div className={`rounded-2xl lg:rounded-3xl px-3 py-2 lg:px-4 lg:py-3 shadow-md hover:shadow-lg transition-shadow duration-200 ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                      : message.type === "system"
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-200 border border-green-200/60 dark:border-green-700/60"
                      : message.type === "error"
                      ? "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 text-red-800 dark:text-red-200 border border-red-200/60 dark:border-red-700/60"
                      : "bg-white/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {message.content}
                    </p>
                  </div>
                  <p className={`text-xs opacity-70 mt-2 ${
                    message.type === "user" ? "text-right" : "text-left"
                  } text-slate-500 dark:text-slate-400 font-medium`}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Enhanced Typing Indicator */}
            {isSending && (
              <div className="flex items-start gap-2 lg:gap-3 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-slate-500 to-slate-700 rounded-full lg:rounded-2xl flex items-center justify-center shadow-lg">
                  <Bot className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                </div>
                <div className="bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl px-3 py-2 lg:px-4 lg:py-3 shadow-md border border-slate-200/60 dark:border-slate-600/60">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Enhanced Message Input */}
        <div className="p-3 lg:p-6 border-t border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-slate-50/80 via-blue-50/20 to-indigo-50/20 dark:from-slate-800/80 dark:via-slate-700/40 dark:to-slate-800/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            <div className={`flex gap-2 lg:gap-3 items-end transition-all duration-300 ${inputExpanded ? 'flex-col' : ''}`}>
              {/* File attachment button for mobile */}
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden flex-shrink-0 h-12 w-12 rounded-2xl bg-white/80 dark:bg-slate-700/80 border-slate-300/60 dark:border-slate-600/60 hover:bg-blue-50 dark:hover:bg-slate-600 shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </Button>
              
              <div className={`relative flex-1 ${inputExpanded ? 'w-full' : ''}`}>
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask a question about your resources..."
                  className="w-full bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm border border-slate-300/60 dark:border-slate-600/60 focus:border-blue-500 dark:focus:border-blue-400 rounded-2xl lg:rounded-3xl px-4 py-3 lg:px-5 lg:py-4 text-sm font-medium resize-none min-h-[48px] max-h-[120px] shadow-md focus:shadow-lg transition-all duration-200 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isSending) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  disabled={isSending}
                  rows={1}
                />
                
                {/* Expand/Collapse button for mobile */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden absolute right-2 top-2 h-8 w-8 p-0 rounded-xl"
                  onClick={() => setInputExpanded(!inputExpanded)}
                >
                  {inputExpanded ? 
                    <Minimize2 className="h-3.5 w-3.5 text-slate-500" /> : 
                    <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                  }
                </Button>
              </div>
              
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || isSending}
                className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl lg:rounded-3xl h-12 w-12 lg:h-auto lg:w-auto lg:px-6 lg:py-4 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 lg:h-5 lg:w-5" />
                )}
                <span className="hidden lg:inline ml-2 font-semibold">Send</span>
              </Button>
            </div>
            
            <div className="text-center mt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
                <span className="sm:hidden">Tap send or press Enter to send message</span>
              </p>
            </div>
            
            {/* Mobile resource count indicator */}
            {resources.length > 0 && (
              <div className="flex sm:hidden justify-center mt-2">
                <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
                  <Paperclip className="h-3 w-3 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {resources.length} file{resources.length > 1 ? 's' : ''} attached
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// "use client"

// import { useState, useRef, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Card } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { Upload, File, X, Send, Loader2, FileText, Image, Video, FileJson, Plus, MessageCircle, Bot } from "lucide-react"

// export default function ImprovedNotebookInterface() {
//   const [resources, setResources] = useState([])
//   const [messages, setMessages] = useState([
//     {
//       id: 1,
//       type: "assistant",
//       content: "Hello! Upload some resources and I'll help you analyze them. I can work with images, videos, PDFs, text files, JSON, and more.",
//       timestamp: new Date().toISOString(),
//     },
//   ])

//   const [inputMessage, setInputMessage] = useState("")
//   const [isUploading, setIsUploading] = useState(false)
//   const [isSending, setIsSending] = useState(false)
//   const [dragActive, setDragActive] = useState(false)
//   const [uploadProgress, setUploadProgress] = useState(0)
//   const fileInputRef = useRef(null)
//   const messagesEndRef = useRef(null)

//   // Auto scroll to bottom when new messages are added
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages])

//   const getFileIcon = (type) => {
//     if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
//     if (type.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />
//     if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
//     if (type === 'application/json') return <FileJson className="h-4 w-4 text-green-500" />
//     return <File className="h-4 w-4 text-gray-500" />
//   }

//   const handleDrag = (e) => {
//     e.preventDefault()
//     e.stopPropagation()
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true)
//     } else if (e.type === "dragleave") {
//       setDragActive(false)
//     }
//   }

//   const handleDrop = (e) => {
//     e.preventDefault()
//     e.stopPropagation()
//     setDragActive(false)

//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       handleFiles(e.dataTransfer.files)
//     }
//   }

//   const handleFiles = async (files) => {
//     setIsUploading(true)
//     setUploadProgress(0)

//     try {
//       const uploadedResources = []
      
//       for (let i = 0; i < files.length; i++) {
//         const file = files[i]
//         setUploadProgress(((i + 1) / files.length) * 100)

//         const formData = new FormData()
//         formData.append("file", file)
        
//         const response = await fetch("/api/upload", {
//           method: "POST",
//           body: formData,
//         })
        
//         if (!response.ok) {
//           throw new Error(`Failed to upload ${file.name}`)
//         }
        
//         const data = await response.json()
        
//         const newResource = {
//           id: Date.now().toString() + i,
//           name: file.name,
//           size: file.size,
//           type: file.type,
//           uploadedAt: new Date().toISOString(),
//           serverPath: data.file?.path || '',
//           filename: data.file?.filename || file.name
//         }
        
//         uploadedResources.push(newResource)
//       }

//       setResources((prev) => [...prev, ...uploadedResources])
      
//       // Add a system message about successful upload
//       const uploadMessage = {
//         id: Date.now().toString() + '_upload',
//         type: "system",
//         content: `Successfully uploaded ${uploadedResources.length} file${uploadedResources.length > 1 ? 's' : ''}: ${uploadedResources.map(r => r.name).join(', ')}`,
//         timestamp: new Date().toISOString(),
//       }
//       setMessages((prev) => [...prev, uploadMessage])

//     } catch (error) {
//       console.error("Upload error:", error)
//       const errorMessage = {
//         id: Date.now().toString() + '_error',
//         type: "error",
//         content: `Upload failed: ${error.message}`,
//         timestamp: new Date().toISOString(),
//       }
//       setMessages((prev) => [...prev, errorMessage])
//     } finally {
//       setIsUploading(false)
//       setUploadProgress(0)
//     }
//   }

//   const removeResource = async (id) => {
//     setResources((prev) => prev.filter((resource) => resource.id !== id))
    
//     // Optionally, you could add an API call here to delete the file from the server
//     // const resource = resources.find(r => r.id === id)
//     // if (resource) {
//     //   await fetch(`/api/upload/${resource.filename}`, { method: 'DELETE' })
//     // }
//   }

//   const sendMessage = async () => {
//     if (!inputMessage.trim()) return

//     const userMessage = {
//       id: Date.now().toString(),
//       type: "user",
//       content: inputMessage,
//       timestamp: new Date().toISOString(),
//     }

//     // Add user message immediately
//     const updatedMessages = [...messages, userMessage]
//     setMessages(updatedMessages)
//     setInputMessage("")
//     setIsSending(true)

//     try {
//       const response = await fetch("/api/chat", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ 
//           messages: updatedMessages, 
//           userId: "anonymous", 
//           sessionId: "default",
//           resources: resources // Include uploaded resources in the request
//         }),
//       })

//       if (!response.ok) {
//         throw new Error("Failed to send message")
//       }

//       const data = await response.json()
      
//       const aiResponse = {
//         id: data.id || (Date.now() + 1).toString(),
//         type: "assistant",
//         content: data.message || data.content || "Sorry, I couldn't process your request.",
//         timestamp: new Date().toISOString(),
//       }

//       setMessages((prev) => [...prev, aiResponse])
//     } catch (error) {
//       console.error("Chat error:", error)
//       const errorMessage = {
//         id: Date.now().toString() + '_chat_error',
//         type: "error",
//         content: "Sorry, I encountered an error while processing your message. Please try again.",
//         timestamp: new Date().toISOString(),
//       }
//       setMessages((prev) => [...prev, errorMessage])
//     } finally {
//       setIsSending(false)
//     }
//   }

//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return "0 Bytes"
//     const k = 1024
//     const sizes = ["Bytes", "KB", "MB", "GB"]
//     const i = Math.floor(Math.log(bytes) / Math.log(k))
//     return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
//   }

//   const formatTimestamp = (timestamp) => {
//     return new Date(timestamp).toLocaleTimeString("en-US", {
//       hour: "2-digit",
//       minute: "2-digit",
//     })
//   }

//   return (
//     <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
//       {/* Left Sidebar - Resources */}
//       <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-lg">
//         <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
//           <div className="flex items-center gap-2 mb-4">
//             <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
//               <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
//             </div>
//             <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">My Resources</h1>
//           </div>

//           {/* Upload Area */}
//           <div
//             className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
//               dragActive
//                 ? "border-blue-400 bg-blue-50 dark:bg-blue-950 scale-105"
//                 : "border-slate-300 dark:border-slate-600 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-700"
//             }`}
//             onDragEnter={handleDrag}
//             onDragLeave={handleDrag}
//             onDragOver={handleDrag}
//             onDrop={handleDrop}
//           >
//             {isUploading ? (
//               <div className="flex flex-col items-center">
//                 <div className="relative mb-3">
//                   <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <div className="text-xs font-semibold text-blue-600">
//                       {Math.round(uploadProgress)}%
//                     </div>
//                   </div>
//                 </div>
//                 <p className="text-sm text-slate-600 dark:text-slate-300">Uploading files...</p>
//                 <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mt-2">
//                   <div 
//                     className="bg-blue-500 h-2 rounded-full transition-all duration-300"
//                     style={{ width: `${uploadProgress}%` }}
//                   ></div>
//                 </div>
//               </div>
//             ) : (
//               <div className="flex flex-col items-center">
//                 <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-3">
//                   <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
//                 </div>
//                 <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
//                   Drop files here or click to browse
//                 </p>
//                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
//                   Images, videos, PDFs, text, JSON and more
//                 </p>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => fileInputRef.current?.click()}
//                   className="bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border-blue-200 dark:border-slate-600 text-blue-600 dark:text-blue-400"
//                 >
//                   <Plus className="h-4 w-4 mr-2" />
//                   Choose Files
//                 </Button>
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   multiple
//                   accept="image/*,video/*,.pdf,.txt,.json,.doc,.docx,.xls,.xlsx,.vtt,.srt"
//                   className="hidden"
//                   onChange={(e) => handleFiles(e.target.files)}
//                 />
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Resources List */}
//         <ScrollArea className="flex-1 p-4">
//           <div className="space-y-3">
//             {resources.map((resource) => (
//               <Card key={resource.id} className="p-4 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
//                 <div className="flex items-start justify-between">
//                   <div className="flex items-start space-x-3 flex-1">
//                     <div className="p-2 bg-slate-100 dark:bg-slate-600 rounded-lg">
//                       {getFileIcon(resource.type)}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate mb-1">
//                         {resource.name}
//                       </p>
//                       <p className="text-xs text-slate-500 dark:text-slate-400">
//                         {formatFileSize(resource.size)}
//                       </p>
//                       <p className="text-xs text-slate-400 dark:text-slate-500">
//                         {formatTimestamp(resource.uploadedAt)}
//                       </p>
//                     </div>
//                   </div>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => removeResource(resource.id)}
//                     className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
//                   >
//                     <X className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </Card>
//             ))}

//             {resources.length === 0 && (
//               <div className="text-center py-12">
//                 <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
//                   <File className="h-8 w-8 text-slate-400" />
//                 </div>
//                 <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No resources yet</p>
//                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
//                   Upload files to get started
//                 </p>
//               </div>
//             )}
//           </div>
//         </ScrollArea>
//       </div> 

//       {/* Right Side - Chat */}
//       <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
//         {/* Chat Header */}
//         <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
//           <div className="flex items-center gap-3">
//             <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
//               <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
//             </div>
//             <div>
//               <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">AI Assistant</h2>
//               <p className="text-sm text-slate-600 dark:text-slate-300">
//                 Ask questions about your uploaded resources
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Messages */}
//         <ScrollArea className="flex-1 p-6">
//           <div className="space-y-6 max-w-4xl mx-auto">
//             {messages.map((message) => (
//               <div key={message.id} className={`flex items-start gap-3 ${
//                 message.type === "user" ? "flex-row-reverse" : ""
//               }`}>
//                 {/* Avatar */}
//                 <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
//                   message.type === "user" 
//                     ? "bg-blue-500" 
//                     : message.type === "system"
//                     ? "bg-green-500"
//                     : message.type === "error"
//                     ? "bg-red-500"
//                     : "bg-slate-500"
//                 }`}>
//                   {message.type === "user" ? (
//                     <div className="w-5 h-5 bg-white rounded-full" />
//                   ) : message.type === "system" ? (
//                     <Upload className="h-4 w-4 text-white" />
//                   ) : message.type === "error" ? (
//                     <X className="h-4 w-4 text-white" />
//                   ) : (
//                     <Bot className="h-4 w-4 text-white" />
//                   )}
//                 </div>

//                 {/* Message Content */}
//                 <div className={`max-w-[75%] ${
//                   message.type === "user" ? "text-right" : "text-left"
//                 }`}>
//                   <div className={`rounded-2xl px-4 py-3 ${
//                     message.type === "user"
//                       ? "bg-blue-500 text-white"
//                       : message.type === "system"
//                       ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700"
//                       : message.type === "error"
//                       ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700"
//                       : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
//                   }`}>
//                     <p className="text-sm leading-relaxed whitespace-pre-wrap">
//                       {message.content}
//                     </p>
//                   </div>
//                   <p className={`text-xs opacity-60 mt-2 ${
//                     message.type === "user" ? "text-right" : "text-left"
//                   } text-slate-500 dark:text-slate-400`}>
//                     {formatTimestamp(message.timestamp)}
//                   </p>
//                 </div>
//               </div>
//             ))}
            
//             {/* Typing Indicator */}
//             {isSending && (
//               <div className="flex items-start gap-3">
//                 <div className="flex-shrink-0 w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
//                   <Bot className="h-4 w-4 text-white" />
//                 </div>
//                 <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
//                   <div className="flex space-x-1">
//                     <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
//                     <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
//                     <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
//                   </div>
//                 </div>
//               </div>
//             )}
            
//             <div ref={messagesEndRef} />
//           </div>
//         </ScrollArea>

//         {/* Message Input */}
//         <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
//           <div className="flex space-x-3 max-w-4xl mx-auto">
//             <Input
//               value={inputMessage}
//               onChange={(e) => setInputMessage(e.target.value)}
//               placeholder="Ask a question about your resources..."
//               className="flex-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl px-4 py-3 text-sm"
//               onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
//               disabled={isSending}
//             />
//             <Button 
//               onClick={sendMessage} 
//               disabled={!inputMessage.trim() || isSending}
//               className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 py-3 transition-all duration-200 disabled:opacity-50"
//             >
//               {isSending ? (
//                 <Loader2 className="h-4 w-4 animate-spin" />
//               ) : (
//                 <Send className="h-4 w-4" />
//               )}
//             </Button>
//           </div>
//           <div className="text-center mt-3">
//             <p className="text-xs text-slate-500 dark:text-slate-400">
//               Press Enter to send, Shift+Enter for new line
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }















