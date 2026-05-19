from google import genai
import os
import numpy as np
from langchain_core.runnables import RunnableLambda

def normalize_text(text: str) -> str:
    """입력 텍스트 정규화"""
    if not text:
        return ""
    return text.strip().lower()

def get_embedding(text: str) -> np.ndarray:
    """구글 제미나이 고성능 실시간 임베딩 API를 활용한 벡터 추출 (768차원)"""
    normalized = normalize_text(text)
    
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not gemini_key or gemini_key == "your_actual_gemini_api_key_here":
        raise ValueError("Google Gemini API 키(GEMINI_API_KEY)가 .env 파일에 설정되어 있지 않습니다.")
        
    try:
        # Google GenAI 신형 SDK 임베딩 생성 방식 적용
        client = genai.Client(api_key=gemini_key)
        result = client.models.embed_content(
            model="text-multilingual-embedding-002",  # 다국어/한국어 지원 및 v1beta 호환성 100% 모델
            contents=normalized
        )
        if result and result.embeddings:
            embedding_vector = result.embeddings[0].values
            return np.array(embedding_vector, dtype=np.float32)
        else:
            raise ValueError("Gemini 임베딩 API 결과가 비어 있습니다.")
    except Exception as e:
        print(f"Gemini 임베딩 API 호출 중 치명적인 장애 발생: {e}")
        raise RuntimeError(f"Gemini 임베딩 API 호출 중 치명적인 장애 발생: {e}")


# LangChain 파이프라인 구성
normalize_chain = RunnableLambda(normalize_text)
embedding_chain = RunnableLambda(get_embedding)
embedding_pipeline = normalize_chain | embedding_chain


