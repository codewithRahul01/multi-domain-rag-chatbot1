"""Education domain RAG chain.

Uses lazy singleton initialisation: models are loaded on the FIRST request
and cached for every subsequent call.  This keeps Render startup fast while
still giving per-request latency under 5 seconds after warm-up.
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

# ── Lazy singletons (None until first request) ────────────────────────────────
_LLM: Optional[ChatGroq] = None
_VS: Optional[FAISS] = None
_VS_LOADED: bool = False          # True once we've attempted to load the VS


def _get_llm() -> ChatGroq:
    global _LLM
    if _LLM is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is missing from .env")
        _LLM = ChatGroq(model="llama-3.1-8b-instant", api_key=api_key)
    return _LLM


def _get_vs() -> Optional[FAISS]:
    global _VS, _VS_LOADED
    if not _VS_LOADED:
        _VS_LOADED = True
        if VS_PATH.exists() and (VS_PATH / "index.faiss").exists():
            print("[Education] Loading vectorstore…")
            embeddings = HuggingFaceEmbeddings(model_name=_EMBED_MODEL)
            _VS = FAISS.load_local(str(VS_PATH), embeddings, allow_dangerous_deserialization=True)
            print("[Education] Vectorstore ready.")
        else:
            print(f"[Education] WARNING: vectorstore missing at {VS_PATH}. Using generic LLM.")
    return _VS
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
    llm = _get_llm()
    vs = _get_vs()

    if vs is None:
        prompt = GENERIC_PROMPT.format(question=question)
        resp = llm.invoke(prompt)
        return resp.content, "GPT (no vectorstore)"

    docs = vs.similarity_search_with_score(question, k=3)

    if not docs:
        prompt = GENERIC_PROMPT.format(question=question)
        resp = llm.invoke(prompt)
        return resp.content, "GPT (no docs)"

    best_doc, best_score = docs[0]
    print(f"[Education] Best similarity score: {best_score:.4f}")

    if best_score > SCORE_THRESHOLD:
        prompt = GENERIC_PROMPT.format(question=question)
        resp = llm.invoke(prompt)
        return resp.content, f"GPT (score={best_score:.4f} > {SCORE_THRESHOLD})"

    context = "\n\n".join(doc.page_content for doc, _ in docs)
    prompt = RAG_PROMPT.format(question=question, context=context)
    resp = llm.invoke(prompt)
    return resp.content, f"RAG (score={best_score:.4f} <= {SCORE_THRESHOLD})"


if __name__ == "__main__":
    print("Hybrid RAG (Education) – ask a question, or press Enter to exit.\n")
    while True:
        q = input("Question: ").strip()
        if not q:
            break
        try:
            answer, mode = hybrid_rag(q)
            print(f"\n--- MODE: {mode} ---\n{answer}\n{'─'*80}\n")
        except Exception as e:
            print("Error:", e)
