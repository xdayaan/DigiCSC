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

def rti_file(
    public_authority: str = "Public Authority",
    email: str = "Email",
    mobile_no: str = "9876543210",
    name: str = "Name",
    gender: str = "F",
    address: str = "Address",
    city: str = "City",
    pin_code: str = "Pin Code",
    state: str = "Uttarakhand",
    status: str = "Rural",
    education: str = "litrate",
    bpl: str = "No",
    rti_text: str = "RTI Text",
):
    try:
        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        
        # Open the RTI Online URL
        url = "https://rtionline.gov.in/"
        driver.get(url)
        print("RTI Online page opened in Chrome browser.")

        # Click the "Submit Request" link
        submit_request_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Submit Request')]"))
        )
        submit_request_link.click()
        print("Clicked the 'Submit Request' link.")
        
        time.sleep(2)
        
        # Click the checkbox
        checkbox = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "CheckBox"))
        )
        checkbox.click()
        print("Clicked the checkbox.")
        
        # Click the "Submit" button
        submit_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "btn"))
        )
        submit_button.click()
        print("Clicked the 'Submit' button.")
        
        # Fill the "Public Authority" input field
        public_authority_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "inputString"))
        )
        public_authority_input.clear()
        public_authority_input.send_keys(public_authority)
        print(f"Entered Public Authority: {public_authority}")

        # Wait for the suggestion panel and click the first suggestion
        first_suggestion = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@id='autoSuggestionsList']/li[1]"))
        )
        first_suggestion.click()
        print("Clicked the first suggestion in the suggestion panel.")
        
        time.sleep(2)  # wait for popup to appear
        alert = driver.switch_to.alert
        alert.accept()
        
        # Fill the "Email" field
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "Email"))
        )
        email_input.clear()
        email_input.send_keys(email)
        print(f"Entered Email: {email}")
        
        # Fill the "Cell" field
        cell_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "cell"))
        )
        cell_input.clear()
        cell_input.send_keys(mobile_no)
        print(f"Entered Mobile Number: {mobile_no}")

        # Fill the "Confirm Email" field
        confirm_email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "ConfirmEmail"))
        )
        confirm_email_input.clear()
        confirm_email_input.send_keys(email)
        print(f"Entered Confirm Email: {email}")

        # Fill the "Name" field
        name_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "Name"))
        )
        name_input.clear()
        name_input.send_keys(name)
        print(f"Entered Name: {name}")
        
        # Select Gender
        gender_radio = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//input[@name='gender' and @value='{gender}']"))
        )
        gender_radio.click()
        print(f"Selected Gender: {'Male' if gender == 'M' else 'Female' if gender == 'F' else 'Third Gender'}")
        
        # Fill the "Address1" field
        address1_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "address1"))
        )
        address1_input.clear()
        address1_input.send_keys(address)
        print(f"Entered Address1: {address}")

        # Fill the "Address2" field
        address2_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "address2"))
        )
        address2_input.clear()
        address2_input.send_keys(city)
        print(f"Entered Address2: {city}")

        # Fill the "Phone" field
        phone_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "phone"))
        )
        phone_input.clear()
        phone_input.send_keys(mobile_no)
        print(f"Entered Phone: {mobile_no}")
        
        # Select State
        state_dropdown = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "stateId"))
        )
        select = Select(state_dropdown)
        select.select_by_visible_text(state)
        print(f"Selected State: {state}")
        
        # Select BPL status
        bpl_dropdown = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "BPL"))
        )
        select = Select(bpl_dropdown)
        select.select_by_visible_text(bpl) 
        print("Selected BPL status: {bpl}")
        
        # Fill the "RTI Text" field
        rti_textarea = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "Description"))
        )
        rti_textarea.clear()
        rti_textarea.send_keys(rti_text)
        print(f"Entered RTI Text: {rti_text}")
        
        # Scroll to the CAPTCHA image
        captcha_image = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "captchaimg"))
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", captcha_image)
        print("Scrolled to the CAPTCHA image.")
        
        # Solve CAPTCHA
        captcha_text = read_captcha(driver, By.ID, "captchaimg",0,0,400,400)
        if captcha_text:
            captcha_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "6_letters_code"))
            )
            captcha_input.clear()
            captcha_input.send_keys(captcha_text)
            print(f"Entered CAPTCHA: {captcha_text}")
        else:
            print("Failed to solve CAPTCHA.")
        
        input("Press Enter to close the browser manually...")
    except Exception as e:
        print(f"An error occurred: {e}")

