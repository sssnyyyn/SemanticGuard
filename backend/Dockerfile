# 베이스 이미지로 가벼운 Python 3.11 slim 버전 사용
FROM python:3.11-slim

# 컨테이너 내 작업 디렉토리 설정
WORKDIR /app

# 필수 빌드 도구(gcc 등) 설치 및 apt 캐시 삭제로 이미지 용량 최소화
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 파이썬 의존성 명세 파일 복사
COPY requirements.txt .

# pip 캐시를 사용하지 않고 패키지 설치 (이미지 경량화 목적)
RUN pip install --no-cache-dir -r requirements.txt


# 나머지 전체 프로젝트 소스 코드 복사
COPY . .

# FastAPI 서버가 통신할 8000번 포트 개방
EXPOSE 8000

# uvicorn을 사용하여 외부(0.0.0.0)에서 접근 가능하도록 FastAPI 애플리케이션 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
