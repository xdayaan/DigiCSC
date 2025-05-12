"""
Utility module to download ChromeDriver directly
"""
import os
import requests
import zipfile
import io
import platform
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def get_chromedriver_path():
    """
    Return the path where ChromeDriver should be stored
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "chromedriver.exe" if platform.system() == "Windows" else "chromedriver")

def download_chromedriver(version=None):
    """
    Download ChromeDriver directly from the source
    
    Args:
        version: Optional specific version to download, otherwise latest stable
        
    Returns:
        Path to ChromeDriver executable
    """
    try:
        # Determine the Chrome version
        if not version:
            # Get latest version
            version_url = "https://chromedriver.storage.googleapis.com/LATEST_RELEASE"
            response = requests.get(version_url)
            if response.status_code != 200:
                logger.warning(f"Failed to get latest version, status code: {response.status_code}")
                # Try a known working version as fallback
                version = "114.0.5735.90"
            else:
                version = response.text.strip()
        
        logger.info(f"Downloading ChromeDriver version {version}")
        
        # Determine platform
        system = platform.system()
        if system == "Windows":
            platform_name = "win32"
        elif system == "Linux":
            platform_name = "linux64"
        elif system == "Darwin":  # macOS
            platform_name = "mac64"
        else:
            raise Exception(f"Unsupported platform: {system}")
        
        # Download URL
        download_url = f"https://chromedriver.storage.googleapis.com/{version}/chromedriver_{platform_name}.zip"
        
        # Download the file
        logger.info(f"Downloading from {download_url}")
        response = requests.get(download_url)
        if response.status_code != 200:
            raise Exception(f"Download failed with status code: {response.status_code}")
        
        # Extract the ZIP
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            chromedriver_path = get_chromedriver_path()
            # Extract ChromeDriver executable
            for item in zip_file.namelist():
                if "chromedriver" in item:
                    with open(chromedriver_path, 'wb') as f:
                        f.write(zip_file.read(item))
            
            # Make it executable on Unix-like systems
            if system != "Windows":
                os.chmod(chromedriver_path, 0o755)
            
            logger.info(f"ChromeDriver successfully downloaded to {chromedriver_path}")
            return chromedriver_path
            
    except Exception as e:
        logger.error(f"Error downloading ChromeDriver: {str(e)}")
        return None

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    download_chromedriver()
