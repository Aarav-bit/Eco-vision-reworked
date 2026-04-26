import os
from typing import Optional

from pymongo import MongoClient
from pymongo.database import Database


MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "Eco-vision")

_mongo_client: Optional[MongoClient] = None


def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        # serverSelectionTimeoutMS prevents hanging if MongoDB is unreachable
        _mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )
        print(f"✅ MongoDB client created: {MONGODB_URI}")
    return _mongo_client


def get_database() -> Database:
    client = get_mongo_client()
    return client[MONGODB_DB_NAME]
