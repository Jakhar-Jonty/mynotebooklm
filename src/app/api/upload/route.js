// import { NextRequest, NextResponse } from 'next/server';
// import { writeFile, mkdir } from 'fs/promises';
// import path from 'path';

// // LangChain & Qdrant Imports
// import { QdrantVectorStore } from "@langchain/qdrant";
// import { QdrantClient } from "@qdrant/js-client-rest";
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { TextLoader } from "langchain/document_loaders/fs/text";
// import { SRTLoader } from "@langchain/community/document_loaders/fs/srt"; // <-- ADDED: SRT Loader
// import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
// import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import "dotenv/config";

// // --- CONFIGURATION ---

// const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
// const QDRANT_COLLECTION_NAME = "notebooklm-rag";

// // UPDATED: Added srt and vtt types
// const ALLOWED_FILE_TYPES = {
//   'application/pdf': { maxSize: 25 * 1024 * 1024, category: 'document' },
//   'text/plain': { maxSize: 5 * 1024 * 1024, category: 'text' },
//   'text/csv': { maxSize: 50 * 1024 * 1024, category: 'data' },
//   'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSize: 25 * 1024 * 1024, category: 'document' },
//   'application/json': { maxSize: 25 * 1024 * 1024, category: 'data' },
//   'text/vtt': { maxSize: 5 * 1024 * 1024, category: 'text' }, // <-- ADDED
//   'application/x-subrip': { maxSize: 5 * 1024 * 1024, category: 'text' }, // <-- ADDED for .srt
// };


// // --- EMBEDDING LOGIC ---

// /**
//  * Dynamically selects a document loader based on the file extension.
//  * This function is now updated to handle .vtt and .srt files.
//  */
// function getDocumentLoader(filePath) {
//   const extension = path.extname(filePath).toLowerCase();
//   console.log(`[Loader] Getting loader for extension: ${extension}`);
//   switch (extension) {
//     case ".pdf":
//       return new PDFLoader(filePath);
//     case ".txt":
//     case ".md":
//     case ".json":
//     case ".vtt": // <-- ADDED: VTT files are plain text
//       return new TextLoader(filePath);
//     case ".srt": // <-- ADDED: Use the dedicated SRTLoader
//       return new SRTLoader(filePath);
//     case ".csv":
//       return new CSVLoader(filePath);
//     case ".docx":
//       return new DocxLoader(filePath);
//     default:
//       console.log(`[Loader] No document loader for extension '${extension}', skipping embedding.`);
//       return null;
//   }
// }

// /**
//  * Processes a file, generates embeddings, and stores them in Qdrant.
//  */
// async function generateEmbeddingsForFile(filePath, originalFilename) {
//   try {
//     console.log(`\n--- [Embedding] Starting processing for: ${filePath} ---`);
//     const loader = getDocumentLoader(filePath);
    
//     if (!loader) return;

//     const rawDocs = await loader.load();
//     if (rawDocs.length === 0) {
//       console.log("[Embedding] ⚠️ No content found in the document. Skipping.");
//       return;
//     }
    
//     // Add original filename to metadata for each document
//     rawDocs.forEach(doc => {
//       doc.metadata = { ...doc.metadata, source: originalFilename };
//     });

//     const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
//     const docs = await splitter.splitDocuments(rawDocs);
    
//     const embeddings = new GoogleGenerativeAIEmbeddings({
//       apiKey: process.env.GOOGLE_API_KEY,
//       model: "embedding-001",
//     });

//     const client = new QdrantClient({ url: QDRANT_URL });

//     const collections = await client.getCollections();
//     const collectionExists = collections.collections.some(c => c.name === QDRANT_COLLECTION_NAME);
    
//     if (!collectionExists) {
//       console.log(`[Qdrant] Collection '${QDRANT_COLLECTION_NAME}' not found. Creating...`);
//       await client.createCollection(QDRANT_COLLECTION_NAME, {
//           vectors: { size: 768, distance: "Cosine" }, // embedding-001 model has 768 dimensions
//       });
//       console.log(`[Qdrant] Collection created.`);
//     }

//     await QdrantVectorStore.fromDocuments(docs, embeddings, {
//       client,
//       collectionName: QDRANT_COLLECTION_NAME,
//     });

//     console.log(`--- [Embedding] ✅ Finished. Stored ${docs.length} chunks for: ${originalFilename} ---\n`);
//   } catch (error) {
//     console.error(`--- [Embedding] ❌ Error processing ${filePath}:`, error);
//   }
// }


// // --- API ROUTE HANDLER ---

// export async function POST(request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file');

//     if (!file) {
//       return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
//     }
    
//     // NOTE: The browser might send .srt as 'application/x-subrip' or 'text/plain'.
//     // We will rely on file extension in getDocumentLoader for robustness.
//     const fileType = file.type || 'application/octet-stream';

