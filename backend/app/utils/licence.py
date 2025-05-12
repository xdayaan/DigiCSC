from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from .captcha_read import read_captcha
from PIL import Image
import time
import pytesseract
import argparse
import sys


def make_licence(
    name: str,
    father_name: str,
    dob: str,
    learner_license_no: int,
    city: str,
    state: str,
    pin_code: str,
):
    """
    Automate the license application process using Selenium
    
    Returns:
        dict: A dictionary with success flag and details/error message
    """
    driver = None
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
        captcha_text = read_captcha(driver, By.XPATH, "//img[@id='capimg']", 120, 80, 180, 110)
        if captcha_text:
            captcha_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "entcaptxt"))
            )
            captcha_input.clear()
            captcha_input.send_keys(captcha_text)
            print("CAPTCHA entered successfully.")
            
            # A browser window will remain open for user interaction
            # In a production environment, you might want to handle this differently
            # For now, we'll just keep it open and inform the user
            print("License application form has been filled. Browser window remains open for user verification and completion.")
            
            # Return success without waiting for user input
            return {"success": True, "message": "License application form filled successfully. Browser window is open for user verification."}
        else:
            print("Failed to solve CAPTCHA.")
            if driver:
                driver.quit()
            return {"success": False, "error": "Failed to solve CAPTCHA"}
            
    except Exception as e:
        error_message = f"An error occurred: {e}"
        print(error_message)
        if driver:
            driver.quit()
        return {"success": False, "error": error_message}
        


# Parse command-line arguments when script is run directly
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process a learner's license application")
    parser.add_argument('--name', type=str, required=True, help="Applicant's full name")
    parser.add_argument('--father_name', type=str, required=True, help="Father's name")
    parser.add_argument('--dob', type=str, required=True, help="Date of birth (DD/MM/YYYY)")
    parser.add_argument('--learner_license_no', type=int, required=True, help="Learner License Number")
    parser.add_argument('--city', type=str, required=True, help="City")
    parser.add_argument('--state', type=str, required=True, help="State")
    parser.add_argument('--pin_code', type=str, required=True, help="PIN code")
    
    args = parser.parse_args()
    
    # Call the function with parsed arguments
    make_licence(
        name=args.name,
        father_name=args.father_name,
        dob=args.dob,
        learner_license_no=args.learner_license_no,
        city=args.city,
        state=args.state,
        pin_code=args.pin_code
    )
    
    print("License application process completed.")