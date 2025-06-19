from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Depends
from app.core.config import settings
import logging

# MongoDB connection
client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client.get_default_database()

async def get_database():
    """Get database instance"""
    try:
        yield db
    finally:
        pass  # Connection is managed by the client

class MongoDB:
    client: AsyncIOMotorClient = None
    database = None

    async def connect_to_mongodb(self):
        """Create database connection."""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URI)
            # Test the connection
            await self.client.admin.command('ping')
            # Get the database
            self.database = self.client.get_default_database()
            logging.info("Successfully connected to MongoDB")
        except Exception as e:
            logging.error(f"Failed to connect to MongoDB: {e}")
            raise
        
    async def close_mongodb_connection(self):
        """Close database connection."""
        if self.client:
            self.client.close()
            logging.info("MongoDB connection closed")
            
    def get_collection(self, collection_name: str):
        """Get collection from database."""
        if self.database is None:
            raise Exception("Database not connected")
        return self.database[collection_name]

mongodb = MongoDB() 