import os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

uri = os.environ["MONGODB_URI"]
client = AsyncIOMotorClient(uri)
db_name = "TRPG"
collection_name = "chat_log"

db = client[db_name]
collection = db[collection_name]
# 방별 현재 섹션(장) 진행 상태: {room_id, section_id}
room_state = db["room_state"]
