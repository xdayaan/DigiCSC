import os
from dotenv import load_dotenv
from agora_token_builder import RtcTokenBuilder
import time

load_dotenv()

APP_ID = os.getenv("AGORA_APP_ID")
APP_CERTIFICATE = os.getenv("AGORA_APP_CERTIFICATE")

def generate_agora_token(channel_name, uid):
    expiration_time_in_seconds = 3600
    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expiration_time_in_seconds

    role = 1  # publisher
    token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID, APP_CERTIFICATE, channel_name, uid, role, privilege_expired_ts
    )
    return token