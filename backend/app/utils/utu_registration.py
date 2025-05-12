from selenium import webdriver
from selenium.webdriver.chrome.service import Service
<<<<<<< HEAD
=======
from selenium.webdriver.chrome.options import Options
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
<<<<<<< HEAD
from PIL import Image
from ..utils.captcha_read import read_captcha
import time
import pytesseract
=======
from webdriver_manager.core.utils import ChromeType
from PIL import Image
from .captcha_read import read_captcha
from .download_chromedriver import download_chromedriver, get_chromedriver_path
import time
import pytesseract
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32


def provisional_registration(
    dob: str,
    course: str = "B.TECH.",
    name: str = "Name",
    father_name: str = "Father's Name",
    mobile_no: str = "9876543210",
    email: str = "Email",
):
<<<<<<< HEAD
    try:
        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
=======
    """
    Automate the UTU registration process using Selenium
    
    Returns:
        dict: A dictionary with success flag and details/error message
    """
    driver = None
    try:
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        # Uncomment the line below if you want to run Chrome in headless mode
        # chrome_options.add_argument("--headless")
          # Try different approaches to get a working ChromeDriver
        try:
            # Approach 1: Try to get the latest stable ChromeDriver (not tied to browser version)
            logger.info("Attempting to get latest stable ChromeDriver")
            service = Service(ChromeDriverManager(chrome_type=ChromeType.GOOGLE).install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
        except Exception as e1:
            logger.warning(f"First approach failed: {e1}")
            try:
                # Approach 2: Try with a specific version that's known to work with recent Chrome
                logger.info("Trying with a specific compatible ChromeDriver version")
                service = Service(ChromeDriverManager(version="114.0.5735.90").install())
                driver = webdriver.Chrome(service=service, options=chrome_options)
            except Exception as e2:
                logger.warning(f"Second approach failed: {e2}")
                # Approach 3: Check if we have a local ChromeDriver
                local_driver_path = get_chromedriver_path()
                if os.path.exists(local_driver_path):
                    logger.info(f"Using existing local ChromeDriver at {local_driver_path}")
                    service = Service(local_driver_path)
                    driver = webdriver.Chrome(service=service, options=chrome_options)
                else:
                    # Approach 4: Try direct download from source
                    logger.info("Attempting direct download from source")
                    downloaded_path = download_chromedriver()
                    if downloaded_path and os.path.exists(downloaded_path):
                        logger.info(f"Using directly downloaded ChromeDriver at {downloaded_path}")
                        service = Service(downloaded_path)
                        driver = webdriver.Chrome(service=service, options=chrome_options)
                    else:
                        # Final fallback - try one more time with force=True
                        logger.info("Final attempt with force=True parameter")
                        service = Service(ChromeDriverManager(chrome_type=ChromeType.GOOGLE, cache_valid_range=365).install())
                        driver = webdriver.Chrome(service=service, options=chrome_options)
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32
        
        # Open the registration URL
        url = "https://online.uktech.ac.in/ums/Admission/Account/RegisterEnquiry"
        driver.get(url)
        print("Registration page opened in Chrome browser.")
<<<<<<< HEAD
        
        # Select the "Course" from the dropdown
=======
          # Select the "Course" from the dropdown
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32
        course_dropdown = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "CourseId"))
        )
        select = Select(course_dropdown)
        select.select_by_visible_text(course)
        print(f"Selected course: {course}")
        
        lateral_entry_radio = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//input[@id='LetterEntry' and @value='1styear']"))
        )
        lateral_entry_radio.click()
        
        name_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "Name"))
        )
        name_input.clear()
        name_input.send_keys(name)
<<<<<<< HEAD
=======
        print(f"Entered Name: {name}")
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32
        
        # Fill the "Father's Name" field
        father_name_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "FatherName"))
        )
        father_name_input.clear()
        father_name_input.send_keys(father_name)
        print(f"Entered Father's Name: {father_name}")
        
        # Fill the "Date of Birth" field
        dob_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "BirthDate"))
        )
        # Remove the readonly attribute using JavaScript
        driver.execute_script("arguments[0].removeAttribute('readonly')", dob_input)
        dob_input.clear()
        dob_input.send_keys(dob)
        print(f"Entered Date of Birth: {dob}")
        
        mobile_no_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "MobileNo"))
        )
        mobile_no_input.clear()
        mobile_no_input.send_keys(mobile_no)
<<<<<<< HEAD
=======
        print(f"Entered Mobile Number: {mobile_no}")
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32
        
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "EmailId"))
        )
        email_input.clear()
        email_input.send_keys(email)
<<<<<<< HEAD
        
        # Solve CAPTCHA using read_captcha
        captcha_text = read_captcha(driver, By.ID, "imgCaptcha",100,120,200,200)  # Pass the locator type and value for the CAPTCHA image
        if captcha_text:
            captcha_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "Captcha"))  # Replace "Captcha" with the actual input field ID
=======
        print(f"Entered Email: {email}")
        
        # Solve CAPTCHA using read_captcha
        captcha_text = read_captcha(driver, By.ID, "imgCaptcha", 100, 120, 200, 200)
        if captcha_text:
            captcha_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "Captcha"))
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32
            )
            captcha_input.clear()
            captcha_input.send_keys(captcha_text)
            print(f"Entered CAPTCHA: {captcha_text}")
<<<<<<< HEAD
        else:
            print("Failed to solve CAPTCHA.")
        
        
        # Keep the browser open
        input("Press Enter to close the browser manually...")
    except Exception as e:
        print(f"An error occurred: {e}")
            


=======
            
            # Keep the browser open for user to verify and complete registration
            print("UTU registration form has been filled. Browser window remains open for user verification and completion.")
            
            # Return success
            return {
                "success": True, 
                "message": "UTU registration form filled successfully. Browser window is open for verification."
            }
        else:
            print("Failed to solve CAPTCHA.")
            # Keep the browser open even if CAPTCHA fails
            return {"success": False, "error": "Failed to solve CAPTCHA"}
            
    except Exception as e:
        error_message = f"An error occurred during UTU registration: {e}"
        print(error_message)
        # Keep the browser open even when an error occurs
        return {"success": False, "error": error_message}

# Remove the direct call for module import use
# provisional_registration(
#     name= "Aleeza",
#     dob= "07/10/2007",
# )
>>>>>>> 826a7e6c2df83590df760a5721b7b7b9dd14ef32
