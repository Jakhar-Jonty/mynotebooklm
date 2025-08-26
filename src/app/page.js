"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, File, X, Send, Loader2, FileText, Image, Video, FileJson, Plus, MessageCircle, Bot } from "lucide-react"

export default function ImprovedNotebookInterface() {
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
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    
    // Optionally, you could add an API call here to delete the file from the server
    // const resource = resources.find(r => r.id === id)
    // if (resource) {
    //   await fetch(`/api/upload/${resource.filename}`, { method: 'DELETE' })
    // }
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
          resources: resources // Include uploaded resources in the request
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Left Sidebar - Resources */}
      <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-lg">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">My Resources</h1>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
              dragActive
                ? "border-blue-400 bg-blue-50 dark:bg-blue-950 scale-105"
                : "border-slate-300 dark:border-slate-600 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="relative mb-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xs font-semibold text-blue-600">
                      {Math.round(uploadProgress)}%
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Uploading files...</p>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-3">
                  <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Images, videos, PDFs, text, JSON and more
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border-blue-200 dark:border-slate-600 text-blue-600 dark:text-blue-400"
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
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {resources.map((resource) => (
              <Card key={resource.id} className="p-4 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-slate-100 dark:bg-slate-600 rounded-lg">
                      {getFileIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate mb-1">
                        {resource.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
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
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {resources.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <File className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No resources yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Upload files to get started
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div> 

      {/* Right Side - Chat */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {/* Chat Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">AI Assistant</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Ask questions about your uploaded resources
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-3 ${
                message.type === "user" ? "flex-row-reverse" : ""
              }`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === "user" 
                    ? "bg-blue-500" 
                    : message.type === "system"
                    ? "bg-green-500"
                    : message.type === "error"
                    ? "bg-red-500"
                    : "bg-slate-500"
                }`}>
                  {message.type === "user" ? (
                    <div className="w-5 h-5 bg-white rounded-full" />
                  ) : message.type === "system" ? (
                    <Upload className="h-4 w-4 text-white" />
                  ) : message.type === "error" ? (
                    <X className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`max-w-[75%] ${
                  message.type === "user" ? "text-right" : "text-left"
                }`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === "user"
                      ? "bg-blue-500 text-white"
                      : message.type === "system"
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700"
                      : message.type === "error"
                      ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  <p className={`text-xs opacity-60 mt-2 ${
                    message.type === "user" ? "text-right" : "text-left"
                  } text-slate-500 dark:text-slate-400`}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isSending && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
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

        {/* Message Input */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="flex space-x-3 max-w-4xl mx-auto">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about your resources..."
              className="flex-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl px-4 py-3 text-sm"
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={isSending}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || isSending}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 py-3 transition-all duration-200 disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-center mt-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}



















// "use client"

// import { useState, useRef } from "react"
// import { Button } from "@/components/ui/button"
// import { Card } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { Upload, File, X, Send, Loader2 } from "lucide-react"


// export default function NotebookLMInterface() {
//   const [resources, setResources] = useState([])
//   const [messages, setMessages] = useState([
//     {
//       id: 1,
//       type: "assistant",
//       content: "Hello! Upload some resources and I'll help you analyze them.",
//       timestamp: new Date().toISOString(),
//     },
//   ])

//   const [inputMessage, setInputMessage] = useState("")
//   const [isUploading, setIsUploading] = useState(false)
//   const [dragActive, setDragActive] = useState(false)
//   const fileInputRef = useRef(null)

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

//     // Simulate upload delay
//     // await new Promise((resolve) => setTimeout(resolve, 1500))

//     const formData = new FormData()
//     formData.append("file", files[0])
//     const response = await fetch("/api/upload", {
//       method: "POST",
//       body: formData,
//     })
    
//     if (!response.ok) {
//       throw new Error("Failed to upload file")
//     }
    
//     const data = await response.json()
    
//     console.log("Uploaded file:", data)

//     const newResources = Array.from(files).map((file, index) => ({
//       id: Date.now().toString() + index,
//       name: file.name,
//       size: file.size,
//       type: file.type,
//       uploadedAt: new Date().toISOString(),
//     }))

//     setResources((prev) => [...prev, ...newResources])
//     setIsUploading(false)
//   }

//   const removeResource = (id) => {
//     setResources((prev) => prev.filter((resource) => resource.id !== id))
//   }

//   const sendMessage = async () => {
//     if (!inputMessage.trim()) return

//     const newMessage = {
//       id: Date.now().toString(),
//       type: "user",
//       content: inputMessage,
//       timestamp: new Date(),
//     }

//     setMessages((prev) => [...prev, newMessage])
//     setInputMessage("")

//     // const formData = new FormData()
//     // formData.append("message", inputMessage)
//     const response = await fetch("/api/chat", {
//       method: "POST",
//       body: JSON.stringify({ messages: messages, userId: "anonymous", sessionId: "default" }),
//     })

//     if (!response.ok) {
//       throw new Error("Failed to send message")
//     }

//     const data = await response.json()
//     console.log("AI response:", data.message)

//     setMessages((prev) => [...prev, data.message])
//     // Simulate AI response
//     // setTimeout(() => {
//       // const aiResponse = {
//       //   id: Date.now().toString() + 1,
//       //   type: "assistant",
//       //   content: data.message,
//       //   timestamp: new Date().toISOString(),
//       // }
//       // setMessages((prev) => [...prev, data.message])
//     // }, 1000)
//   }

//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return "0 Bytes"
//     const k = 1024
//     const sizes = ["Bytes", "KB", "MB", "GB"]
//     const i = Math.floor(Math.log(bytes) / Math.log(k))
//     return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
//   }

//   return (
//     <div className="flex h-screen bg-background">
//       {/* Left Sidebar - Resources */}
//       <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
//         <div className="p-6 border-b border-sidebar-border">
//           <h1 className="text-xl font-semibold text-sidebar-foreground mb-4">My Resources</h1>

//           {/* Upload Area */}
//           <div
//             className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
//               dragActive
//                 ? "border-sidebar-accent bg-sidebar-accent/10"
//                 : "border-sidebar-border hover:border-sidebar-accent/50"
//             }`}
//             onDragEnter={handleDrag}
//             onDragLeave={handleDrag}
//             onDragOver={handleDrag}
//             onDrop={handleDrop}
//           >
//             {isUploading ? (
//               <div className="flex flex-col items-center">
//                 <Loader2 className="h-8 w-8 animate-spin text-sidebar-accent mb-2" />
//                 <p className="text-sm text-sidebar-foreground">Uploading...</p>
//               </div>
//             ) : (
//               <div className="flex flex-col items-center">
//                 <Upload className="h-8 w-8 text-sidebar-accent mb-2" />
//                 <p className="text-sm text-sidebar-foreground mb-2">Drag & drop files here</p>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => fileInputRef.current?.click()}
//                   className="text-sidebar-accent border-sidebar-accent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
//                 >
//                   Browse Files
//                 </Button>
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   multiple
//                   className="hidden"
//                   onChange={(e) => handleFiles(e.target.files)}
//                 />
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Resources List */}
//         <ScrollArea className="flex-1 space-y-2 p-4 h-full">
//           {/* <div className="space-y-2"> */}
//             {resources.map((resource) => (
//               <Card key={resource.id} className="p-3 bg-sidebar-primary border-sidebar-border">
//                 <div className="flex items-start justify-between">
//                   <div className="flex items-start space-x-2 flex-1">
//                     <File className="h-4 w-4 text-sidebar-accent mt-0.5 flex-shrink-0" />
//                     <div className="flex-1 min-w-0">
//                       <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{resource.name}</p>
//                       <p className="text-xs text-muted-foreground">{formatFileSize(resource.size)}</p>
//                     </div>
//                   </div>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => removeResource(resource.id)}
//                     className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
//                   >
//                     <X className="h-3 w-3" />
//                   </Button>
//                 </div>
//               </Card>
//             ))}

//             {resources.length === 0 && (
//               <div className="text-center py-8">
//                 <File className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
//                 <p className="text-sm text-muted-foreground">No resources uploaded yet</p>
//               </div>
//             )}
//           {/* </div> */}
//         </ScrollArea>
//       </div>

//       {/* Right Side - Chat */}
//       <div className="flex-1 flex flex-col">
//         {/* Chat Header */}
//         <div className="p-6 border-b border-border">
//           <h2 className="text-lg font-semibold text-foreground">Chat</h2>
//           <p className="text-sm text-muted-foreground">Ask questions about your uploaded resources</p>
//         </div>

//         {/* Messages */}
//         <ScrollArea className="flex-1 p-6 h-full">
//           <div className="space-y-4 max-w-3xl">
//             {messages.map((message) => (
//               <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
//                 <div
//                   className={`max-w-[80%] rounded-lg p-4 ${
//                     message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
//                   }`}
//                 >
//                   <p className="text-sm leading-relaxed">{message.content}</p>
//                   <p className="text-xs opacity-70 mt-2">
//                   {new Date(message.timestamp).toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//   })}
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </ScrollArea>

//         {/* Message Input */}
//         <div className="p-6 border-t border-border">
//           <div className="flex space-x-2">
//             <Input
//               value={inputMessage}
//               onChange={(e) => setInputMessage(e.target.value)}
//               placeholder="Ask a question about your resources..."
//               className="flex-1"
//               onKeyPress={(e) => e.key === "Enter" && sendMessage()}
//             />
//             <Button onClick={sendMessage} disabled={!inputMessage.trim()}>
//               <Send className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
