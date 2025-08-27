// import { NextResponse } from 'next/server';
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
// import { QdrantVectorStore } from "@langchain/qdrant";
// import { QdrantClient } from "@qdrant/js-client-rest";
// import "dotenv/config";

// // --- CONFIGURATION ---
// const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
// const QDRANT_COLLECTION_NAME = "notebooklm-rag";

// // Initialize the Google Generative AI client
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// // --- HELPER FUNCTIONS ---

// /**
//  * Improves the user's query for better vector search results.
//  * @param {string} query - The original user query.
//  * @returns {Promise<string>} The improved query.
//  */

// async function improveQuery(query) {
//     const prompt = `You are a query optimization expert. Your task is to rewrite the following user query to be more effective for a vector database search. Focus on keywords, clarity, and intent. Return only the rewritten query.
    
//     Original Query: "${query}"
    
//     Rewritten Query:`;

//     try {
//         const result = await model.generateContent(prompt);
//         const response = await result.response;
//         return response.text().trim();
//     } catch (error) {
//         console.error("Error improving query, falling back to original:", error);
//         return query; // Fallback to the original query on error
//     }
// }


// function getUniqueDocuments(documents) {
//     const uniqueDocs = new Map();
//     documents.forEach(doc => {
//         // Use pageContent as the key to identify and remove duplicates
//         if (!uniqueDocs.has(doc.pageContent)) {
//             uniqueDocs.set(doc.pageContent, doc);
//         }
//     });
//     return Array.from(uniqueDocs.values());
// }


// // --- API ROUTE HANDLER ---

// export async function POST(request) {
//     try {
//         const { messages } = await request.json();
//         const userQuery = messages[messages.length - 1].content;

//         if (!userQuery) {
//             return NextResponse.json({ error: "No query provided" }, { status: 400 });
//         }

//         console.log(`[Chat] Received original query: "${userQuery}"`);

//         // 1. Initialize Embeddings and Vector Store
//         const embeddings = new GoogleGenerativeAIEmbeddings({
//             apiKey: process.env.GOOGLE_API_KEY,
//             model: "embedding-001",
//         });
        
//         const client = new QdrantClient({ url: QDRANT_URL });
//         const vectorStore = new QdrantVectorStore(embeddings, {
//             client,
//             collectionName: QDRANT_COLLECTION_NAME,
//         });

//         // 2. Improve the user's query
//         const improvedQuery = await improveQuery(userQuery);
//         console.log(`[Chat] Improved query: "${improvedQuery}"`);

//         // 3. Perform parallel similarity searches
//         const [originalResults, improvedResults] = await Promise.all([
//             vectorStore.similaritySearch(userQuery, 4),
//             vectorStore.similaritySearch(improvedQuery, 4)
//         ]);
//         console.log(`[Chat] Found ${originalResults.length} original results and ${improvedResults.length} improved results.`);

//         // 4. Combine and de-duplicate results
//         const allResults = [...originalResults, ...improvedResults];
//         const uniqueDocs = getUniqueDocuments(allResults);
//         console.log(`[Chat] Combined to ${uniqueDocs.length} unique documents.`);
        
//         // 5. Create the context for the final answer
//         const context = uniqueDocs.map(doc => 
//             `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
//         ).join("\n\n---\n\n");

//         // 6. Generate the final response
//         const finalPrompt = `You are a helpful AI assistant for a project called NotebookLM. Your task is to answer the user's question based *only* on the provided context from their uploaded documents.

//         - If the context contains the answer, provide a clear and concise response, citing the source document when possible (e.g., "According to 'document.pdf'...").
//         - If the context does not contain enough information to answer the question, state that you couldn't find the answer in the provided documents.
//         - Do not use any external knowledge.
        
//         CONTEXT FROM DOCUMENTS:
//         ${context}
        
//         USER'S QUESTION:
//         ${userQuery}
        
//         ANSWER:`;
        
//         const result = await model.generateContent(finalPrompt);
//         const response = await result.response;
//         const finalAnswer = response.text();

//         return NextResponse.json({
//             id: `asst-${Date.now()}`,
//             content: finalAnswer,
//         });

//     } catch (error) {
//         console.error('[Chat Error]', error);
//         return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
//     }
// }


import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import "dotenv/config";

// --- CONFIGURATION ---
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

// Initialize Google Generative AI client for chat
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const generationModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- HELPER FUNCTIONS ---

