import os
import re
import numpy as np
import faiss
from dotenv import load_dotenv
from pymongo import MongoClient
from langchain_community.document_loaders import Docx2txtLoader
from langchain_openai import OpenAIEmbeddings

load_dotenv()
uri = os.getenv("MONGODB_URI")
db_name = "TRPG"
collection_name = "Cuthulu-rulebook"
DOCX_PATH = "cuthulu1-1.docx"

embedding_model = OpenAIEmbeddings(model="text-embedding-3-large")

# 본문 안의 "제N장" 감지하는 패턴
_CHAPTER_REF = re.compile(r"제\s*(\d+)\s*장")

def _is_toc_chunk(text: str) -> bool:
    return len(_CHAPTER_REF.findall(text)) >=5

def _normalize(vectors: np.ndarray) -> np.ndarray:
    # 코사인 유사도 = 정규화한 벡터들의 내적(IP).
    # OpenAI 임베딩은 코사인 기준이라 L2 거리보다 정확한 랭킹을 준다.
    faiss.normalize_L2(vectors)
    return vectors


def _load_index():
    """DB에서 청크/임베딩을 읽어 FAISS 코사인 인덱스를 만든다."""
    client = MongoClient(uri)
    collection = client[db_name][collection_name]

    docs = []
    vectors = []
    for doc in collection.find({}, {"text": 1, "embedding": 1, "metadata": 1}):
        if "embedding" in doc and "text" in doc:
            docs.append(doc)
            vectors.append(doc["embedding"])

    if not docs:
        raise ValueError("저장된 임베딩이 없습니다. 먼저 chain.py로 적재하세요.")

    dataset = np.array(vectors).astype("float32")
    dataset = _normalize(dataset)

    dim = dataset.shape[1]
    index = faiss.IndexFlatIP(dim)  # 내적 = (정규화 후) 코사인 유사도
    index.add(dataset)
    return index, docs


# 모듈 로드 시 한 번만 인덱스를 만들어 재사용 (매 검색마다 재구축 방지).
# DB 연결이 안 되면 첫 search() 호출 시점에 다시 시도하도록 지연 로딩한다.
_INDEX = None
_DOCS = None


def _ensure_index():
    global _INDEX, _DOCS
    if _INDEX is None:
        _INDEX, _DOCS = _load_index()
    return _INDEX, _DOCS


def search(query_text: str, k: int = 5):
    """질의와 가장 유사한 룰북 청크 k개를 반환한다.

    반환: [{"text": ..., "score": float, "metadata": ...}, ...]
          score는 코사인 유사도(높을수록 유사).
    """
    index, docs = _ensure_index()

    query_vector = embedding_model.embed_query(query_text)
    query_np = _normalize(np.array([query_vector]).astype("float32"))

    scores, indices = index.search(query_np, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        found = docs[idx]
        if _is_toc_chunk(found["text"]):
            continue
        results.append(
            {
                "text": found["text"],
                "score": float(score),
                "metadata": found.get("metadata", {}),
            }
        )
    return results


def search_text(query_text: str, k: int = 5) -> str:
    """검색 결과 청크 본문만 이어붙여 반환 (프롬프트에 바로 넣기 좋은 형태)."""
    results = search(query_text, k)
    return "\n\n---\n\n".join(r["text"] for r in results)



# Multi-hop 검색: "제N장 참고" 같은 이하참조를 따라가 추가 문맥 검색 및 추출.

_TOC = None


def _load_toc() -> dict:
    """문서 맨 앞 목차를 파싱해 {장번호: 제목/키워드} 매핑을 만든다."""
    global _TOC
    if _TOC is not None:
        return _TOC

    txt = Docx2txtLoader(DOCX_PATH).load()[0].page_content
    toc = {}
    line_pat = re.compile(r"제\s*(\d+)\s*장\s*[:：\-]?\s*([^\n\t]+)")
    # 목차 문서 앞쪽에 있길래 대충 1500자로 했다
    for line in txt[:1500].splitlines():
        for m in line_pat.finditer(line):
            num = int(m.group(1))
            title = re.split(r"제\s*\d+\s*장", m.group(2))[0].strip(" -:：")
            if num not in toc and len(title) > 1:
                toc[num] = title
    _TOC = toc
    return toc


def search_with_references(query_text: str, k: int = 5, follow_k: int = 3, max_refs: int = 2):
    """1차 검색 후, 결과에 '제N장' 참조가 있으면 그 장의 키워드로 추가 검색해 병합한다.

    벡터 검색만으로는 'A는 제5장 참고' 같은 꼬리 참조를 못 따라가므로,
    목차의 장별 키워드로 2차 검색을 돌려 실제 필요한 본문까지 모은다.
    """
    primary = search(query_text, k)

    toc = _load_toc()
    # 1차 결과 본문에서 참조된 장 번호 수집 (등장 순서 유지)
    referenced = []
    for r in primary:
        if _is_toc_chunk(r["text"]):
            continue
        for m in _CHAPTER_REF.finditer(r["text"]):
            num = int(m.group(1))
            if num in toc and num not in referenced:
                referenced.append(num)

    seen = {r["text"] for r in primary}
    merged = list(primary)
    for num in referenced[:max_refs]:
        followup_query = f"제{num}장 {toc[num]}"
        for r in search(followup_query, follow_k):
            if r["text"] not in seen:
                seen.add(r["text"])
                r["from_reference"] = num  # 어느 장 참조로 따라왔는지 표시
                merged.append(r)
    return merged


if __name__ == "__main__":
    query_text = "탐사자의 운 수치는 어떻게 정해?"
    print(f"질문: {query_text}\n")

    print("=== 1차 검색만 (기존 방식) ===")
    for i, r in enumerate(search(query_text, k=5), start=1):
        print(f"[순위{i}] 유사도:{r['score']:.4f}  {r['text'][:70]}")

    print("\n=== Multi-hop 검색 (참조 추적) ===")
    for i, r in enumerate(search_with_references(query_text, k=5), start=1):
        tag = f" <-제{r['from_reference']}장 참조" if r.get("from_reference") else ""
        print(f"[순위{i}] 유사도:{r['score']:.4f}{tag}  {r['text'][:70]}")
