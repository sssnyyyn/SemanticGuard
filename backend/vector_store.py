import faiss
import numpy as np
from typing import Dict, Tuple, Optional
import pickle
import os

class FAISSVectorStore:
    def __init__(self, dimension: int = 3072, save_path: str = "cache.faiss"):
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.save_path = save_path
        self.queries = []  # 쿼리 원본 저장
        self.responses = {}  # 쿼리 → 응답 매핑


        # 기존 인덱스 로드
        if os.path.exists(save_path):
            self.load()

    def add(self, embedding: np.ndarray, query: str, response: str) -> None:
        """벡터 추가"""
        self.index.add(np.array([embedding], dtype=np.float32))
        self.queries.append(query)
        self.responses[len(self.queries) - 1] = response
        self.save()

    def search(self, embedding: np.ndarray, k: int = 1) -> Tuple[float, Optional[str]]:
        """유사도 검색"""
        if self.index.ntotal == 0:
            return 0.0, None

        distances, indices = self.index.search(
            np.array([embedding], dtype=np.float32), k
        )

        # 정규화된 벡터 간 L2 제곱 거리(distance)를 코사인 유사도로 변환
        distance = distances[0][0]
        similarity = float(1.0 - distance / 2.0)

        if k > 0 and similarity > 0:
            response = self.responses.get(indices[0][0])
            return similarity, response

        return 0.0, None

    def save(self) -> None:
        """인덱스 저장"""
        faiss.write_index(self.index, self.save_path)
        with open(self.save_path + ".meta", "wb") as f:
            pickle.dump({
                "queries": self.queries,
                "responses": self.responses
            }, f)

    def load(self) -> None:
        """인덱스 로드"""
        if not os.path.exists(self.save_path):
            return
        self.index = faiss.read_index(self.save_path)
        meta_path = self.save_path + ".meta"
        if os.path.exists(meta_path):
            with open(meta_path, "rb") as f:
                meta = pickle.load(f)
                self.queries = meta.get("queries", [])
                self.responses = meta.get("responses", {})

    def clear(self) -> None:
        """인덱스 및 매핑 데이터를 완전히 초기화하고 물리 파일 삭제"""
        self.index = faiss.IndexFlatL2(self.dimension)
        self.queries = []
        self.responses = {}
        
        # 물리 파일 제거
        if os.path.exists(self.save_path):
            try:
                os.remove(self.save_path)
            except Exception:
                pass
        meta_path = self.save_path + ".meta"
        if os.path.exists(meta_path):
            try:
                os.remove(meta_path)
            except Exception:
                pass
        
        # 빈 인덱스로 새로 저장
        self.save()

    def get_stats(self) -> Dict:
        """통계"""
        return {
            "total_vectors": self.index.ntotal,
            "dimension": self.dimension
        }

store = FAISSVectorStore()
