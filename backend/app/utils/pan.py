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


def pan_apply(
    dob: str,
    gender: str = "Female",
    marital_status: str = "Married",
    last_name: str = "Name",
    first_name: str = "Name",
    middle_name: str = "Name",
    email: str = "Email",
    phone: str = "9876543210",
):
    try:
        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        
        # Open the NSDL registration URL
        url = "https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html"
        driver.get(url)
        
        print("NSDL registration page opened in Chrome browser.")
        

        # Select "New PAN - Indian Citizen (Form 49A)" from the dropdown
        dropdown = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//select[@id='type']"))
        )
        select = Select(dropdown)
        select.select_by_visible_text("New PAN - Indian Citizen (Form 49A)")
        print("Selected 'New PAN - Indian Citizen (Form 49A)' from the dropdown.")
        
         # Select "INDIVIDUAL" from the select2 dropdown
        select2_dropdown = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//span[@id='select2-cat_applicant1-container']"))
        )
        select2_dropdown.click()  # Click to open the dropdown

        individual_option = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//li[text()='INDIVIDUAL']"))
        )
        individual_option.click()  # Click the "INDIVIDUAL" option
        print("Selected 'INDIVIDUAL' from the dropdown.")
        
        time.sleep(3)
        
        try:
            ok_button = WebDriverWait(driver, 20).until(
                EC.element_to_be_clickable((By.ID, "onetrust-accept-btn-handler"))
            )
            ok_button.click()
            print("Clicked the 'OK' button for cookie consent.")
        except Exception:
            print("No cookie consent button found.")
            
        time.sleep(3)
        
        # Determine the title based on gender and marital status
        if gender == "Female" and marital_status == "Married":
            title = "Smt"
        elif gender == "Female" and marital_status == "Unmarried":
            title = "Kumari"
        elif gender == "Male":
            title = "Shri"
        else:
            title = "Shri"  # Default to "Shri" if no condition matches

        # Select the title from the select2 dropdown
        title_dropdown = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//span[@id='select2-rvNameInitials-container']"))
        )
        title_dropdown.click()  # Click to open the dropdown

        title_option = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//li[text()='{title}']"))
        )
        title_option.click()  # Click the appropriate title option
        print(f"Selected title: {title}")
        
        # Fill the "Last Name" field
        last_name_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "l_name_end"))
        )
        last_name_input.clear()
        last_name_input.send_keys(last_name)
        print(f"Entered Last Name: {last_name}")

        # Fill the "First Name" field
        first_name_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "f_name_end"))
        )
        first_name_input.clear()
        first_name_input.send_keys(first_name)
        print(f"Entered First Name: {first_name}")

        # Fill the "Middle Name" field
        middle_name_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "m_name_end"))
        )
        middle_name_input.clear()
        middle_name_input.send_keys(middle_name)
        print(f"Entered Middle Name: {middle_name}")
        
        # Fill the "Date of Birth" field
        dob_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "date_of_birth_reg"))
        )
        dob_input.clear()
        dob_input.send_keys(dob)
        print(f"Entered Date of Birth: {dob}")

        # Fill the "Contact Number" field
        contact_no_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "rvContactNo"))
        )
        contact_no_input.clear()
        contact_no_input.send_keys(phone)
        print(f"Entered Contact Number: {phone}")

        # Fill the "Email" field
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "email_id2"))
        )
        email_input.clear()
        email_input.send_keys(email)
        print(f"Entered Email: {email}")
        
        # Check the "Consent" checkbox
        consent_checkbox = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "consent"))
        )
        if not consent_checkbox.is_selected():  # Check if the checkbox is not already selected
            consent_checkbox.click()
            print("Checked the 'Consent' checkbox.")

        print("Form fields filled with provided details.")
        input("Press Enter to close the browser manually...")
    except Exception as e:
        print(f"Failed to open Chrome browser: {e}")
        

