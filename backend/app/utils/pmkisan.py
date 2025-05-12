from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from PIL import Image
from ..utils.captcha_read import read_captcha
import time
import pytesseract


def kisan_apply(
    adhaar_no: str = "Adhaar Number",
    mobile_no: str = "Mobile Number",
    state: str = "UTTARAKHAND",
):
    try:
        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        
        # Open the URL
        url = "https://pmkisan.gov.in/"
        driver.get(url)
        print("registration page opened in Chrome browser.")
        
        # Click the "New Farmer Registration" link
        new_farmer_registration_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[@href='RegistrationFormupdated.aspx']"))
        )
        new_farmer_registration_link.click()
        print("Clicked the 'New Farmer Registration' link.")

        # Fill the "Aadhaar Number" field
        aadhaar_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "txtsrch"))
        )
        aadhaar_input.clear()
        aadhaar_input.send_keys(adhaar_no)
        print(f"Entered Aadhaar Number: {adhaar_no}")

        # Fill the "Mobile Number" field
        mobile_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "ContentPlaceHolder1_txtMobileNo"))
        )
        mobile_input.clear()
        mobile_input.send_keys(mobile_no)
        print(f"Entered Mobile Number: {mobile_no}")
        
        # Select "UTTARAKHAND" from the dropdown
        state_dropdown = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "ContentPlaceHolder1_DropDownState"))
        )
        select = Select(state_dropdown)
        select.select_by_visible_text("UTTARAKHAND")
        print("Selected 'UTTARAKHAND' from the dropdown.")
        
        # Solve CAPTCHA
        captcha_image = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "ContentPlaceHolder1_capchaimg"))
        )
        captcha_text = read_captcha(driver, By.ID, "ContentPlaceHolder1_capchaimg",0,100,100,100)
        if captcha_text:
            captcha_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "ContentPlaceHolder1_txtcaptcha"))
            )
            captcha_input.clear()
            captcha_input.send_keys(captcha_text)
            print(f"Entered CAPTCHA: {captcha_text}")
        else:
            print("Failed to solve CAPTCHA.")

        input("Press Enter to close the browser manually...")
    except Exception as e:
        print(f"An error occurred: {e}")
        
        
      

        