/**
 * Rewrites the user's query for better vector search results.
 */
async function improveQuery(query) {
    const prompt = `You are a query optimization expert. Rewrite the following user query to be more effective for a vector database search by focusing on keywords, clarity, and intent. Return only the rewritten query.
    Original Query: "${query}"
    Rewritten Query:`;

    try {
        const result = await generationModel.generateContent(prompt);
        return (await result.response).text().trim();
    } catch (error) {
        console.error("Error improving query, falling back to original:", error);
        return query;
    }
}

/**
 * Removes duplicate documents from a list based on page content.
 */
function getUniqueDocuments(documents) {
    const uniqueDocs = new Map();
    documents.forEach(doc => {
        if (!uniqueDocs.has(doc.pageContent)) {
            uniqueDocs.set(doc.pageContent, doc);
        }
    });
    return Array.from(uniqueDocs.values());
}

// --- API ROUTE HANDLER ---

export async function POST(request) {
    try {
        const { messages } = await request.json();
        const userQuery = messages[messages.length - 1].content;

        if (!userQuery) {
            return NextResponse.json({ error: "No query provided" }, { status: 400 });
        }
        console.log(`[Chat] Received query: "${userQuery}"`);

        // 1. Initialize Embeddings and Pinecone Client
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_API_KEY,
            model: "embedding-001",
        });

        const pinecone = new Pinecone();
        const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);

        // 2. Initialize Vector Store from your existing Pinecone index
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex,
        });

        // 3. Improve the user's query
        const improvedQuery = await improveQuery(userQuery);
        console.log(`[Chat] Improved query: "${improvedQuery}"`);

        // 4. Perform parallel similarity searches with both queries
        const [originalResults, improvedResults] = await Promise.all([
            vectorStore.similaritySearch(userQuery, 4),
            vectorStore.similaritySearch(improvedQuery, 4)
        ]);

        // 5. Combine and de-duplicate the retrieved documents
        const allResults = [...originalResults, ...improvedResults];
        const uniqueDocs = getUniqueDocuments(allResults);
        console.log(`[Chat] Found ${uniqueDocs.length} unique documents.`);

        // 6. Create the context for the final answer synthesis
        const context = uniqueDocs.map(doc =>
            `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
        ).join("\n\n---\n\n");

        // 7. Generate the final response using the retrieved context
        const finalPrompt = `You are a helpful AI assistant for a project called NotebookLM. Your task is to answer the user's question based *only* on the provided context from their uploaded documents.

        - If the context contains the answer, provide a clear and concise response, citing the source document when possible (e.g., "According to 'document.pdf'...").
        - If the context does not contain enough information, state that you couldn't find the answer in the provided documents.
        - Do not use any external knowledge.

        CONTEXT FROM DOCUMENTS:
        ${context}

        USER'S QUESTION:
        ${userQuery}

        ANSWER:`;

        const result = await generationModel.generateContent(finalPrompt);
        const finalAnswer = (await result.response).text();

        return NextResponse.json({
            id: `asst-${Date.now()}`,
            content: finalAnswer,
        });

    } catch (error) {
        console.error('[Chat Error]', error);
        return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
    }
}












// import { NextRequest, NextResponse } from 'next/server';
// import fs from 'fs';
// import path from 'path';

// // In-memory storage for chat sessions (in production, use a database)
// let chatSessions = new Map();

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     console.log("Received request body:", body);
    
//     const { messages, userId, sessionId, resources } = body;
    
//     if (!messages || !Array.isArray(messages) || messages.length === 0) {
//       return NextResponse.json(
//         { error: 'Messages array is required' },
//         { status: 400 }
//       );
//     }

//     const currentSessionId = sessionId || 'default';
//     const currentUserId = userId || 'anonymous';

//     // Initialize session if it doesn't exist
//     if (!chatSessions.has(currentSessionId)) {
//       chatSessions.set(currentSessionId, {
//         messages: [],
//         resources: [],
//         userId: currentUserId,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString()
//       });
//     }

//     // Get current session
//     const session = chatSessions.get(currentSessionId);
    
//     // Update session with new messages and resources
//     session.messages = messages;
//     session.resources = resources || [];
//     session.updatedAt = new Date().toISOString();

//     // Get the latest user message
//     const latestUserMessage = messages[messages.length - 1];
    
//     if (!latestUserMessage || latestUserMessage.type !== 'user') {
//       return NextResponse.json(
//         { error: 'Latest message must be from user' },
//         { status: 400 }
//       );
//     }

//     console.log("Processing message:", latestUserMessage.content);
//     console.log("Available resources:", resources?.length || 0);

//     // Generate AI response with context of uploaded resources
//     const aiResponse = await generateAIResponse(
//       latestUserMessage.content, 
//       messages, 
//       resources || []
//     );

//     const responseMessage = {
//       id: Date.now().toString(),
//       type: 'assistant',
//       content: aiResponse,
//       timestamp: new Date().toISOString(),
//     };

//     // Add AI response to session
//     session.messages.push(responseMessage);

//     console.log("Generated AI response:", responseMessage);

//     return NextResponse.json({
//       ...responseMessage,
//       sessionId: currentSessionId,
//       messageCount: session.messages.length
//     });

//   } catch (error) {
//     console.error('Chat error:', error);
//     return NextResponse.json(
//       { error: 'Failed to process chat message', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const sessionId = searchParams.get('sessionId') || 'default';
//     const limit = parseInt(searchParams.get('limit')) || 100;

//     const session = chatSessions.get(sessionId);
    
//     if (!session) {
//       return NextResponse.json({
//         messages: [],
//         resources: [],
//         count: 0,
//         sessionId: sessionId
//       });
//     }

//     // Return recent messages
//     const recentMessages = session.messages.slice(-limit);

//     return NextResponse.json({
//       messages: recentMessages,
//       resources: session.resources,
//       count: recentMessages.length,
//       sessionId: sessionId,
//       totalMessages: session.messages.length
//     });

//   } catch (error) {
//     console.error('Error fetching chat history:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch chat history' },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const sessionId = searchParams.get('sessionId');

//     if (sessionId) {
//       // Clear specific session
//       chatSessions.delete(sessionId);
//     } else {
//       // Clear all sessions
//       chatSessions.clear();
//     }

//     return NextResponse.json({
//       message: 'Chat history cleared successfully',
//       sessionId: sessionId || 'all'
//     });

//   } catch (error) {
//     console.error('Error clearing chat history:', error);
//     return NextResponse.json(
//       { error: 'Failed to clear chat history' },
//       { status: 500 }
//     );
//   }
// }

// // Enhanced AI response generation with resource awareness
// async function generateAIResponse(userMessage, messageHistory, resources) {
//   console.log("Generating response for:", userMessage);
//   console.log("Message history length:", messageHistory.length);
//   console.log("Resources available:", resources.length);

//   // Analyze user message for intent
//   const message = userMessage.toLowerCase();
  
//   // Resource-related responses
//   if (resources.length > 0) {
//     const imageFiles = resources.filter(r => r.type?.startsWith('image/'));
//     const videoFiles = resources.filter(r => r.type?.startsWith('video/'));
//     const documentFiles = resources.filter(r => 
//       r.type?.includes('pdf') || 
//       r.type?.includes('text') || 
//       r.type?.includes('document')
//     );
//     const jsonFiles = resources.filter(r => r.type?.includes('json'));

//     // Responses about uploaded files
//     if (message.includes('what') && (message.includes('file') || message.includes('upload'))) {
//       let response = `I can see you have uploaded ${resources.length} file${resources.length > 1 ? 's' : ''}:\n\n`;
      
//       resources.forEach((resource, index) => {
//         response += `${index + 1}. **${resource.name}** (${formatFileSize(resource.size)})\n`;
//       });
      
//       if (imageFiles.length > 0) {
//         response += `\n📸 **Images**: ${imageFiles.length} file${imageFiles.length > 1 ? 's' : ''}`;
//       }
//       if (videoFiles.length > 0) {
//         response += `\n🎥 **Videos**: ${videoFiles.length} file${videoFiles.length > 1 ? 's' : ''}`;
//       }
//       if (documentFiles.length > 0) {
//         response += `\n📄 **Documents**: ${documentFiles.length} file${documentFiles.length > 1 ? 's' : ''}`;
//       }
//       if (jsonFiles.length > 0) {
//         response += `\n📋 **JSON Files**: ${jsonFiles.length} file${jsonFiles.length > 1 ? 's' : ''}`;
//       }
      
//       response += "\n\nWhat would you like me to help you with regarding these files?";
//       return response;
//     }

//     // Image analysis requests
//     if (imageFiles.length > 0 && (
//       message.includes('image') || 
//       message.includes('picture') || 
//       message.includes('photo') ||
//       message.includes('analyze') ||
//       message.includes('describe')
//     )) {
//       return `I can see you've uploaded ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}: ${imageFiles.map(f => f.name).join(', ')}. 

// While I can identify the files, I'd need additional capabilities to analyze the actual image content. I can help you with:

// • Organizing and categorizing your images
// • Providing metadata information
// • Suggesting workflows for image processing
// • Helping with file management tasks

// What specific aspect would you like help with?`;
//     }

//     // Document analysis requests
//     if (documentFiles.length > 0 && (
//       message.includes('document') || 
//       message.includes('pdf') || 
//       message.includes('text') ||
//       message.includes('read') ||
//       message.includes('content')
//     )) {
//       return `I can see you've uploaded ${documentFiles.length} document${documentFiles.length > 1 ? 's' : ''}: ${documentFiles.map(f => f.name).join(', ')}.

// To fully analyze document content, I would need additional capabilities to read the file contents. However, I can help you with:

// • Document organization and management
// • File format information and conversion suggestions
// • Workflow recommendations for document processing
// • Metadata and file structure guidance

// What would you like to do with these documents?`;
//     }

//     // JSON analysis requests
//     if (jsonFiles.length > 0 && (
//       message.includes('json') || 
//       message.includes('data') || 
//       message.includes('structure') ||
//       message.includes('analyze')
//     )) {
//       return `I can see you've uploaded ${jsonFiles.length} JSON file${jsonFiles.length > 1 ? 's' : ''}: ${jsonFiles.map(f => f.name).join(', ')}.

// I can help you with JSON data analysis, structure examination, and data manipulation. To provide specific insights, I would need to access the file contents. I can assist with:

// • JSON structure analysis and validation
// • Data transformation and formatting
// • Query suggestions for data extraction
// • Integration with other data sources

// Would you like me to help with any specific JSON operations?`;
//     }
//   }

//   // Contextual responses based on conversation history
//   const recentMessages = messageHistory.slice(-5); // Last 5 messages for context
//   const hasGreeted = messageHistory.some(msg => 
//     msg.content.toLowerCase().includes('hello') || 
//     msg.content.toLowerCase().includes('hi')
//   );

//   // Greeting responses
//   if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
//     if (resources.length > 0) {
//       return `Hello! I can see you've already uploaded ${resources.length} file${resources.length > 1 ? 's' : ''}. I'm ready to help you analyze and work with your resources. What would you like to explore first?`;
//     }
//     return "Hello! I'm here to help you analyze and work with your uploaded resources. Feel free to upload some files and ask me questions about them!";
//   }

//   // Help requests
//   if (message.includes('help') || message.includes('what can you do')) {
//     let helpResponse = `I can assist you with various tasks related to your uploaded files:\n\n`;
//     helpResponse += `🔍 **Analysis**: Examine file types, sizes, and metadata\n`;
//     helpResponse += `📊 **Organization**: Help categorize and manage your files\n`;
//     helpResponse += `💡 **Insights**: Provide suggestions based on your file types\n`;
//     helpResponse += `🛠️ **Processing**: Recommend tools and workflows\n`;
//     helpResponse += `❓ **Q&A**: Answer questions about your resources\n\n`;
    
//     if (resources.length > 0) {
//       helpResponse += `You currently have ${resources.length} file${resources.length > 1 ? 's' : ''} uploaded. What would you like to do with them?`;
//     } else {
//       helpResponse += `Upload some files to get started!`;
//     }
    
//     return helpResponse;
//   }

//   // Summary requests
//   if (message.includes('summary') || message.includes('overview') || message.includes('tell me about')) {
//     if (resources.length === 0) {
//       return "You haven't uploaded any files yet. Upload some resources and I'll provide you with a comprehensive summary!";
//     }

//     let summary = `## Resource Summary\n\n`;
//     summary += `**Total Files**: ${resources.length}\n`;
    
//     const totalSize = resources.reduce((sum, r) => sum + (r.size || 0), 0);
//     summary += `**Total Size**: ${formatFileSize(totalSize)}\n\n`;

//     // Group by file type
//     const typeGroups = resources.reduce((groups, file) => {
//       const type = getFileCategory(file.type);
//       if (!groups[type]) groups[type] = [];
//       groups[type].push(file);
//       return groups;
//     }, {});

//     summary += `**File Types**:\n`;
//     Object.entries(typeGroups).forEach(([type, files]) => {
//       summary += `• ${type}: ${files.length} file${files.length > 1 ? 's' : ''}\n`;
//     });

//     summary += `\n**Recent Uploads**:\n`;
//     const recentFiles = resources
//       .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
//       .slice(0, 5);
    
//     recentFiles.forEach(file => {
//       summary += `• ${file.name} (${formatFileSize(file.size)})\n`;
//     });

//     summary += `\nWhat would you like to explore next?`;
//     return summary;
//   }

//   // Thank you responses
//   if (message.includes('thank')) {
//     const thankResponses = [
//       "You're welcome! Is there anything else I can help you with?",
//       "Happy to help! Feel free to ask if you have more questions.",
//       "Glad I could assist! What else would you like to explore?",
//       "You're very welcome! I'm here whenever you need help with your files."
//     ];
//     return thankResponses[Math.floor(Math.random() * thankResponses.length)];
//   }

//   // File management questions
//   if (message.includes('delete') || message.includes('remove')) {
//     return "To remove files, you can click the 'X' button next to each file in the resources panel. This will remove them from your current session. Would you like me to help you organize your files in a different way?";
//   }

//   if (message.includes('organize') || message.includes('sort') || message.includes('group')) {
//     if (resources.length === 0) {
//       return "Upload some files first, and I'll help you organize them by type, size, date, or any other criteria you prefer!";
//     }
    
//     return `I can help you organize your ${resources.length} files! Here are some organization options:

// 📁 **By File Type**: Group images, documents, videos, etc.
// 📅 **By Upload Date**: Sort chronologically
// 📏 **By File Size**: Arrange from largest to smallest
// 🔤 **Alphabetically**: Sort by filename

// Which organization method would you prefer?`;
//   }

//   // Technical questions about file formats
//   if (message.includes('format') || message.includes('type') || message.includes('extension')) {
//     if (resources.length === 0) {
//       return "Upload some files and I'll help you understand their formats and suggest appropriate tools or conversions!";
//     }

//     let formatInfo = `Here's information about your file formats:\n\n`;
//     const uniqueTypes = [...new Set(resources.map(r => r.type))];
    
//     uniqueTypes.forEach(type => {
//       const filesOfType = resources.filter(r => r.type === type);
//       formatInfo += `**${type || 'Unknown'}**: ${filesOfType.length} file${filesOfType.length > 1 ? 's' : ''}\n`;
//       formatInfo += `  Files: ${filesOfType.map(f => f.name).join(', ')}\n\n`;
//     });

//     return formatInfo + "Need help with format conversion or compatibility? Just ask!";
//   }

//   // Default responses based on resources available
//   if (resources.length > 0) {
//     const responses = [
//       `I can see your ${resources.length} uploaded file${resources.length > 1 ? 's' : ''}. What specific analysis or task would you like me to help with?`,
//       `You have ${resources.length} resource${resources.length > 1 ? 's' : ''} ready for analysis. What questions do you have about them?`,
//       `I'm ready to help you work with your uploaded files. What would you like to explore or analyze?`,
//       `With ${resources.length} file${resources.length > 1 ? 's' : ''} uploaded, there's a lot we can explore together. What interests you most?`,
//       `Your resources are loaded and ready! What task can I assist you with today?`
//     ];
//     return responses[Math.floor(Math.random() * responses.length)];
//   } else {
//     const responses = [
//       "I'm here to help analyze and work with your files. Upload some resources to get started!",
//       "Ready to assist! Please upload some files and I'll help you explore and analyze them.",
//       "I can help you with file analysis, organization, and insights. Upload some resources to begin!",
//       "Upload some files and I'll provide detailed analysis and helpful insights about your resources.",
//       "I'm ready to help! Upload documents, images, videos, or any files you'd like me to analyze."
//     ];
//     return responses[Math.floor(Math.random() * responses.length)];
//   }
// }

// // Helper function to categorize files
// function getFileCategory(mimeType) {
//   if (!mimeType) return 'Unknown';
  
//   if (mimeType.startsWith('image/')) return 'Images';
//   if (mimeType.startsWith('video/')) return 'Videos';
//   if (mimeType.startsWith('audio/')) return 'Audio';
//   if (mimeType.includes('pdf')) return 'PDFs';
//   if (mimeType.includes('text')) return 'Text Files';
//   if (mimeType.includes('json')) return 'JSON Data';
//   if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheets';
//   if (mimeType.includes('document') || mimeType.includes('word')) return 'Documents';
//   if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentations';
  
//   return 'Other Files';
// }

// // Helper function to format file sizes
// function formatFileSize(bytes) {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// }


















// //*********************************************************************************
//  //******************************************************************************//




// import { NextRequest, NextResponse } from 'next/server';

// // In-memory storage for chat messages (in production, use a database)
// let chatHistory = [];

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     console.log("Body:", body)
//     const { messages, userId, sessionId } = body;
//     if (!messages || messages.length === 0) {
//       return NextResponse.json(
//         { error: 'Messages are required' },
//         { status: 400 }
//       );
//     }

//     // Create a new chat message
//     const chatMessage = {
//       id: Date.now().toString(),
//       message: messages[messages.length - 1].content,
//       userId: userId || 'anonymous',
//       sessionId: sessionId || 'default',
//       timestamp: new Date().toISOString(),
//       type: 'user'
//     };

//     // Add user message to chat history
//     chatHistory.push(chatMessage);

//     // Generate AI response (placeholder - you can integrate with OpenAI, Claude, etc.)
//     const aiResponse = await generateAIResponse(messages[messages.length - 1].content);

//     const aiMessage = {
//       id: (Date.now() + 1).toString(),
//       message: aiResponse,
//       userId: 'ai',
//       sessionId: sessionId || 'default',
//       timestamp: new Date().toISOString(),
//       type: 'ai'
//     };

//     // Add AI response to chat history
//     chatHistory.push(aiMessage);

//     console.log("AI Response:", aiMessage)
//     console.log("User Message:", chatMessage)
//     console.log("Chat History:", chatHistory)

//     return NextResponse.json(aiMessage);

//   } catch (error) {
//     console.error('Chat error:', error);
//     return NextResponse.json(
//       { error: 'Failed to process chat message' },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const sessionId = searchParams.get('sessionId') || 'default';
//     const limit = parseInt(searchParams.get('limit')) || 50;

//     // Filter messages by session and limit results
//     const sessionMessages = chatHistory
//       .filter(msg => msg.sessionId === sessionId)
//       .slice(-limit);

//     return NextResponse.json({
//       messages: sessionMessages,
//       count: sessionMessages.length,
//       sessionId: sessionId
//     });

//   } catch (error) {
//     console.error('Error fetching chat history:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch chat history' },
//       { status: 500 }
//     );
//   }
// }

// // Placeholder function for AI response generation
// // You can integrate with OpenAI, Claude, or other AI services here
// async function generateAIResponse(userMessage) {
//   console.log("User Message:", userMessage)
//   // Simple response logic - replace with actual AI integration
//   const responses = [
//     "I understand your message. How can I help you further?",
//     "That's an interesting point. Let me think about that...",
//     "I'm here to assist you with any questions you might have.",
//     "Thank you for sharing that with me. Is there anything specific you'd like to know?",
//     "I'm processing your request. Please let me know if you need any clarification."
//   ];

//   // Simple keyword-based responses
//   if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
//     return "Hello! How can I assist you today?";
//   }
  
//   if (userMessage.toLowerCase().includes('help')) {
//     return "I'm here to help! What would you like to know?";
//   }
  
//   if (userMessage.toLowerCase().includes('thank')) {
//     return "You're welcome! Is there anything else I can help you with?";
//   }

//   // Return a random response for other messages
//   return responses[Math.floor(Math.random() * responses.length)];
// }

// // Optional: Add a DELETE endpoint to clear chat history
// export async function DELETE(request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const sessionId = searchParams.get('sessionId');

//     if (sessionId) {
//       // Clear messages for specific session
//       chatHistory = chatHistory.filter(msg => msg.sessionId !== sessionId);
//     } else {
//       // Clear all chat history
//       chatHistory = [];
//     }

//     return NextResponse.json({
//       message: 'Chat history cleared successfully',
//       sessionId: sessionId || 'all'
//     });

//   } catch (error) {
//     console.error('Error clearing chat history:', error);
//     return NextResponse.json(
//       { error: 'Failed to clear chat history' },
//       { status: 500 }
//     );
//   }
// }