//     const uploadDir = path.join(process.cwd(), 'uploads');
//     await mkdir(uploadDir, { recursive: true });

//     const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
//     const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
//     const filename = `${uniqueSuffix}-${sanitizedOriginalName}`;
//     const filepath = path.join(uploadDir, filename);

//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
//     await writeFile(filepath, buffer);

//     // Asynchronously generate embeddings, don't block the response
//     generateEmbeddingsForFile(filepath, file.name).catch(err => {
//         console.error("[Embedding] Background process failed:", err);
//     });

//     console.log('File uploaded successfully:', { filename, path: filepath });
    
//     return NextResponse.json({
//       success: true,
//       message: 'File uploaded successfully. Embedding process initiated.',
//       file: {
//         filename: file.name,
//         path: `/uploads/${filename}`, // A simplified path for display
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error('[Upload Error]', error);
//     return NextResponse.json({ success: false, error: 'File upload failed due to a server error' }, { status: 500 });
//   }
// }

import { NextResponse } from 'next/server';
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";

// Document Loader Imports
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { SRTLoader } from "@langchain/community/document_loaders/fs/srt";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";

// --- CONFIGURATION ---
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

// --- HELPER FUNCTION ---

/**
 * Dynamically selects a document loader based on the file type.
 * This now takes the file Blob directly.
 */
function getDocumentLoader(file) {
  const fileType = file.type;
  const fileName = file.name;
  const extension = fileName.split('.').pop().toLowerCase();

  console.log(`[Loader] Getting loader for file type: ${fileType}, extension: ${extension}`);

  // We check MIME type first, then fall back to extension
  switch (fileType) {
    case "application/pdf":
      return new PDFLoader(file);
    case "text/plain":
    case "text/markdown":
    case "application/json":
    case "text/vtt":
      return new TextLoader(file);
    case "text/csv":
      return new CSVLoader(file);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return new DocxLoader(file);
    case "application/x-subrip":
      return new SRTLoader(file);
    default:
      // Fallback for cases where MIME type is generic (like 'application/octet-stream')
      if (extension === 'docx') return new DocxLoader(file);
      if (extension === 'srt') return new SRTLoader(file);
      if (['txt', 'md', 'json', 'vtt'].includes(extension)) return new TextLoader(file);
      console.log(`[Loader] No specific loader for type '${fileType}' or extension '${extension}'.`);
      return null;
  }
}

// --- API ROUTE HANDLER ---

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // --- In-Memory Processing Logic ---
    console.log(`\n--- [Embedding] Starting for: ${file.name} ---`);
    const loader = getDocumentLoader(file);
    if (!loader) {
        return NextResponse.json({ success: false, error: `Unsupported file type: ${file.type || file.name.split('.').pop()}` }, { status: 400 });
    }

    const rawDocs = await loader.load();
    if (rawDocs.length === 0) {
      console.log("[Embedding] ⚠️ No content found in the document.");
      return NextResponse.json({ success: true, message: 'File processed, but no content was found to embed.' });
    }

    // Add original filename to metadata for each document chunk
    rawDocs.forEach(doc => {
      doc.metadata = { ...doc.metadata, source: file.name };
    });

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const docs = await splitter.splitDocuments(rawDocs);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "embedding-001",
    });

    // Initialize Pinecone client and index
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);

    // Store documents in Pinecone
    await PineconeStore.fromDocuments(docs, embeddings, {
        pineconeIndex,
        maxConcurrency: 5,
    });

    console.log(`--- [Embedding] ✅ Finished. Stored ${docs.length} chunks for: ${file.name} ---\n`);

    return NextResponse.json({
      success: true,
      message: `Successfully embedded ${docs.length} chunks from ${file.name}.`,
    });

  } catch (error) {
    console.error('[Upload Error]', error);
    // Vercel logs the error object, so we can return a user-friendly message
    return NextResponse.json({ success: false, error: 'An error occurred during embedding.', details: error }, { status: 500 });
  }
}




























// import { NextRequest, NextResponse } from 'next/server';
// import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
// import path from 'path';
// import fs from 'fs';

// // LangChain & Qdrant Imports
// import { QdrantVectorStore } from "@langchain/qdrant";
// import { QdrantClient } from "@qdrant/js-client-rest";
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
// import { DocumentLoader } from "@langchain/core/document_loaders/base";
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { TextLoader } from "@langchain/community/document_loaders/fs/text";
// import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
// import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import "dotenv/config";

