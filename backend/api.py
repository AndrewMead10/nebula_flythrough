from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
import uvicorn
from starnet_v1_TF2 import StarNet
import os
from PIL import Image
import io
import shutil
from pathlib import Path
from fastapi.responses import JSONResponse
from database import ImageDatabase

app = FastAPI(title="StarNet API", description="API for removing stars from astronomical images")

# Initialize StarNet model
starnet = StarNet(mode='RGB')
starnet.load_model(weights='weights/weights')

# Create a temporary directory for storing processed images
TEMP_DIR = Path("temp_images")
TEMP_DIR.mkdir(exist_ok=True)

# Initialize database
db = ImageDatabase()

@app.post("/process_image/")
async def process_image(file: UploadFile = File(...)):
    """
    Process an astronomical image to remove stars.
    Returns both the starless image and a mask of the removed stars.
    """
    try:
        # Create unique filenames for this request
        input_path = TEMP_DIR / f"input_{file.filename}"
        output_path = TEMP_DIR / f"starless_{file.filename.replace('.jpg', '.tif').replace('.jpeg', '.tif')}"
        
        # Save uploaded file
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the image with StarNet
        starnet.transform(str(input_path), str(output_path))
        
        # Get the mask path (created by StarNet)
        mask_path = str(output_path).replace('.tif', '_mask.tif')
        
        # Store paths in database
        image_id = db.save_image_paths(
            original_path=input_path,
            starless_path=output_path,
            mask_path=mask_path
        )
        
        # Return paths to the generated files
        return {
            "message": "Images processed successfully",
            "image_id": image_id,
            "starless_image_path": str(output_path),
            "star_mask_path": str(mask_path),
            "original_image_path": str(input_path)
        }
        
    except Exception as e:
        # Clean up any files in case of error
        if input_path.exists():
            input_path.unlink()
        if Path(output_path).exists():
            Path(output_path).unlink()
        if Path(mask_path).exists():
            Path(mask_path).unlink()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/image/{image_type}/{image_id}")
async def get_image(image_type: str, image_id: int):
    """
    Retrieve a processed image by image_id.
    image_type can be either 'original', 'starless', or 'mask'
    """
    if image_type not in ['original', 'starless', 'mask']:
        return JSONResponse(
            status_code=400,
            content={"error": "image_type must be either 'original', 'starless', or 'mask'"}
        )
    
    image_data = db.get_image_paths(image_id)
    if not image_data:
        return JSONResponse(
            status_code=404,
            content={"error": "Image not found"}
        )
    
    original_path, starless_path, mask_path, _ = image_data
    
    # Select the appropriate path based on image_type
    file_path = {
        'original': original_path,
        'starless': starless_path,
        'mask': mask_path
    }[image_type]
    
    if not Path(file_path).exists():
        return JSONResponse(
            status_code=404,
            content={"error": "Image file not found"}
        )
    
    return FileResponse(file_path)

@app.get("/images")
async def get_all_images():
    """
    Retrieve all processed images with their paths and metadata.
    """
    images = db.get_all_images()
    return [
        {
            "id": image[0],
            "original_path": image[1],
            "starless_path": image[2],
            "mask_path": image[3],
            "created_at": image[4]
        }
        for image in images
    ]

@app.get("/images/paginated")
async def get_paginated_images(page: int = 1, per_page: int = 5):
    """
    Retrieve paginated images with their paths and metadata.
    """
    images = db.get_paginated_images(page, per_page)
    total_images = db.get_total_images()
    total_pages = (total_images + per_page - 1) // per_page
    
    return {
        "images": [
            {
                "id": image[0],
                "original_path": image[1],
                "starless_path": image[2],
                "mask_path": image[3],
                "created_at": image[4]
            }
            for image in images
        ],
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_images": total_images,
            "per_page": per_page
        }
    }

@app.get("/")
async def root():
    """Welcome message and API information."""
    return {
        "message": "Welcome to StarNet API",
        "endpoints": {
            "POST /process_image/": "Upload an image to process",
            "GET /image/{image_type}/{image_id}": "Retrieve a processed image",
            "GET /images": "Get all processed images",
            "GET /images/paginated": "Get paginated images"
        },
        "supported_formats": ["JPEG", "PNG", "TIFF"]
    }

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8001, reload=True) 