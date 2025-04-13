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
from get_data import get_stars_with_parsecs
app = FastAPI(title="StarNet API", description="API for removing stars from astronomical images")

# Initialize StarNet model
starnet = StarNet(mode='RGB')
starnet.load_model(weights='backend/weights/weights')

# Create a temporary directory for storing processed images
TEMP_DIR = Path("temp_images")
TEMP_DIR.mkdir(exist_ok=True)

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
        
        # Delete input file as we don't need it anymore
        input_path.unlink()
        
        # Return paths to the generated files
        return {
            "message": "Images processed successfully",
            "starless_image_path": str(output_path),
            "star_mask_path": str(mask_path)
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

@app.get("/image/{image_type}/{filename}")
async def get_image(image_type: str, filename: str):
    """
    Retrieve a processed image by filename.
    image_type can be either 'starless' or 'mask'
    """
    if image_type not in ['starless', 'mask']:
        return JSONResponse(
            status_code=400,
            content={"error": "image_type must be either 'starless' or 'mask'"}
        )
    
    file_path = TEMP_DIR / filename
    if not file_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "Image not found"}
        )
    
    return FileResponse(file_path)

@app.get("/x_y_distance")
async def get_x_y_distance(filename: str):
    """
    Retrieve the x, y, and distance of a star by filename.
    """
    return get_stars_with_parsecs()

@app.get("/")
async def root():
    """Welcome message and API information."""
    return {
        "message": "Welcome to StarNet API",
        "endpoints": {
            "POST /process_image/": "Upload an image to process",
            "GET /image/{image_type}/{filename}": "Retrieve a processed image"
        },
        "supported_formats": ["JPEG", "PNG", "TIFF"]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 