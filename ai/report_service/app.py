import os
import faiss
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv
import pytesseract
from PIL import Image
import io

load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes so the frontend can communicate with it
CORS(app)

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")
    client = None

# RAG Implementation
INDEX_PATH = "knowledge_index.faiss"
META_PATH = "knowledge_metadata.pkl"
KNOWLEDGE_BASE_FILE = "knowledge_base/articles.txt"

def get_embedding(text):
    if not client: return []
    result = client.models.embed_content(
        model="text-embedding-004",
        contents=text,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )
    return result.embeddings[0].values

def build_index():
    if not os.path.exists(KNOWLEDGE_BASE_FILE):
        print("Knowledge base file not found.")
        return None, []

    with open(KNOWLEDGE_BASE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    articles = content.split('---ARTICLE---')
    metadata = []
    embeddings = []

    for article in articles:
        article = article.strip()
        if not article:
            continue
        
        lines = article.split('\n')
        title = "Unknown"
        source = "Unknown"
        text_content = ""
        
        for line in lines:
            if line.startswith('Title:'):
                title = line.replace('Title:', '').strip()
            elif line.startswith('Source:'):
                source = line.replace('Source:', '').strip()
            elif line.startswith('Content:'):
                text_content = line.replace('Content:', '').strip()
            elif text_content: 
                text_content += " " + line.strip()
        
        if text_content:
            meta = {"title": title, "source": source, "text": text_content}
            metadata.append(meta)
            embeddings.append(get_embedding(text_content))

    if not embeddings:
        return None, []

    dimension = len(embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    vectors = np.array(embeddings).astype('float32')
    index.add(vectors)

    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, 'wb') as f:
        pickle.dump(metadata, f)
        
    print(f"Built FAISS index with {len(metadata)} articles.")
    return index, metadata

def load_index():
    index = faiss.read_index(INDEX_PATH)
    with open(META_PATH, 'rb') as f:
        metadata = pickle.load(f)
    print("Loaded FAISS index from disk.")
    return index, metadata

try:
    if os.path.exists(INDEX_PATH) and os.path.exists(META_PATH):
        faiss_index, faiss_metadata = load_index()
    else:
        faiss_index, faiss_metadata = build_index()
except Exception as e:
    print("Error initializing FAISS index:", str(e))
    faiss_index, faiss_metadata = None, []

def search_knowledge_base(query, top_k=3):
    if not faiss_index or not faiss_metadata or not client:
        return []
    
    query_emb = client.models.embed_content(
        model="text-embedding-004",
        contents=query,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    ).embeddings[0].values
    
    query_vector = np.array([query_emb]).astype('float32')
    distances, indices = faiss_index.search(query_vector, top_k)
    
    results = []
    for idx in indices[0]:
        if idx < len(faiss_metadata) and idx >= 0:
            results.append(faiss_metadata[idx])
    return results

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "Report Demystifier Service is running", 
        "endpoints": ["POST /simplify", "POST /ocr"]
    })

@app.route('/ocr', methods=['POST'])
def ocr():
    if 'image' not in request.files:
        return jsonify({"error": "No image file"}), 400
    file = request.files['image']
    try:
        img = Image.open(file.stream).convert('L')  # grayscale
        text = pytesseract.image_to_string(img).strip()
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/simplify', methods=['POST'])
def simplify():
    if not client:
        return jsonify({"error": "Gemini API client not initialized. Check GEMINI_API_KEY."}), 500
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Please provide 'text' in the JSON body."}), 400
        
    text = data['text']
    
    prompt = f"""You are an empathetic medical professional. 
Rewrite the following clinical report in plain, easy-to-understand language at a 6th-grade reading level. 
Explain any medical terms. Keep it reassuring. 
CRITICAL: Do NOT use any Markdown formatting like asterisks (*) or hash symbols (#). Return plain text with paragraph breaks only.

Report:
{text}"""

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt
        )
        
        return jsonify({"simplified": response.text})
    except Exception as e:
        print("Error generating content:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/ask', methods=['POST'])
def ask():
    if not client:
        return jsonify({"error": "Gemini API client not initialized. Check GEMINI_API_KEY."}), 500
    data = request.get_json()
    if not data or 'question' not in data or 'reportContext' not in data:
        return jsonify({"error": "Please provide 'question' and 'reportContext' in the JSON body."}), 400
        
    question = data['question']
    report_context = data['reportContext']
    
    prompt = f"""You are a compassionate health buddy. 
The patient's simplified report is: 
{report_context}

Answer the patient's following question in a single, reassuring paragraph. Keep it simple and easy to understand.
Do NOT use Markdown formatting like asterisks (*) or hash symbols (#). Return plain text only.

Patient's Question: {question}"""

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt
        )
        return jsonify({"answer": response.text})
    except Exception as e:
        print("Error generating content:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_trend', methods=['POST'])
def analyze_trend():
    if not client:
        return jsonify({"error": "Gemini API client not initialized. Check GEMINI_API_KEY."}), 500
    data = request.get_json()
    if not data or 'reports' not in data:
        return jsonify({"error": "Please provide 'reports' in the JSON body."}), 400
        
    reports = data['reports']
    if not isinstance(reports, list) or len(reports) < 2:
        return jsonify({"error": "At least 2 reports are required to analyze trends."}), 400
        
    report_text = ""
    for r in reports:
        report_text += f"- [{r.get('date', 'Unknown Date')}]: {r.get('summary', '')}\n"
        
    prompt = f"""You are a compassionate family doctor. Below is a chronological list of a patient's medical report summaries from different visits. Identify any trends, improvements, worsening, or new concerns. Write a 3-4 sentence summary in plain language (6th-grade reading level) that tells the patient how their health has changed over time. Be honest but reassuring. If everything is stable, say so clearly. If something needs attention, gently suggest a follow-up.

Reports:
{report_text}"""

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.5,
            )
        )
        return jsonify({"trend_summary": response.text})
    except Exception as e:
        print("Error generating content:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/ask_rag', methods=['POST'])
def ask_rag():
    if not client:
        return jsonify({"error": "Gemini API client not initialized. Check GEMINI_API_KEY."}), 500
    data = request.get_json()
    if not data or 'question' not in data:
        return jsonify({"error": "Please provide 'question' in the JSON body."}), 400
        
    question = data['question']
    patient_context = data.get('patient_context', '')
    
    retrieved = search_knowledge_base(question, top_k=3)
    
    context_string = ""
    sources = []
    for r in retrieved:
        context_string += f"[Source: {r['title']}] {r['text']}\n\n"
        if r['title'] not in sources:
            sources.append(r['title'])
            
    if patient_context:
        context_string = f"[Patient's Case Data]\n{patient_context}\n\n" + context_string

    prompt = f"""You are a helpful, truthful medical assistant. Answer the patient's question using ONLY the information provided in the context below. If the context does not contain the answer, say "I don't have enough reliable information to answer that." Always cite the source of your information exactly like: [Source: Title].

Context:
{context_string}

Patient's Question: {question}

Answer:"""

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2)
        )
        return jsonify({"answer": response.text, "sources": sources})
    except Exception as e:
        print("Error in RAG generation:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on port 7001 as 7000 is occupied by macOS
    app.run(host='0.0.0.0', port=7001)
