#  Multi-Domain RAG Chatbot

A production-ready **Retrieval-Augmented Generation (RAG)** chatbot that serves intelligent answers across multiple knowledge domains — **Education**, **Medical**, and **Legal**. Built with a **FastAPI** backend, **React + TypeScript** frontend, and a hybrid retrieval pipeline (FAISS vector search + LLM fallback) powered by **Groq (LLaMA 3.1)**.

---

##  Features

- **Multi-Domain Support** — Separate RAG pipelines for Education, Medical, and Legal domains, each with curated vectorstores and tailored prompts.
- **Hybrid Retrieval** — Combines FAISS similarity search with an LLM-only fallback when no relevant documents are found, ensuring the chatbot always provides an answer.
- **Modern React Frontend** — A clean, responsive UI built with React, TypeScript, and Vite featuring domain-specific chat interfaces with unique color themes.
- **FastAPI Backend** — Async API with domain-based routing, CORS support, and health checks.
- **Groq-Powered LLM** — Uses the `llama-3.1-8b-instant` model via Groq for fast, high-quality responses.
- **Sentence Transformers Embeddings** — Leverages `all-mpnet-base-v2` for generating document and query embeddings.
- **Docker Ready** — Includes Dockerfile and docker-compose for containerized deployment.

---
## Deployment Link:


##  Project Structure

```
multi-domain-rag-chatbot/
│
├── config/                        # Configuration files
│   ├── model_config.json          # Model configuration
│   ├── prompts_education.txt      # Education domain prompt template
│   ├── prompts_medical.txt        # Medical domain prompt template
│   └── settings.yaml              # App settings
│
├── data/
│   ├── raw/                       # Raw source data per domain
│   │   └── medical/
│   └── processed/                 # Cleaned / preprocessed data
│       └── medical/
│
├── deployment/
│   ├── dockerfile                 # Docker image definition
│   ├── docker-compose.yaml        # Multi-container orchestration
│   └── run.sh                     # Quick-start shell script
│
├── frontend/                      # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx                # Main app with routing & navigation
│   │   ├── components/            # Chat UI components
│   │   └── styles.css             # Global styles
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── src/
│   ├── app/
│   │   └── main.py                # FastAPI entrypoint & API routes
│   ├── data_preparation/
│   │   ├── preprocess_education.py
│   │   ├── preprocess_medical.py
│   ├── embeddings/
│   │   ├── vector_store_education.py
│   │   ├── vector_store_medical.py
│   ├── rag_pipeline/
│   │   ├── rag_chain_education.py  # Education RAG chain
│   │   ├── rag_chain_medical.py    # Medical RAG chain
│   ├── retriever/
│   │   ├── domain_router.py        # Routes queries to correct domain
│   │   ├── hybrid_search.py        # Hybrid search implementation
│   │   └── reranker.py             # Result re-ranking logic
│   └── evaluation/                 # Model evaluation utilities
│
├── vectorstores/                   # FAISS index files (git-ignored)
├── notebooks/                      # Jupyter notebooks for experiments
├── requirements.txt                # Python dependencies
├── test_endpoints.py               # API endpoint tests
└── .env                            # Environment variables (git-ignored)
```

---

##  Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Groq API Key** — Get one free at [console.groq.com](https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/Himanshutomar03/multi-domain-rag-chatbot.git
cd multi-domain-rag-chatbot
```

### 2. Set Up the Backend

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Prepare Data & Build Vector Stores

```bash
# Preprocess raw data
python src/data_preparation/preprocess_medical.py
python src/data_preparation/preprocess_education.py

# Build FAISS vector stores
python src/embeddings/vector_store_medical.py
python src/embeddings/vector_store_education.py
```

### 5. Start the Backend Server

```bash
uvicorn src.app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### 6. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

##  API Endpoints

| Method | Endpoint      | Description                          |
| ------ | ------------- | ------------------------------------ |
| `GET`  | `/health`     | Health check — returns `{"status": "ok"}` |
| `POST` | `/api/chat`   | Send a chat message to a domain      |

### POST `/api/chat`

**Request Body:**

```json
{
  "message": "What are the symptoms of diabetes?",
  "domain": "medical"
}
```

**Response:**

```json
{
  "answer": "The common symptoms of diabetes include...",
  "mode": "RAG (score=0.4523 <= 0.80)"
}
```

> The `mode` field tells you whether the answer came from the **RAG pipeline** (relevant documents were found) or the **LLM directly** (no matching documents).

**Supported domains:** `education`, `medical`

---

##  How the Hybrid RAG Works

```
User Query
    │
    ▼
┌──────────────────────┐
│  FAISS Vector Search  │  ← Finds top-3 most similar documents
│  (similarity score)   │
└──────────┬───────────┘
           │
     score <= 0.80?
      /         \
    YES          NO
     │            │
     ▼            ▼
┌──────────┐  ┌──────────────┐
│ RAG Mode │  │ LLM Fallback │
│ Answer   │  │ (Generic)    │
│ from     │  │ Answer from  │
│ Context  │  │ LLM only     │
└──────────┘  └──────────────┘
```

1. The user's question is embedded and searched against the domain's FAISS vector store.
2. If the best match score is **≤ threshold** (high similarity), the retrieved documents are used as context for the LLM → **RAG mode**.
3. If the score is **> threshold** (low similarity), the LLM answers using its own knowledge → **LLM fallback mode**.

---

## 🛠️ Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| **LLM**        | Groq — LLaMA 3.1 8B Instant                 |
| **Embeddings** | Sentence-Transformers (`all-mpnet-base-v2`)  |
| **Vector Store**| FAISS (Facebook AI Similarity Search)       |
| **Backend**    | FastAPI, LangChain, Uvicorn                  |
| **Frontend**   | React 18, TypeScript, Vite, React Router     |
| **Deployment** | Docker, Docker Compose                       |

---

## 🐳 Docker Deployment

```bash
cd deployment
docker-compose up --build
```

---

## 📁 Adding a New Domain

1. **Add raw data** → `data/raw/<domain>/`
2. **Create a preprocessor** → `src/data_preparation/preprocess_<domain>.py`
3. **Build the vector store** → `src/embeddings/vector_store_<domain>.py`
4. **Create the RAG chain** → `src/rag_pipeline/rag_chain_<domain>.py`
5. **Register the domain** in `src/app/main.py` (add to the `Domain` enum and `rag_functions` dict)
6. **Add a frontend route** in `frontend/src/App.tsx`

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Himanshu Tomar**
- GitHub: [@Himanshutomar03](https://github.com/Himanshutomar03)
