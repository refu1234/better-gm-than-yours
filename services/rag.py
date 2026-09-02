from pymongo import MongoClient
import numpy as np
import faiss
from langchain_openai import OpenAIEmbeddings
import os
from dotenv import load_dotenv
load_dotenv()
uri = os.environ["MONGODB_URI"]
client = MongoClient(uri)
db_name = "TRPG"
collection_name = "Cuthulu-rulebook"
db = client[db_name]
collection = db[collection_name]

docs = []
vectors = []

for doc in collection.find():
    if 'embedding' in doc and 'text' in doc:
        docs.append(doc)
        vectors.append(doc['embedding'])
dataset = np.array(vectors).astype('float32')
dim = dataset.shape[1]
index = faiss.IndexFlatL2(dim)
index.add(dataset)

query_text = "관찰력"
embedding_model = OpenAIEmbeddings(model="text-embedding-3-large")
query_vector = embedding_model.embed_query(query_text)

query_vector_np = np.array([query_vector]).astype('float32')
D, I = index.search(query_vector_np, k=10)

print(f"질문: {query_text}\n")
print("=== 검색 결과 ===")
for i, idx in enumerate(I[0]):
    found_doc= docs[idx]
    distance = D[0][i]
    print(f"[순위{i+1}] 거리:{distance:.4f}")
    print(f"내용:{found_doc['text'][:1000]}")

