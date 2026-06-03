"""Education domain RAG chain.

Models are loaded ONCE at module import time and reused for every request,
keeping per-request latency under 5 seconds.
"""
from pathlib import Path
import os
from typing import Optional, Tuple

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

VS_PATH = PROJECT_ROOT / "vectorstores" / "education_faiss"
SCORE_THRESHOLD = 0.80
_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ── Singleton: load once, reuse forever ──────────────────────────────────────
def _build_llm() -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing from .env")
    return ChatGroq(model="llama-3.1-8b-instant", api_key=api_key)


def _build_vectorstore() -> Optional[FAISS]:
    if not VS_PATH.exists() or not (VS_PATH / "index.faiss").exists():
        print(f"[Education] WARNING: vectorstore not found at {VS_PATH}. Falling back to generic LLM.")
        return None
    embeddings = HuggingFaceEmbeddings(model_name=_EMBED_MODEL)
    return FAISS.load_local(str(VS_PATH), embeddings, allow_dangerous_deserialization=True)


print("[Education] Loading LLM and vectorstore…")
_LLM: ChatGroq = _build_llm()
_VS: Optional[FAISS] = _build_vectorstore()
print("[Education] Ready.")
# ─────────────────────────────────────────────────────────────────────────────

RAG_PROMPT = PromptTemplate(
    input_variables=["question", "context"],
    template="""You are an EDUCATION domain assistant.
Use ONLY the provided context to answer.

Question: {question}

Context:
{context}

Answer:""",
)

GENERIC_PROMPT = PromptTemplate(
    input_variables=["question"],
    template="""You are a helpful education assistant.
Answer the question concisely and accurately. Only answer education-related topics.
If the question is outside education, politely inform the user.
If you don't know the answer, say so — do not make up an answer.
Use a professional and friendly tone.

{question}

Answer:""",
)


def hybrid_rag(question: str) -> Tuple[str, str]:
    # No vectorstore → pure LLM fallback
    if _VS is None:
        prompt = GENERIC_PROMPT.format(question=question)
        resp = _LLM.invoke(prompt)
        return resp.content, "GPT (no vectorstore)"

    docs = _VS.similarity_search_with_score(question, k=3)

    if not docs:
        prompt = GENERIC_PROMPT.format(question=question)
        resp = _LLM.invoke(prompt)
        return resp.content, "GPT (no docs)"

    best_doc, best_score = docs[0]
    print(f"[Education] Best similarity score: {best_score:.4f}")

    if best_score > SCORE_THRESHOLD:
        prompt = GENERIC_PROMPT.format(question=question)
        resp = _LLM.invoke(prompt)
        return resp.content, f"GPT (score={best_score:.4f} > {SCORE_THRESHOLD})"

    context = "\n\n".join(doc.page_content for doc, _ in docs)
    prompt = RAG_PROMPT.format(question=question, context=context)
    resp = _LLM.invoke(prompt)
    return resp.content, f"RAG (score={best_score:.4f} <= {SCORE_THRESHOLD})"


if __name__ == "__main__":
    print("Hybrid RAG (Education) – ask a question, or press Enter to exit.\n")
    while True:
        q = input("Question: ").strip()
        if not q:
            break
        try:
            answer, mode = hybrid_rag(q)
            print(f"\n--- MODE: {mode} ---")
            print(answer)
            print("\n" + "-" * 80 + "\n")
        except Exception as e:
            print("Error:", e)
