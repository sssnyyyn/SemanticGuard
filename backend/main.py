from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import uuid
import logging
import aiofiles
from typing import Optional
from dotenv import load_dotenv

from state_machine import cache_graph, CacheState
from vector_store import store
from fastapi.concurrency import run_in_threadpool

# 1. 시스템 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="Semantic Cache Gateway",
    description="의미론적 유사도 기반 AI 응답 캐싱 게이트웨이",
    version="1.0.0"
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5174").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    response: str
    is_cache_hit: bool
    response_time: float
    similarity: float
    cost_saved: float

LOGS_FILE = os.path.join(os.path.dirname(__file__), "logs.json")

# 2. 비동기 파일 읽기 적용 (Event Loop 블로킹 방지)
async def load_logs_async():
    if not os.path.exists(LOGS_FILE):
        return []
    try:
        async with aiofiles.open(LOGS_FILE, mode="r", encoding="utf-8") as f:
            content = await f.read()
            return json.loads(content) if content else []
    except Exception as e:
        logger.error(f"로그 파일 로드 실패: {e}")
        return []

@app.post("/api/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    try:
        # LangGraph 상태 초기화 충돌 방지를 위해 전체 상태가 아닌 필수 입력값만 전달
        # 동기(sync) 노드로 구성된 그래프의 안정적인 실행을 위해 invoke를 스레드풀로 위임
        result = await run_in_threadpool(
            cache_graph.invoke,
            {"query": request.query}
        )

        return QueryResponse(
            # TypedDict의 안전한 키 접근을 위해 get() 메서드 사용
            response=result.get("cached_response") or result.get("backend_response"),
            is_cache_hit=result.get("is_cache_hit", False),
            response_time=result.get("response_time", 0.0),
            similarity=result.get("similarity", 0.0),
            cost_saved=result.get("cost_saved", 0.0)
        )
    except Exception as e:
        logger.error(f"쿼리 처리 중 내부 오류 발생: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="서버 내부에서 쿼리를 처리하는 중 오류가 발생했습니다.")

@app.get("/api/stats")
async def stats():
    logs = await load_logs_async()
    try:
        store_stats = store.get_stats()
    except Exception as e:
        logger.warning(f"벡터 스토어 통계 조회 실패: {e}")
        store_stats = {"total_vectors": 0}

    total_queries = len(logs)
    cache_hits = sum(1 for log in logs if log.get("is_cache_hit", False))
    total_cost_saved = sum(log.get("cost_saved", 0.0) for log in logs)
    avg_response_time = (sum(log.get("response_time", 0.0) for log in logs) / total_queries) if total_queries > 0 else 0.0

    return {
        "cache_size": store_stats.get("total_vectors", 0),
        "queries_processed": total_queries,
        "total_cost_saved": round(total_cost_saved, 4),
        "avg_response_time": round(avg_response_time, 3),
        "cache_hit_rate": round((cache_hits / total_queries * 100) if total_queries > 0 else 0.0, 1)
    }

@app.get("/api/logs")
async def get_logs(query: Optional[str] = None, status: Optional[str] = None):
    logs = await load_logs_async()
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
    bar_data = [
        {"name": "Jan", "cache": 0, "api": 2400},
        {"name": "Feb", "cache": 3000, "api": 1398},
        {"name": "Mar", "cache": 2000, "api": 9800},
        {"name": "Apr", "cache": 2780, "api": 3908},
        {"name": "May", "cache": 1890, "api": 4800},
        {"name": "Jun", "cache": 2390, "api": 3800},
        {"name": "Jul", "cache": 3490, "api": 0},
    ]

    logs = await load_logs_async()
    real_cache_hit = sum(1 for log in logs if log.get("is_cache_hit", False))
    real_api_call = sum(1 for log in logs if not log.get("is_cache_hit", False))

    bar_data[-1]["cache"] += real_cache_hit
    bar_data[-1]["api"] += real_api_call

    line_data = [
        {"time": "09:00", "latency": 45},
        {"time": "12:00", "latency": 85},
        {"time": "15:00", "latency": 40},
        {"time": "18:00", "latency": 90},
    ]

    if logs:
        recent_latencies = [int(log.get("response_time", 0.0) * 1000) for log in logs[:4]]
        for idx, lat in enumerate(recent_latencies):
            if idx < len(line_data):
                line_data[-(idx+1)]["latency"] = lat

    return {
        "barData": bar_data,
        "lineData": line_data
    }

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
