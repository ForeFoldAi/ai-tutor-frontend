import os
import uuid
import shutil
import subprocess
import json
import re
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import fitz  # PyMuPDF
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Initialize FastAPI app
app = FastAPI(title="NotebookLM-style School AI Tutor")

# Configuration
STORAGE_DIR = "storage"
PDF_DIR = os.path.join(STORAGE_DIR, "pdfs")
DB_DIR = os.path.join(STORAGE_DIR, "notebooks")

# Ensure directories exist
os.makedirs(PDF_DIR, exist_ok=True)
os.makedirs(DB_DIR, exist_ok=True)

# Initialize Embedding Model
print("Loading embedding model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize ChromaDB Client
chroma_client = chromadb.PersistentClient(path=DB_DIR)

# --- Models ---
class NotebookCreateResponse(BaseModel):
    notebook_id: str
    message: str

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    topic: str
    explanation: str
    pages: List[int]

# --- Helper Functions ---

def extract_text_from_pdf(pdf_path: str):
    """Extracts text page-wise from PDF using PyMuPDF with improved extraction."""
    doc = fitz.open(pdf_path)
    pages_content = []
    for page_num, page in enumerate(doc):
        # Try multiple extraction methods for better accuracy
        # Method 1: Standard text extraction
        text = page.get_text("text")
        
        # Method 2: Text blocks (preserves structure better)
        blocks = page.get_text("blocks")
        block_text = ""
        for block in blocks:
            if block[6] == 0:  # Text block (not image)
                block_text += block[4] + "\n"
        
        # Use the method that gives more content
        final_text = block_text if len(block_text) > len(text) else text
        
        # Clean up: remove excessive whitespace but preserve structure
        final_text = re.sub(r'\n{3,}', '\n\n', final_text)  # Max 2 newlines
        final_text = re.sub(r' {2,}', ' ', final_text)  # Max 1 space
        
        if final_text.strip():
            pages_content.append({
                "page_number": page_num + 1,
                "text": final_text.strip()
            })
    doc.close()
    return pages_content

def chunk_text(pages_content: List[dict], chunk_size: int = 800, overlap: int = 200):
    """Chunks text into segments preserving sentence boundaries with better overlap."""
    chunks = []
    
    # Process page by page to maintain context
    for page_data in pages_content:
        page_text = page_data["text"]
        page_num = page_data["page_number"]
        
        # Split into sentences (preserve sentence boundaries)
        sentences = re.split(r'(?<=[.!?])\s+', page_text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            continue
        
        # Build chunks with sentence awareness
        current_chunk = []
        current_word_count = 0
        chunk_pages = {page_num}
        
        for sentence in sentences:
            sentence_words = len(sentence.split())
            
            # If adding this sentence exceeds chunk size, save current chunk
            if current_word_count + sentence_words > chunk_size and current_chunk:
                chunk_text = " ".join(current_chunk)
                chunks.append({
                    "text": chunk_text,
                    "pages": sorted(list(chunk_pages))
                })
                
                # Start new chunk with overlap (keep last 200 words worth of sentences)
                overlap_words = 0
                overlap_sentences = []
                for s in reversed(current_chunk):
                    s_words = len(s.split())
                    if overlap_words + s_words <= overlap:
                        overlap_sentences.insert(0, s)
                        overlap_words += s_words
                    else:
                        break
                
                current_chunk = overlap_sentences
                current_word_count = overlap_words
                chunk_pages = {page_num}
            
            current_chunk.append(sentence)
            current_word_count += sentence_words
        
        # Add remaining chunk
        if current_chunk:
            chunk_text = " ".join(current_chunk)
            chunks.append({
                "text": chunk_text,
                "pages": sorted(list(chunk_pages))
            })
    
    # If no chunks created (very short content), create at least one
    if not chunks:
        all_text = " ".join([p["text"] for p in pages_content])
        if all_text.strip():
            chunks.append({
                "text": all_text,
                "pages": [p["page_number"] for p in pages_content]
            })
    
    return chunks

def call_ollama(prompt: str) -> str:
    """Calls local Ollama instance for phi3:mini model via subprocess."""
    try:
        process = subprocess.Popen(
            ["ollama", "run", "phi3:mini"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        # Increased timeout to 180 seconds for slower machines
        stdout, stderr = process.communicate(input=prompt, timeout=180)
        if process.returncode != 0:
            print(f"Ollama error: {stderr}")
            return "Error generating response from LLM."
        return stdout.strip()
    except Exception as e:
        print(f"Subprocess error: {e}")
        return "Failed to connect to Ollama."

def extract_topic_info(question: str):
    """Simple extraction of chapter number or topic keywords."""
    # Look for "Chapter X" or "Chapter 3"
    chapter_match = re.search(r"chapter\s*(\d+)", question, re.IGNORECASE)
    chapter_num = chapter_match.group(1) if chapter_match else None
    
    # Simple topic extraction: remove "Explain" and common stop words
    topic = question.lower()
    topic = re.sub(r"explain|what is|tell me about|how does|the|a|an", "", topic).strip()
    
    return chapter_num, topic

def detect_question_type(question: str) -> str:
    """Detects if question is factual (short answer) or requires explanation."""
    question_lower = question.lower().strip()
    
    # Factual/short answer patterns
    factual_patterns = [
        r"^what is the (name|title|definition|meaning|value|formula|unit|symbol)",
        r"^what is (the )?(name|title|definition|meaning|value|formula|unit|symbol)",
        r"^what (is|are) (the )?name",
        r"^define",
        r"^what does .* mean",
        r"^meaning of",
        r"^what (is|are) .*\?$",  # Simple "what is X?" questions
    ]
    
    # Explanation patterns
    explanation_patterns = [
        r"^explain",
        r"^how (does|do|can|will)",
        r"^describe",
        r"^tell me about",
        r"^why",
        r"^what (is|are) .* (and|or|how|why)",  # Complex questions
    ]
    
    # Check for factual patterns first
    for pattern in factual_patterns:
        if re.search(pattern, question_lower):
            return "factual"
    
    # Check for explanation patterns
    for pattern in explanation_patterns:
        if re.search(pattern, question_lower):
            return "explanation"
    
    # Default: if question is short and simple, treat as factual
    if len(question.split()) <= 6 and "?" in question:
        return "factual"
    
    return "explanation"

# --- Endpoints ---
@app.get("/")
async def root():
    return {"message": "School AI Tutor API is running. Visit /docs for documentation."}
@app.post("/notebook", response_model=NotebookCreateResponse)
async def create_notebook():
    notebook_id = str(uuid.uuid4())
    # Chroma creates collections on demand, so we just return the ID
    return {
        "notebook_id": notebook_id,
        "message": f"Notebook {notebook_id} created successfully."
    }

@app.post("/notebook/{notebook_id}/upload")
async def upload_pdf(notebook_id: str, file: UploadFile = File(...)):
    # 1. Save PDF
    notebook_pdf_dir = os.path.join(PDF_DIR, notebook_id)
    os.makedirs(notebook_pdf_dir, exist_ok=True)
    file_path = os.path.join(notebook_pdf_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Extract and Chunk
    pages_content = extract_text_from_pdf(file_path)
    if not pages_content:
        raise HTTPException(status_code=400, detail="PDF is empty or could not be read.")
        
    chunks = chunk_text(pages_content)
    
    # 3. Embed and Store in Chroma
    collection = chroma_client.get_or_create_collection(name=f"notebook_{notebook_id}")
    
    ids = []
    embeddings = []
    metadatas = []
    documents = []
    
    for idx, chunk in enumerate(chunks):
        chunk_id = f"{file.filename}_{idx}"
        chunk_embedding = embedding_model.encode(chunk["text"]).tolist()
        
        ids.append(chunk_id)
        embeddings.append(chunk_embedding)
        metadatas.append({
            "pages": json.dumps(chunk["pages"]),
            "filename": file.filename
        })
        documents.append(chunk["text"])
        
    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=documents
    )
    
    return {"message": f"Successfully uploaded and indexed {file.filename}"}

@app.post("/notebook/{notebook_id}/query", response_model=QueryResponse)
async def query_notebook(notebook_id: str, request: QueryRequest):
    # 1. Parse Question and detect type
    chapter_num, topic_keywords = extract_topic_info(request.question)
    question_type = detect_question_type(request.question)
    
    # 2. Similarity Search
    try:
        collection = chroma_client.get_collection(name=f"notebook_{notebook_id}")
    except:
        raise HTTPException(status_code=404, detail="Notebook not found.")
        
    query_embedding = embedding_model.encode(request.question).tolist()
    
    # Fetch more results to ensure we get all relevant content
    # Increased for better coverage
    n_results = 20 if question_type == "factual" else 15
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    
    if not results['documents'] or not results['documents'][0]:
        return {
            "topic": topic_keywords or "Unknown",
            "explanation": "This topic is not available in the notebook.",
            "pages": []
        }
    
    # 3. Filter chunks based on topic/chapter with improved matching
    relevant_chunks = []
    relevant_pages = set()
    
    # Extract key terms from question for better matching
    question_lower = request.question.lower()
    # Remove common question words
    question_terms = re.sub(r'\b(what|is|are|the|a|an|of|to|for|in|on|at|by|with|from|about|how|why|when|where|explain|tell|me|does|do|can|will|would|should|could)\b', '', question_lower)
    question_terms = [t.strip() for t in question_terms.split() if len(t.strip()) > 2]  # Only meaningful terms
    
    # Search terms for filtering
    filter_terms = []
    if chapter_num:
        filter_terms.append(f"chapter {chapter_num}")
        filter_terms.append(f"unit {chapter_num}")  # Also check for "unit"
    if topic_keywords:
        # Split topic keywords for better matching
        filter_terms.extend([t for t in topic_keywords.split() if len(t) > 2])
    
    # Combine all search terms
    all_search_terms = filter_terms + question_terms
    
    # Score chunks by relevance
    chunk_scores = []
    for i in range(len(results['documents'][0])):
        doc_text = results['documents'][0][i]
        doc_meta = results['metadatas'][0][i]
        
        # Calculate relevance score
        score = 0
        doc_lower = doc_text.lower()
        
        # Exact matches get higher scores
        for term in all_search_terms:
            if term.lower() in doc_lower:
                # Exact word match (not substring) gets higher score
                if re.search(r'\b' + re.escape(term.lower()) + r'\b', doc_lower):
                    score += 3
                else:
                    score += 1
        
        # If no specific terms, use similarity search order (earlier = more relevant)
        if not all_search_terms:
            score = len(results['documents'][0]) - i
        
        chunk_scores.append({
            'text': doc_text,
            'meta': doc_meta,
            'score': score,
            'index': i
        })
    
    # Sort by score (highest first) and take top chunks
    chunk_scores.sort(key=lambda x: x['score'], reverse=True)
    
    # For factual questions, be more selective; for explanations, include more context
    max_chunks = 10 if question_type == "factual" else 12
    
    for chunk_data in chunk_scores[:max_chunks]:
        if chunk_data['score'] > 0 or not all_search_terms:  # Include if relevant or if no specific terms
            relevant_chunks.append(chunk_data['text'])
            pages = json.loads(chunk_data['meta']['pages'])
            relevant_pages.update(pages)
            
    if not relevant_chunks:
        return {
            "topic": topic_keywords or f"Chapter {chapter_num}" if chapter_num else "Requested Topic",
            "explanation": "This topic is not available in the notebook.",
            "pages": []
        }
        
    # 4. Build Context and Call LLM
    context = "\n\n".join(relevant_chunks)
    
    if question_type == "factual":
        # For factual questions: concise, direct answer only
        system_prompt = (
            "Read the following notebook context CAREFULLY and answer the question using EXACT information from it. "
            "Give a SHORT, DIRECT answer. Do NOT provide explanations, examples, or extra details. "
            "If asking for a name, definition, or meaning, provide ONLY that specific information EXACTLY as written in the context. "
            "Read every word in the context carefully to find the precise answer. "
            "If the answer is not in the context, say 'This topic is not available in the notebook.' "
            "Do not use any knowledge outside the provided context. Do not paraphrase if exact text is available.\n\n"
            f"Context from notebook:\n{context}\n\n"
            f"Question: {request.question}\n\n"
            "Answer (be concise, direct, and use exact information from context):"
        )
    else:
        # For explanation questions: detailed teacher-style explanation
        system_prompt = (
            "Read the following notebook context CAREFULLY. You are a helpful SCHOOL TEACHER. "
            "Explain the following topic based ONLY on the provided notebook context. "
            "Read every detail in the context carefully and use the EXACT information from it. "
            "Use simple language. Be clear and step-by-step. Use bullet points where useful and short paragraphs. "
            "If the answer is not in the context, say 'This topic is not available in the notebook.' "
            "Do not hallucinate or use external knowledge. Base your explanation ONLY on what is written in the context.\n\n"
            f"Context from notebook:\n{context}\n\n"
            f"Question: {request.question}"
        )
    
    explanation = call_ollama(system_prompt)
    
    # Final check for "not available" response from LLM
    if "not available in the notebook" in explanation.lower() or len(explanation.strip()) < 10:
        return {
            "topic": topic_keywords or f"Chapter {chapter_num}" if chapter_num else "Requested Topic",
            "explanation": "This topic is not available in the notebook.",
            "pages": []
        }
    
    # Post-process factual answers to ensure conciseness
    if question_type == "factual":
        # Remove verbose prefixes like "Based on the context..." or "According to the notebook..."
        explanation = re.sub(r"^(based on|according to|from the context|in the notebook)[^.]*\.\s*", "", explanation, flags=re.IGNORECASE)
        explanation = explanation.strip()
        
        # If answer is still too long (more than 3 sentences), try to extract the first sentence
        sentences = explanation.split('.')
        if len(sentences) > 3:
            # Take first meaningful sentence(s) up to 2 sentences
            explanation = '. '.join(sentences[:2]).strip()
            if not explanation.endswith('.'):
                explanation += '.'

    return {
        "topic": topic_keywords or f"Chapter {chapter_num}" if chapter_num else "Requested Topic",
        "explanation": explanation,
        "pages": sorted(list(relevant_pages))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