// // Allowed file types from your original upload route
// const ALLOWED_FILE_TYPES = {
//     'image/jpeg': { maxSize: 10 * 1024 * 1024, category: 'image' },
//     'image/png': { maxSize: 10 * 1024 * 1024, category: 'image' },
//     'video/mp4': { maxSize: 100 * 1024 * 1024, category: 'video' },
//     'audio/mpeg': { maxSize: 20 * 1024 * 1024, category: 'audio' },
//     'application/pdf': { maxSize: 25 * 1024 * 1024, category: 'document' },
//     'text/plain': { maxSize: 5 * 1024 * 1024, category: 'text' },
//     'text/csv': { maxSize: 50 * 1024 * 1024, category: 'data' },
//     'text/vtt': { maxSize: 5 * 1024 * 1024, category: 'text' },
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSize: 25 * 1024 * 1024, category: 'document' },
//     'application/json': { maxSize: 25 * 1024 * 1024, category: 'data' },
// };

// // --- EMBEDDING LOGIC ---

// /**
//  * Dynamically selects a document loader based on the file extension.
//  */
// function getDocumentLoader(filePath) {
//   const extension = path.extname(filePath).toLowerCase();
//   switch (extension) {
//     case ".pdf":
//       return new PDFLoader(filePath);
//     case ".txt":
//     case ".md":
//     case ".vtt":
//     case ".json":
//       return new TextLoader(filePath);
//     case ".csv":
//       return new CSVLoader(filePath);
//     case ".docx":
//       return new DocxLoader(filePath);
//     default:
//       // We don't throw an error for non-document types, just log and skip.
//       console.log(`No document loader for extension '${extension}', skipping embedding.`);
//       return null;
//   }
// }

// /**
//  * Processes a file, generates embeddings, and stores them in Qdrant.
//  */
// async function generateEmbeddingsForFile(filePath) {
//   try {
//     console.log(`\n--- [Embedding] Starting processing for: ${filePath} ---`);
//     const loader = getDocumentLoader(filePath);
    
//     // If there's no loader for this file type (e.g., images, videos), skip.
//     if (!loader) {
//         return;
//     }

//     const rawDocs = await loader.load();
//     if (rawDocs.length === 0) {
//         console.log("[Embedding] ⚠️ No content found in the document. Skipping.");
//         return;
//     }

//     const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
//     const docs = await splitter.splitDocuments(rawDocs);
    
//     const embeddings = new GoogleGenerativeAIEmbeddings({
//       apiKey: process.env.GOOGLE_API_KEY,
//       model: "embedding-001",
//     });

//     const client = new QdrantClient({ url: "http://localhost:6333" });
//     const collectionName = "genai-RAG";

//     const collections = await client.getCollections();
//     const collectionExists = collections.collections.some(c => c.name === collectionName);
    
//     if (!collectionExists) {
//         await client.createCollection(collectionName, {
//             vectors: { size: 768, distance: "Cosine" },
//         });
//     }

//     await QdrantVectorStore.fromDocuments(docs, embeddings, {
//       url: "http://localhost:6333",
//       collectionName: collectionName,
//     });

//     console.log(`--- [Embedding] ✅ Finished. Stored ${docs.length} chunks for: ${filePath} ---\n`);
//   } catch (error) {
//     console.error(`--- [Embedding] ❌ Error processing ${filePath}:`, error);
//   }
// }


// // --- API ROUTE HANDLERS ---

// export async function POST(request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file') ;

//     if (!file) {
//       return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
//     }

//     const fileTypeInfo = ALLOWED_FILE_TYPES[file.type];
//     if (!fileTypeInfo) {
//       return NextResponse.json({ success: false, error: `File type '${file.type}' is not supported.` }, { status: 400 });
//     }

//     if (file.size > fileTypeInfo.maxSize) {
//       return NextResponse.json({ success: false, error: 'File size too large.' }, { status: 400 });
//     }

//     const uploadDir = path.join(process.cwd(), 'uploads');
//     const categoryDir = path.join(uploadDir, fileTypeInfo.category);
//     await mkdir(categoryDir, { recursive: true });

//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const randomSuffix = Math.round(Math.random() * 1E9);
//     const fileExtension = path.extname(file.name);
//     const baseName = path.basename(file.name, fileExtension);
//     const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
//     const filename = `${sanitizedBaseName}_${timestamp}_${randomSuffix}${fileExtension}`;
//     const filepath = path.join(categoryDir, filename);

//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
//     await writeFile(filepath, buffer);

//     // --- TRIGGER EMBEDDING PROCESS ---
//     // This happens asynchronously after the file is saved.
//     // We don't wait for it to finish to send the response back to the client.
//     generateEmbeddingsForFile(filepath).catch(err => {
//         console.error("Background embedding process failed:", err);
//     });
//     // --- END OF EMBEDDING TRIGGER ---


//     console.log('File uploaded successfully:', { filename, path: filepath });
    

//     return NextResponse.json({
//       success: true,
//       message: 'File uploaded successfully. Embedding process initiated.',
//       file: {
//         filename: filename,
//         path: `/uploads/${fileTypeInfo.category}/${filename}`,
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error('Upload error:', error);
//     return NextResponse.json({ success: false, error: 'File upload failed due to server error' }, { status: 500 });
//   }
// }


