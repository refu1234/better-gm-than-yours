import os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

uri = os.environ["MONGODB_URI"]
client = AsyncIOMotorClient(uri)
db_name = "TRPG"
collection_name = "character"

db = client[db_name]
collection2 = db[collection_name]