from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class PhotoMetadata(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_title: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    filename: str
    image_base64: str
    resolution: Optional[str] = None

class PhotoCreate(BaseModel):
    event_title: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_base64: str
    resolution: Optional[str] = None

class PhotoResponse(BaseModel):
    id: str
    event_title: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime
    filename: str
    resolution: Optional[str] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "GeoCamera API - Disaster Response Photo Management"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Photo endpoints
@api_router.post("/photos", response_model=PhotoResponse)
async def create_photo(photo: PhotoCreate):
    """Save a new photo with metadata"""
    try:
        # Generate filename
        event_slug = photo.event_title.replace(" ", "_") if photo.event_title else "GeoPhoto"
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{event_slug}_{timestamp_str}.jpg"
        
        # Create photo document
        photo_dict = photo.dict()
        photo_obj = PhotoMetadata(**photo_dict, filename=filename)
        
        # Save to database
        result = await db.photos.insert_one(photo_obj.dict())
        
        # Return response without base64 image
        return PhotoResponse(
            id=photo_obj.id,
            event_title=photo_obj.event_title,
            latitude=photo_obj.latitude,
            longitude=photo_obj.longitude,
            timestamp=photo_obj.timestamp,
            filename=photo_obj.filename,
            resolution=photo_obj.resolution
        )
    except Exception as e:
        logger.error(f"Error creating photo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/photos", response_model=List[PhotoResponse])
async def get_photos(event_title: Optional[str] = None):
    """Get all photos or filter by event title"""
    try:
        query = {}
        if event_title:
            query["event_title"] = {"$regex": event_title, "$options": "i"}
        
        photos = await db.photos.find(query).sort("timestamp", -1).to_list(1000)
        
        return [
            PhotoResponse(
                id=photo["id"],
                event_title=photo["event_title"],
                latitude=photo.get("latitude"),
                longitude=photo.get("longitude"),
                timestamp=photo["timestamp"],
                filename=photo["filename"],
                resolution=photo.get("resolution")
            )
            for photo in photos
        ]
    except Exception as e:
        logger.error(f"Error fetching photos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/photos/{photo_id}")
async def get_photo_by_id(photo_id: str):
    """Get a single photo with full base64 image data"""
    try:
        photo = await db.photos.find_one({"id": photo_id})
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        return PhotoMetadata(**photo)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching photo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str):
    """Delete a photo"""
    try:
        result = await db.photos.delete_one({"id": photo_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        return {"message": "Photo deleted successfully", "id": photo_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting photo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
