import google.generativeai as genai
from typing import Dict, Any, List, Optional
from app.core.config import settings
import base64
import os
import requests
import json

# Import Google TTS conditionally to handle missing credentials
try:
    from google.cloud import texttospeech
    GOOGLE_TTS_AVAILABLE = True
except Exception as e:
    print(f"Google Text-to-Speech not available: {e}")
    GOOGLE_TTS_AVAILABLE = False

class GeminiAIService:
    """Service for interacting with Google's Gemini AI models."""
    
    def __init__(self):
        # Configure the Gemini API with your API key
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        # Initialize Text-to-Speech client
        self.tts_client = None
        if GOOGLE_TTS_AVAILABLE:
            try:
                self.tts_client = texttospeech.TextToSpeechClient()
                print("Google Text-to-Speech client initialized successfully")
            except Exception as e:
                print(f"Warning: Could not initialize Text-to-Speech client: {e}")
    
    async def generate_chat_response(self, message: str, language: str = "english") -> str:
        """
        Generate a response to a user message using Gemini AI.
        
        Args:
            message: The user's message
            language: The preferred language for response
        
        Returns:
            The AI-generated response
        """
        try:
            # Add language context to the prompt
            if language.lower() in ["kumaoni", "garhwali", "gharwali"]:
                prompt = f"Respond to the following message in {language} language. If you don't know {language}, respond in simple Hindi: {message}"
            else:
                prompt = f"Respond to the following message in {language}: {message}"
            
            response = await self.model.generate_content_async(prompt)
            
            if response and hasattr(response, 'text'):
                return response.text
            
            return "I'm sorry, I couldn't generate a response at this time."
        
        except Exception as e:
            print(f"Error generating Gemini response: {e}")
            return "I'm sorry, there was an error processing your request."
    
    async def generate_speech_from_text(self, text: str, language_code: str = "en-US") -> Optional[str]:
        """
        Convert text to speech using Google Text-to-Speech API or fallback to a simpler solution.
        
        Args:
            text: The text to convert to speech
            language_code: Language code for the voice (e.g., "en-US", "hi-IN")
        
        Returns:
            Base64 encoded audio data or None if conversion fails
        """
        # Map user language to appropriate TTS language code
        language_mapping = {
            "english": "en-US",
            "hindi": "hi-IN",
            "kumaoni": "hi-IN",  # Fallback to Hindi
            "garhwali": "hi-IN", # Fallback to Hindi
            "gharwali": "hi-IN"  # Fallback to Hindi
        }
        
        # Set the language code using mapping or fallback to provided code
        language_code = language_mapping.get(language_code.lower(), language_code)
        
        # Try using Google Cloud TTS if available
        if self.tts_client:
            try:
                # Set the text input to be synthesized
                synthesis_input = texttospeech.SynthesisInput(text=text)

                # Build the voice request
                voice = texttospeech.VoiceSelectionParams(
                    language_code=language_code,
                    ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
                )

                # Select the type of audio file you want returned
                audio_config = texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3
                )

                # Perform the text-to-speech request
                response = self.tts_client.synthesize_speech(
                    input=synthesis_input, voice=voice, audio_config=audio_config
                )

                # Encode the binary audio content to base64
                audio_content = base64.b64encode(response.audio_content).decode('utf-8')
                
                return audio_content
            except Exception as e:
                print(f"Error using Google TTS: {e}")
                # Fall through to alternative solution
        
        # Fallback to a text-to-speech dummy implementation
        # In a real application, you could integrate with a free TTS API or service
        # For now, we'll return a dummy audio file for demonstration purposes
        try:
            print(f"Using fallback TTS for language: {language_code}")
            
            # In a real app, you would integrate with another TTS service here
            # For demo purposes, we're returning a simple dummy audio
            dummy_audio_content = self._get_dummy_audio()
            return dummy_audio_content
            
        except Exception as e:
            print(f"Error in fallback TTS: {e}")
            return None
    
    def _get_dummy_audio(self) -> str:
        """
        Generate a dummy audio file for testing purposes.
        In a production app, this should be replaced with a proper TTS service.
        
        Returns:
            Base64 encoded audio content
        """
        # This is a minimal valid MP3 file (just silence)
        # In a production app, you would use a real TTS service
        dummy_mp3 = (
            b'\xFF\xFB\x90\x44\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
            b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        )
        return base64.b64encode(dummy_mp3).decode('utf-8')

# Create a singleton instance
gemini_service = GeminiAIService()