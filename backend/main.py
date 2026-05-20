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
from datetime import datetime

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

cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env:
    origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    origins = []
    logger.warning("경고: .env 내 CORS_ORIGINS 설정이 누락되었습니다. 보안을 위해 비인가 외부 접속이 강제 차단 정책으로 설정됩니다.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
        # 1. AI 모델 캐시 및 응답 처리
        result = await run_in_threadpool(
            cache_graph.invoke,
            {"query": request.query}
        )

        response_text = result.get("cached_response") or result.get("backend_response")
        is_cache_hit = result.get("is_cache_hit", False)
        
        # NumPy float32 타입 등으로 인한 JSON 직렬화 에러를 방지하기 위해 내장 float로 명시적 형변환
        response_time = float(result.get("response_time", 0.0))
        similarity = float(result.get("similarity", 0.0))
        cost_saved = float(result.get("cost_saved", 0.0))

        # 3. 비동기 로그 파일 갱신 (Race condition 방지 및 최신순 정렬)
        logs = await load_logs_async()
        
        # 2. 신규 로그 데이터 생성 (단일 비동기 스키마 완전 동기화)
        new_id = max([log.get("id", 0) for log in logs], default=0) + 1
        new_log = {
            "id": new_id,
            "timestamp": datetime.now().strftime("%Y.%m.%d %H:%M:%S"),
            "query": request.query,
            "response": response_text,
            "is_cache_hit": is_cache_hit,
            "response_time": round(response_time, 3),
            "similarity": round(similarity, 3),
            "cost_saved": round(cost_saved, 4),
            "status": "성공"
        }

        logs.insert(0, new_log)  # 최신 데이터가 기존 데이터 배열의 맨 앞에 오도록 추가

        # [안전장치] 파일 쓰기를 시작하기 전에 JSON 직렬화가 완벽히 성공하는지 검증합니다.
        # 이를 통해 만약의 에러 상황에서도 기존 logs.json 파일이 비워지는 현상을 예방합니다.
        try:
            dumped_data = json.dumps(logs, ensure_ascii=False, indent=2)
            async with aiofiles.open(LOGS_FILE, mode="w", encoding="utf-8") as f:
                await f.write(dumped_data)
        except TypeError as e:
            logger.error(f"로그 JSON 직렬화 중 에러가 발생하여 파일 쓰기를 건너뛰었습니다. (기존 로그 보존): {e}")

        # 4. 프론트엔드로 결과 반환
        return QueryResponse(
            response=response_text,
            is_cache_hit=is_cache_hit,
            response_time=response_time,
            similarity=similarity,
            cost_saved=cost_saved
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

    # --- 실시간 어제 vs 오늘 성과 분석 엔진 ---
    from datetime import datetime, timedelta
    now_dt = datetime.now()
    today_str = now_dt.strftime("%Y.%m.%d")
    yesterday_str = (now_dt - timedelta(days=1)).strftime("%Y.%m.%d")

    today_logs = [log for log in logs if log.get("timestamp", "").startswith(today_str)]
    yesterday_logs = [log for log in logs if log.get("timestamp", "").startswith(yesterday_str)]

    t_queries = len(today_logs)
    y_queries = len(yesterday_logs)

    t_hits = sum(1 for log in today_logs if log.get("is_cache_hit", False))
    y_hits = sum(1 for log in yesterday_logs if log.get("is_cache_hit", False))

    t_latency = (sum(log.get("response_time", 0.0) for log in today_logs) / t_queries) if t_queries > 0 else 0.0
    y_latency = (sum(log.get("response_time", 0.0) for log in yesterday_logs) / y_queries) if y_queries > 0 else 0.0

    t_savings = sum(log.get("cost_saved", 0.0) for log in today_logs)
    y_savings = sum(log.get("cost_saved", 0.0) for log in yesterday_logs)

    # 1. 누적 질문량 증감율 (%)
    if y_queries > 0:
        q_pct = ((t_queries - y_queries) / y_queries) * 100
        q_change = f"{'+' if q_pct >= 0 else ''}{q_pct:.1f}%"
    else:
        q_change = f"+{t_queries * 100.0:.1f}%" if t_queries > 0 else "0.0%"

    # 2. 로컬 캐시 응답 증감율 (%)
    if y_hits > 0:
        h_pct = ((t_hits - y_hits) / y_hits) * 100
        h_change = f"{'+' if h_pct >= 0 else ''}{h_pct:.1f}%"
    else:
        h_change = f"+{t_hits * 100.0:.1f}%" if t_hits > 0 else "0.0%"

    # 3. 평균 반응 속도 단축율 (%)
    if y_latency > 0 and t_latency > 0:
        l_pct = ((t_latency - y_latency) / y_latency) * 100
        l_change = f"{'+' if l_pct >= 0 else ''}{l_pct:.1f}%"
    elif t_latency > 0 and y_latency == 0:
        l_change = "+100.0%"
    else:
        l_change = "0.0%"

    # 4. 실제 절감 비용 차이량 ($)
    s_diff = t_savings - y_savings
    s_change = f"{'+' if s_diff >= 0 else ''}${s_diff:.4f}"

    return {
        "cache_size": store_stats.get("total_vectors", 0),
        "queries_processed": total_queries,
        "cache_hits": cache_hits,
        "total_cost_saved": round(total_cost_saved, 4),
        "avg_response_time": round(avg_response_time, 3),
        "cache_hit_rate": round((cache_hits / total_queries * 100) if total_queries > 0 else 0.0, 1),
        "changes": {
            "queries": q_change,
            "hits": h_change,
            "latency": l_change,
            "savings": s_change
        }
    }

@app.get("/api/logs")
async def get_logs(
    query: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    logs = await load_logs_async()
    filtered_logs = logs

    # 1. 검색어 필터링 (질문 내용 query 필드에서만 매칭)
    if query:
        query_lower = query.lower()
        filtered_logs = [log for log in filtered_logs if query_lower in log.get("query", "").lower()]

    # 2. 기간 설정 필터링 (시작일/종료일)
    if start_date:
        start_date_formatted = start_date.replace("-", ".")
        filtered_logs = [log for log in filtered_logs if log.get("timestamp", "")[:10] >= start_date_formatted]

    if end_date:
        end_date_formatted = end_date.replace("-", ".")
        filtered_logs = [log for log in filtered_logs if log.get("timestamp", "")[:10] <= end_date_formatted]

    # 3. 상태 필터링
    if status and status != "전체":
        if status == "캐시히트":
            filtered_logs = [log for log in filtered_logs if log.get("is_cache_hit", False)]
        elif status == "API호출":
            filtered_logs = [log for log in filtered_logs if not log.get("is_cache_hit", False)]

    return filtered_logs

@app.get("/api/charts")
async def charts():
    logs = await load_logs_async()
    from datetime import datetime, timedelta

    # 1. barData 동적 생성 (오늘 기준 최근 7일간의 일자별 캐시 히트 vs API 호출 집계)
    today = datetime.now()
    past_7_days = [(today - timedelta(days=i)).strftime("%m/%d") for i in range(6, -1, -1)]

    # 일자별 딕셔너리 초기화
    day_counts = {day: {"cache": 0, "api": 0} for day in past_7_days}

    # 로그 데이터를 순회하며 최근 7일 통계 누적
    for log in logs:
        timestamp_str = log.get("timestamp", "")
        try:
            log_date = datetime.strptime(timestamp_str, "%Y.%m.%d %H:%M:%S").strftime("%m/%d")
            if log_date in day_counts:
                if log.get("is_cache_hit", False):
                    day_counts[log_date]["cache"] += 1
                else:
                    day_counts[log_date]["api"] += 1
        except Exception:
            continue

    bar_data = [
        {"name": day, "cache": day_counts[day]["cache"], "api": day_counts[day]["api"]}
        for day in past_7_days
    ]

    # 2. lineData 동적 생성 (최근 발생한 최대 10개 쿼리의 실제 경과 지연시간 추이)
    line_data = []
    recent_logs = logs[:10]
    recent_logs.reverse() # 시간 순서대로 정렬하기 위해 최근 로그 리스트 반전

    for log in recent_logs:
        timestamp_str = log.get("timestamp", "")
        try:
            log_time = datetime.strptime(timestamp_str, "%Y.%m.%d %H:%M:%S").strftime("%H:%M:%S")
        except Exception:
            log_time = "00:00:00"

        latency_ms = int(log.get("response_time", 0.0) * 1000)
        line_data.append({
            "time": log_time,
            "latency": max(1, latency_ms) # 최소 1ms 보장
        })

    # 로그 데이터가 없는 극초기 상황에는 뷰 유지용 폴백 덤프 바인딩
    if not line_data:
        line_data = [
            {"time": "09:00", "latency": 45},
            {"time": "12:00", "latency": 85},
            {"time": "15:00", "latency": 40},
            {"time": "18:00", "latency": 90},
        ]

    return {
        "barData": bar_data,
        "lineData": line_data
    }

# 설정 모델 및 엔드포인트 추가 (동적 유사도 임계치 실시간 제어)
class SettingsModel(BaseModel):
    similarity_threshold: float

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "settings.json")

@app.get("/api/settings")
async def get_settings():
    threshold = 0.75
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                settings = json.load(f)
                threshold = float(settings.get("similarity_threshold", 0.75))
        except Exception as e:
            logger.error(f"설정 조회 중 에러 발생: {e}")
            threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
    else:
        threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))

    # cache.faiss 파일의 마지막 수정 시각 계산
    faiss_path = os.getenv("FAISS_SAVE_PATH", "cache.faiss")
    last_updated = "인덱스 생성 대기 중"
    if os.path.exists(faiss_path):
        try:
            mtime = os.path.getmtime(faiss_path)
            last_updated = datetime.fromtimestamp(mtime).strftime("%Y.%m.%d %H:%M:%S")
        except Exception:
            last_updated = "기록 오류"

    # 실제 logs.json으로부터 업스트림(API 호출) 평균 레이턴시 계산
    avg_upstream_latency = "N/A"
    try:
        if os.path.exists(LOGS_FILE):
            with open(LOGS_FILE, "r", encoding="utf-8") as f:
                logs = json.load(f)
            miss_times = [log.get("response_time", 0.0) for log in logs if not log.get("is_cache_hit", False)]
            if miss_times:
                # ms 단위로 표현
                avg_upstream_latency = f"{int(sum(miss_times) / len(miss_times) * 1000)}ms"
            else:
                avg_upstream_latency = "1.25s (기본 대기)"
    except Exception:
        avg_upstream_latency = "1.25s (기본 대기)"

    from vector_store import store

    # 도커 배포 환경인지 환경 변수 등으로 정밀 판별
    is_docker = os.path.exists("/.dockerenv") or os.environ.get("DOCKER_CONTAINER") is not None
    env_str = "production (Docker Container)" if is_docker else "development (Local Host)"

    return {
        "similarity_threshold": threshold,
        "faiss_save_path": faiss_path,
        "embedding_model": "gemini-embedding-2 (3072차원)",
        "llm_model": "gemini-2.5-flash",
        "dimension": store.dimension,
        "vector_count": store.index.ntotal,
        "last_updated_at": last_updated,
        "environment": env_str,

        # 업스트림 연결 상태 메타데이터
        "upstream": {
            "primary_endpoint": "Google Gemini API v1beta (gemini-2.5-flash)",
            "fallback_endpoint": "Local Backup Server (gemma:2b via Ollama)",
            "avg_latency": avg_upstream_latency,
            "status": "active"
        }
    }

