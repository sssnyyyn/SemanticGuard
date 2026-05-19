# 📘 Semantic Cache Gateway for AI

의미론적 유사도 기반 AI 응답 캐싱 게이트웨이 프로젝트입니다. 기존의 정확한 텍스트 매칭에서 벗어나, 입력 쿼리의 **의미적 유사성**을 파악해 OpenAI 등 고비용/고지연 API의 반복 호출을 최소화합니다.

## ✨ 핵심 기능
- **LangChain & all-MiniLM-L6-v2**: 사용자 질문의 의미론적 벡터 임베딩 생성 (100ms 이내)
- **FAISS 벡터 검색**: 이전 질의 벡터와의 코사인 유사도 연산을 통한 캐시 히트(Cache-Hit) 판단
- **LangGraph 상태 머신**: 캐시 히트/미스 분기 논리 및 상태 관리 최적화
- **FastAPI 게이트웨이**: 비동기 처리가 가능한 경량 프록시 서버
- **React(Vite) 대시보드**: 캐싱 통계 및 실시간 응답 시각화 

## 📂 프로젝트 구조

```
SemanticGuard/
├── backend/                # FastAPI 기반 캐시 게이트웨이
│   ├── main.py             # 라우팅 및 API 엔드포인트
│   ├── embedding.py        # 텍스트 임베딩 모델 파이프라인
│   ├── vector_store.py     # FAISS 기반 메모리/디스크 벡터 저장소
│   ├── state_machine.py    # LangGraph 제어 흐름
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # Vite + React 대시보드 (Day 2 구현 예정 포함)
├── docker-compose.yml      # 로컬 개발 및 배포 통합용 컴포즈 파일
├── .env.example            # 환경변수 템플릿
└── semantic_cache_gateway_prd.md # 상세 PRD 문서
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
cp .env.example .env
# .env 파일에 필요한 설정을 업데이트 (필요 시 OPENAI_API_KEY 입력)
```

### 2. Docker Compose 배포
```bash
docker-compose up --build -d
```
- **Backend API**: `http://localhost:8000/docs`
- **Frontend Dashboard**: `http://localhost:5173`

### 3. 로컬 직접 실행 (Backend)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## 📈 테스트 (cURL)
```bash
# 초기 요청 (Cache Miss 예상, 지연 발생)
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "서울의 오늘 날씨는 어떤가요?"}'

# 유사한 요청 (Cache Hit 예상, 즉시 반환)
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "현재 서울 날씨 어때?"}'
```
