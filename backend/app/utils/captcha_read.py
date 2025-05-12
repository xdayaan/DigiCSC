from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from PIL import Image
import time
import pytesseract

def read_captcha(driver, by_locator_type, locator_value,a=0,b=0,c=0,d=0):
    try:
        # Wait for the CAPTCHA image to load
        captcha_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((by_locator_type, locator_value))
        )
        location = captcha_element.location
        size = captcha_element.size

        # Take a screenshot of the entire screen
        screenshot_path = "screenshot.png"
        driver.save_screenshot(screenshot_path)

        # Open the screenshot and crop the CAPTCHA area
        img = Image.open(screenshot_path)
        left = location['x'] + a
        top = location['y'] + b
        right = location['x'] + size['width'] + c
        bottom = location['y'] + size['height'] + d
        captcha_img = img.crop((left, top, right, bottom))
        captcha_img.save("captcha.png")  # Save the cropped CAPTCHA image
        print("Cropped CAPTCHA image saved as captcha.png")

        # Extract text from the cropped CAPTCHA image using Tesseract
        extracted_text = pytesseract.image_to_string(captcha_img)
        print("Extracted CAPTCHA Text:", extracted_text)

        # Identify the CAPTCHA using pattern matching
        import re
        captcha_pattern = r"[A-Za-z0-9]+"  # Adjust the pattern if needed
        captcha_matches = re.findall(captcha_pattern, extracted_text)

        if captcha_matches:
            captcha_text = captcha_matches[0]  # Take the first match
            print(f"Identified CAPTCHA: {captcha_text}")
            return captcha_text
        else:
            print("Failed to identify CAPTCHA in the extracted text.")
            return None
    except Exception as e:
        print(f"An error occurred while reading the CAPTCHA: {e}")
        return None                                            
   