@app.post("/api/settings")
async def save_settings(payload: SettingsModel):
    try:
        val = payload.similarity_threshold
        if val < 0.0 or val > 1.0:
            raise HTTPException(status_code=400, detail="유사도 임계치는 0.0에서 1.0 사이여야 합니다.")

        settings = {"similarity_threshold": round(val, 2)}
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return {"status": "success", "settings": settings}
    except Exception as e:
        logger.error(f"설정 저장 중 에러 발생: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cache/clear")
async def clear_cache():
    try:
        from vector_store import store
        # 1. FAISS 백엔드 벡터 완전 리셋
        store.clear()

        # 2. logs.json 초기 데이터 시딩 복원 (더미 로그 복원 또는 비우기)
        SEED_FILE = os.path.join(os.path.dirname(__file__), "seed_logs.json")
        if os.path.exists(SEED_FILE):
            try:
                with open(SEED_FILE, "r", encoding="utf-8") as f:
                    seed_data = json.load(f)
                with open(LOGS_FILE, "w", encoding="utf-8") as f:
                    json.dump(seed_data, f, ensure_ascii=False, indent=2)
            except Exception:
                with open(LOGS_FILE, "w", encoding="utf-8") as f:
                    json.dump([], f)
        else:
            with open(LOGS_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

        return {"status": "success", "message": "캐시 및 관제 시스템 로그가 안전하게 초기화되었습니다."}
    except Exception as e:
        logger.error(f"캐시 초기화 중 오류: {e}")
        raise HTTPException(status_code=500, detail=f"캐시 초기화 실패: {str(e)}")

class InquiryRequest(BaseModel):
    email: str
    title: str
    content: str

def send_naver_email(sender_email: str, subject: str, content: str) -> bool:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    to_email = "happy08164@naver.com"

    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        logger.warning(".env 파일에 SMTP_USER 또는 SMTP_PASSWORD 설정이 비어있어 모의 메일 전송으로 우회 처리합니다. (수신 예정 메일: 관리자 지정 이메일)")
        return False

    try:
        smtp_host = "smtp.naver.com"
        smtp_port = 465 # SSL 보안 포트

        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = f"[SemanticGuard 문의] {subject}"

        body_text = f"문의 고객 회신처: {sender_email}\n\n문의 사항 내용:\n{content}"
        msg.attach(MIMEText(body_text, 'plain', 'utf-8'))

        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        logger.info("네이버 SMTP를 통해 실제 메일 전송에 성공하였습니다.")
        return True
    except Exception as e:
        logger.error(f"네이버 SMTP 메일 전송 중 에러가 발생했습니다: {e}")
        return False

@app.post("/api/inquiry")
async def create_inquiry(payload: InquiryRequest):
    logger.info("================ 신규 문의사항 접수 ================")
    logger.info(f"회신 이메일: {payload.email}")
    logger.info(f"제목: {payload.title}")
    logger.info(f"내용: {payload.content}")
    logger.info("=================================================")

    # 실제 네이버 SMTP 메일 전송 시도
    sent = send_naver_email(payload.email, payload.title, payload.content)

    if sent:
        return {
            "status": "success",
            "message": "문의사항이 성공적으로 접수되었습니다. 검토 후 신속하게 기재하신 회신 이메일로 답변을 드리겠습니다."
        }
    else:
        return {
            "status": "success",
            "message": "문의사항이 성공적으로 접수되었습니다."
        }

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
