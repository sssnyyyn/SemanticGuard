import time
import json
import os
from typing import TypedDict, List, Optional
import numpy as np
from datetime import datetime
from langgraph.graph import StateGraph, START, END

from google import genai

client = None

def get_gemini_client():
    global client
    if client is not None:
        return client
    
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not gemini_key or gemini_key == "your_actual_gemini_api_key_here":
        raise ValueError("실시간 API 연동을 위해 키를 입력해 주십시오.")
    
    client = genai.Client(api_key=gemini_key)
    return client


# 내부 모듈 임포트
from embedding import get_embedding
from vector_store import store

# 로그 파일 경로 및 초기 시드 데이터 경로
LOGS_FILE = os.path.join(os.path.dirname(__file__), "logs.json")
SEED_LOGS_FILE = os.path.join(os.path.dirname(__file__), "seed_logs.json")

# 초기 로그 데이터 연동 (하드코딩 분리 및 seed_logs.json 외재화)
def init_logs_file():
    if not os.path.exists(LOGS_FILE):
        initial_logs = []
        if os.path.exists(SEED_LOGS_FILE):
            try:
                with open(SEED_LOGS_FILE, "r", encoding="utf-8") as f:
                    initial_logs = json.load(f)
            except Exception as e:
                print(f"시드 로그 파일 로드 중 실패: {e}")
        
        with open(LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_logs, f, ensure_ascii=False, indent=2)

init_logs_file()



# LangGraph 상태 모델 정의 (TypedDict 사용)
class CacheState(TypedDict):
    query: str
    embedding: List[float]
    similarity: float
    is_cache_hit: bool
    cached_response: Optional[str]
    backend_response: Optional[str]
    response_time: float
    cost_saved: float
    start_time: float # 실행 시간 측정을 위한 보조 필드
    prompt_tokens: Optional[int]      # 실제 입력 토큰 수
    completion_tokens: Optional[int]  # 실제 출력 토큰 수

# 1. 임베딩 추출 노드
def embed_query_node(state: CacheState) -> CacheState:
    state["start_time"] = time.time()
    query_text = state["query"]
    embedding_vector = get_embedding(query_text)
    state["embedding"] = embedding_vector.tolist() if isinstance(embedding_vector, np.ndarray) else embedding_vector
    return state

# 2. 의미론적 캐시 검색 노드
def search_cache_node(state: CacheState) -> CacheState:
    embedding_array = np.array(state["embedding"], dtype=np.float32)
    similarity, cached_resp = store.search(embedding_array)

    # settings.json 파일에서 실시간으로 threshold 읽기 (서버 재기동 없는 실시간 동적 반영)
    SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "settings.json")
    threshold = 0.75
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                settings = json.load(f)
                threshold = float(settings.get("similarity_threshold", 0.75))
        except Exception:
            threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
    else:
        threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))

    if cached_resp is not None and similarity >= threshold:
        state["is_cache_hit"] = True
        state["cached_response"] = cached_resp
        state["similarity"] = similarity
    else:
        state["is_cache_hit"] = False
        state["similarity"] = similarity
    return state

# 3. 실시간 LLM 백엔드 호출 노드 (캐시 미스 시 구동)
def call_backend_node(state: CacheState) -> CacheState:
    query_text = state["query"]
    response = None
    prompt_tokens = 0
    completion_tokens = 0

    try:
        # Google Gemini API 클라이언트 지연 획득
        gemini_client = get_gemini_client()
        
        gemini_response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=query_text
        )
        
        if gemini_response and gemini_response.text:
            response = gemini_response.text.strip()
            # API 응답에서 실제 사용된 토큰 정보 획득
            if gemini_response.usage_metadata:
                prompt_tokens = gemini_response.usage_metadata.prompt_token_count or 0
                completion_tokens = gemini_response.usage_metadata.candidates_token_count or 0
        else:
            raise ValueError("Gemini API가 빈 응답을 반환했습니다.")
    except Exception as e:
        raise RuntimeError(f"Google Gemini API 호출 중 실시간 장애 발생: {e}")

    state["backend_response"] = response
    state["prompt_tokens"] = prompt_tokens
    state["completion_tokens"] = completion_tokens

    # 신규 쿼리 및 응답 쌍을 FAISS 벡터 저장소에 캐싱 추가
    embedding_array = np.array(state["embedding"], dtype=np.float32)
    store.add(embedding_array, query_text, response)
    return state



# 4. 성능 지표 및 비용 절감액 산출 노드
def calculate_metrics_node(state: CacheState) -> CacheState:
    # 1. 실제 지연 속도 연산 (시스템 타이머 기반 실제 경과 속도 적용)
    duration = time.time() - state["start_time"]
    state["response_time"] = max(0.001, duration)

    query_text = state["query"]

    if state["is_cache_hit"]:
        final_response = state["cached_response"]
        
        # 2. 캐시 히트 시: 가상의 절감 비용 계산 (정밀 토큰 카운터 추정치 연동)
        # 한국어 텍스트 특성을 감안해 공백 포함 글자 수 대비 입력 1.5배, 출력 2.0배 토큰 추정
        predicted_prompt_tokens = max(1, int(len(query_text) * 1.5))
        predicted_completion_tokens = max(1, int(len(final_response) * 2.0))
        
        # gemini-2.5-flash 공식 단가 적용
        # Input: $0.075 / 1M tokens ($0.000000075 / token)
        # Output: $0.30 / 1M tokens ($0.00000030 / token)
        input_savings = predicted_prompt_tokens * 0.000000075
        output_savings = predicted_completion_tokens * 0.00000030
        state["cost_saved"] = input_savings + output_savings
    else:
        final_response = state["backend_response"]
        
        # 3. 캐시 미스 시: 실제 LLM 비용이 소비되었으므로 절감액은 $0
        state["cost_saved"] = 0.0

    return state

# LangGraph 그래프 구조 정의 및 노드 배치
workflow = StateGraph(CacheState)

workflow.add_node("embed_query", embed_query_node)
workflow.add_node("search_cache", search_cache_node)
workflow.add_node("call_backend", call_backend_node)
workflow.add_node("calculate_metrics", calculate_metrics_node)

# 엔트리 포인트 및 흐름 연결
workflow.add_edge(START, "embed_query")
workflow.add_edge("embed_query", "search_cache")

# 캐시 히트 여부에 따른 조건부 라우팅
def route_cache(state: CacheState) -> str:
    if state["is_cache_hit"]:
        return "calculate_metrics"
    return "call_backend"

workflow.add_conditional_edges(
    "search_cache",
    route_cache,
    {
        "calculate_metrics": "calculate_metrics",
        "call_backend": "call_backend"
    }
)

workflow.add_edge("call_backend", "calculate_metrics")
workflow.add_edge("calculate_metrics", END)

# 그래프 컴파일
cache_graph = workflow.compile()
