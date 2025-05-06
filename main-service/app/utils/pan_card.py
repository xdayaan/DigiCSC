# Open NSDL URL in Chrome using Selenium
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def make_pan_card(
    name: str,
    father_name: str,
    dob: str,
    address: str,
    city: str,
    state: str,
    pin_code: str,
):
    """
    Print the details of a PAN card and open NSDL registration page in Chrome.
    
    Args:
        name: Full name of the card holder
        father_name: Father's name of the card holder
        dob: Date of birth in string format
        pan_number: PAN card number
        address: Street address
        city: City name
        state: State name
        pin_code: PIN/Postal code
    """
    print("PAN CARD DETAILS")
    print("=" * 30)
    print(f"Name: {name}")
    print(f"Father's Name: {father_name}")
    print(f"Date of Birth: {dob}")

    print(f"Address: {address}")
    print(f"City: {city}")
    print(f"State: {state}")
    print(f"PIN Code: {pin_code}")
    print("=" * 30)
    
    
    
    try:
        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        
        # Open the NSDL registration URL
        url = "https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html"
        driver.get(url)
        
        print("NSDL registration page opened in Chrome browser.")

        # Fill the form fields using XPath
        # Name
        name_input = driver.find_element("xpath", '//*[@id="l_name_end"]')
        name_input.clear()
        name_input.send_keys(name)

        # # Date of Birth (convert to DD/MM/YYYY if needed)
        # dob_input = driver.find_element("xpath", '//*[@id="date_of_birth_reg"]')
        # dob_input.clear()
        # dob_input.send_keys(dob)

        # Email (dummy value for now)
        email_input = driver.find_element("xpath", '//*[@id="email_id2"]')
        email_input.clear()
        email_input.send_keys("test@example.com")

        # Phone (dummy value for now)
        phone_input = driver.find_element("xpath", '//*[@id="rvContactNo"]')
        phone_input.clear()
        phone_input.send_keys("9999999999")

        print("Form fields filled with provided details.")
    except Exception as e:
        print(f"Failed to open Chrome browser: {e}")