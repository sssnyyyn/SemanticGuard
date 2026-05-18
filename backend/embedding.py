from sentence_transformers import SentenceTransformer
from langchain_core.runnables import RunnableLambda
import numpy as np

# 모델 로드 (최초 실행 시 다운로드 수행, 이후 캐시 사용)
try:
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"모델 로드 오류 발생: {e}")
    embedding_model = None

def normalize_text(text: str) -> str:
    """입력 텍스트 정규화"""
    if not text:
        return ""
    return text.strip().lower()

def get_embedding(text: str) -> np.ndarray:
    """텍스트를 벡터 임베딩으로 변환"""
    normalized = normalize_text(text)
    if embedding_model is None:
        return np.zeros(384) # 예외 발생 시 대체값 (384차원 0 벡터) 반환
    return embedding_model.encode(normalized)

# LangChain 파이프라인 구성
normalize_chain = RunnableLambda(normalize_text)
embedding_chain = RunnableLambda(get_embedding)
embedding_pipeline = normalize_chain | embedding_chain
