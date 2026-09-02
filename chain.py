import os
from dotenv import load_dotenv
from langchain_community.document_loaders import Docx2txtLoader
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pymongo import MongoClient

# setting value
load_dotenv()
MONGOURI = os.getenv("MONGODB_URI")
db_name = "TRPG"
collection_name = "Cuthulu-rulebook"
DOCX_PATH = "cuthulu1-1.docx"

# 1) 문서 로드
loader = Docx2txtLoader(DOCX_PATH)
documents = loader.load()

# 2) 청크 분할
#  - RecursiveCharacterTextSplitter: 문단 -> 문장 -> 단어 순으로 자연스럽게 분할
#  - chunk_overlap은 chunk_size의 10~15% 정도가 적정 (과한 오버랩은 중복 청크를 만들어 검색 품질을 떨어뜨림)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
)
docs = text_splitter.split_documents(documents)
print(f"분할된 청크 수: {len(docs)}")

# 3) 임베딩 (배치 처리로 한 번에 호출 -> 빠르고 비용 효율적)
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
texts = [doc.page_content for doc in docs]
vectors = embeddings.embed_documents(texts)

data = [
    {
        "text": doc.page_content,
        "embedding": vector,
        "metadata": doc.metadata,
    }
    for doc, vector in zip(docs, vectors)
]

# 4) DB 저장
#  - 재실행 시 중복 누적을 막기 위해 기존 청크를 모두 비우고 새로 적재
client = MongoClient(MONGOURI)
collection = client[db_name][collection_name]

deleted = collection.delete_many({}).deleted_count
print(f"기존 청크 삭제: {deleted}개")

if data:
    collection.insert_many(data)
    print(f"청크 저장 완료: {len(data)}개")
else:
    print("저장할 데이터가 없습니다.")
