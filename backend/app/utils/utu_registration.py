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


def provisional_registration(
    dob: str,
    course: str = "B.TECH.",
    name: str = "Name",
    father_name: str = "Father's Name",
    mobile_no: str = "9876543210",
    email: str = "Email",
):
    try:
        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        
        # Open the registration URL
        url = "https://online.uktech.ac.in/ums/Admission/Account/RegisterEnquiry"
        driver.get(url)
        print("Registration page opened in Chrome browser.")
        
        # Select the "Course" from the dropdown
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
        
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "EmailId"))
        )
        email_input.clear()
        email_input.send_keys(email)
        
        # Solve CAPTCHA using read_captcha
        captcha_text = read_captcha(driver, By.ID, "imgCaptcha",100,120,200,200)  # Pass the locator type and value for the CAPTCHA image
        if captcha_text:
            captcha_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "Captcha"))  # Replace "Captcha" with the actual input field ID
            )
            captcha_input.clear()
            captcha_input.send_keys(captcha_text)
            print(f"Entered CAPTCHA: {captcha_text}")
        else:
            print("Failed to solve CAPTCHA.")
        
        
        # Keep the browser open
        input("Press Enter to close the browser manually...")
    except Exception as e:
        print(f"An error occurred: {e}")
            


