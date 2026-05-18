from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
from typing import Optional
from dotenv import load_dotenv

# 내부 모듈 임포트 (상태 관리 로직 및 벡터 저장소)
from state_machine import cache_graph, CacheState
from vector_store import store

# 환경 변수 로드 (.env 파일 적용)
load_dotenv()

app = FastAPI(
    title="Semantic Cache Gateway",
    description="의미론적 유사도 기반 AI 응답 캐싱 게이트웨이",
    version="1.0.0"
)

# CORS(교차 출처 리소스 공유) 설정
# 프론트엔드 도메인을 환경 변수에서 읽어오며, 기본값으로 로컬 개발 환경(Vite, CRA) 포트 지정
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5174").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins],
    allow_credentials=True,
    allow_methods=["*"], # 모든 HTTP 메서드 허용 (GET, POST 등)
    allow_headers=["*"], # 모든 HTTP 헤더 허용
)

# 클라이언트 요청 데이터 검증을 위한 Pydantic 모델 정의
class QueryRequest(BaseModel):
    query: str

# API 응답 데이터 규격을 위한 Pydantic 모델 정의
class QueryResponse(BaseModel):
    response: str
    is_cache_hit: bool
    response_time: float
    similarity: float
    cost_saved: float

# 로그 파일 경로
LOGS_FILE = os.path.join(os.path.dirname(__file__), "logs.json")

def load_logs():
    if os.path.exists(LOGS_FILE):
        try:
            with open(LOGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

@app.post("/api/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """의미론적 캐시 게이트웨이 주요 처리 엔드포인트"""
    # LangGraph 상태 머신 비동기 실행 (ainvoke)
    # 초기 상태(CacheState)를 정의하여 파이프라인에 주입
    result = await cache_graph.ainvoke(CacheState(
        query=request.query,
        embedding=[],
        similarity=0.0,
        is_cache_hit=False,
        cached_response=None,
        backend_response=None,
        response_time=0.0,
        cost_saved=0.0,
        start_time=0.0
    ))

    # 상태 머신 처리 결과를 Pydantic 모델에 맞추어 반환
    # 캐시 히트 시 cached_response, 미스 시 backend_response를 사용
    return QueryResponse(
        response=result["cached_response"] or result["backend_response"],
        is_cache_hit=result["is_cache_hit"],
        response_time=result["response_time"],
        similarity=result["similarity"],
        cost_saved=result["cost_saved"]
    )

@app.get("/api/stats")
async def stats():
    """대시보드 통계를 위한 실제 통계 산출 엔드포인트"""
    logs = load_logs()
    store_stats = store.get_stats()
    
    total_queries = len(logs)
    cache_hits = sum(1 for log in logs if log.get("is_cache_hit", False))
    total_cost_saved = sum(log.get("cost_saved", 0.0) for log in logs)
    
    # 평균 응답 시간 계산 (캐시 히트 및 캐시 미스 모두 포함)
    avg_response_time = (sum(log.get("response_time", 0.0) for log in logs) / total_queries) if total_queries > 0 else 0.0
    
    return {
        "cache_size": store_stats["total_vectors"],
        "queries_processed": total_queries,
        "total_cost_saved": round(total_cost_saved, 4),
        "avg_response_time": round(avg_response_time, 3),
        "cache_hit_rate": round((cache_hits / total_queries * 100) if total_queries > 0 else 0.0, 1)
    }

@app.get("/api/logs")
async def get_logs(query: Optional[str] = None, status: Optional[str] = None):
    """상세 로그 조회를 위한 검색 및 필터링 엔드포인트"""
    logs = load_logs()
    
    filtered_logs = logs
    if query:
        query_lower = query.lower()
        filtered_logs = [log for log in filtered_logs if query_lower in log.get("query", "").lower() or query_lower in log.get("response", "").lower()]
        
    if status and status != "전체":
        if status == "성공":
            filtered_logs = [log for log in filtered_logs if log.get("status") == "성공"]
        elif status == "실패":
            filtered_logs = [log for log in filtered_logs if log.get("status") == "실패"]
        elif status == "캐시히트":
            filtered_logs = [log for log in filtered_logs if log.get("is_cache_hit", False)]
        elif status == "API호출":
            filtered_logs = [log for log in filtered_logs if not log.get("is_cache_hit", False)]
            
    return filtered_logs

@app.get("/api/charts")
async def charts():
    """대시보드 차트 시각화를 위한 동적/정적 차트 데이터 엔드포인트"""
    # 1. 쿼리 처리 현황 (캐시 히트 vs API 호출) - 월별 누적 데이터
    # 기본 데이터 구조 설정
    bar_data = [
        {"name": "Jan", "cache": 0, "api": 2400},
        {"name": "Feb", "cache": 3000, "api": 1398},
        {"name": "Mar", "cache": 2000, "api": 9800},
        {"name": "Apr", "cache": 2780, "api": 3908},
        {"name": "May", "cache": 1890, "api": 4800},
        {"name": "Jun", "cache": 2390, "api": 3800},
        {"name": "Jul", "cache": 3490, "api": 0},
    ]
    
    # 최근 유입 로그의 개수를 계산하여 차트의 마지막 달(7월) 캐시 및 API에 가산
    logs = load_logs()
    real_cache_hit = sum(1 for log in logs if log.get("is_cache_hit", False))
    real_api_call = sum(1 for log in logs if not log.get("is_cache_hit", False))
    
    bar_data[-1]["cache"] += real_cache_hit
    bar_data[-1]["api"] += real_api_call

    # 2. 시간대별 트래픽 유입 트렌드 (응답 지연 속도 추이)
    line_data = [
        {"time": "09:00", "latency": 45},
        {"time": "12:00", "latency": 85},
        {"time": "15:00", "latency": 40},
        {"time": "18:00", "latency": 90},
    ]
    
    if logs:
        # 최근 4개 로그의 응답 속도 밀리초 단위를 가져와 트렌드에 반영
        recent_latencies = [int(log.get("response_time", 0.0) * 1000) for log in logs[:4]]
        # 기존 모의 데이터에 덮어써서 실시간성을 보여줍니다
        for idx, lat in enumerate(recent_latencies):
            if idx < len(line_data):
                line_data[-(idx+1)]["latency"] = lat

    return {
        "barData": bar_data,
        "lineData": line_data
    }

@app.get("/health")
async def health():
    """서버 상태 확인용 헬스 체크 엔드포인트"""
    return {"status": "ok", "version": "1.0.0"}

