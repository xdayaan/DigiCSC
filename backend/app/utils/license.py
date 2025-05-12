from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from ..utils.captcha_read import read_captcha
from PIL import Image
import time
import pytesseract


def make_licence(
    name: str,
    father_name: str,
    dob: str,
    learner_license_no: int,
    city: str,
    state: str,
    pin_code: str,
):
    try:
        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        
        # Open the NSDL registration URL
        url = "https://sarathi.parivahan.gov.in/sarathiservice/stateSelection.do"
        driver.get(url)
        
        print("Parivahan Sarathi registration page opened in Chrome browser.")
        
        # Locate the dropdown and select "Uttarakhand"
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "stfNameId")))
        dropdown = Select(driver.find_element(By.ID, "stfNameId"))
        dropdown.select_by_visible_text("Uttarakhand")

        # Click on "Apply for Driving Licence"
        apply_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Apply for Driving Licence"))
        )
        apply_button.click()
        
        # Click the button with value "Continue"
        continue_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@value='Continue']"))
        )
        continue_button.click()
        
        learner_license_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "learningLicence"))
        )
        learner_license_input.clear()  # Clear the field if it has any pre-filled value
        learner_license_input.send_keys(learner_license_no)
        
        dob_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "DOB"))
        )
        dob_input.clear()
        dob_input.send_keys(dob)
        dob_input.send_keys(Keys.TAB)
        WebDriverWait(driver, 10).until(
            lambda d: d.switch_to.active_element != dob_input
        )
        time.sleep(2)
        
        # Call the read_captcha function to extract the CAPTCHA text
        captcha_text = read_captcha(driver,By.XPATH, "//img[@id='capimg']",120,80,180,110)
        if captcha_text:
            captcha_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "entcaptxt"))
            )
            captcha_input.clear()
            captcha_input.send_keys(captcha_text)
            print("CAPTCHA entered successfully.")
        else:
            print("Failed to solve CAPTCHA.")
        
        input("Press Enter to close the browser manually...")
    except Exception as e:
        print(f"An error occurred: {e}")
        


make_licence(
    name="John Doe",
    father_name="Richard Roe",
    dob="01/01/1990",
    learner_license_no=5473675235,
    city="New York",
    state="NY",
    pin_code="10001"
)