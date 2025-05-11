# Gemini AI Integration for Chat System

This document describes how the Gemini AI integration works in the DigiCSC chat system.

## Setup Instructions

1. Get a Gemini API key from Google AI Studio (https://ai.google.dev/)
2. Add the API key to your `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Make sure `google-generativeai` is in your requirements.txt (it should already be included)
4. Install dependencies if needed: `pip install -r requirements.txt`
5. Restart the backend server

## How It Works

The Gemini AI integration is designed to be non-intrusive to existing user-freelancer conversations. The system uses a smart decision-making process to determine when AI should respond:

### Decision Logic

1. **Explicit settings**: 
   - If AI is explicitly enabled for a conversation (`ai_enabled=true`), AI always responds
   - If AI is explicitly disabled for a conversation (`ai_enabled=false`), AI never responds

2. **Default behavior** (when no explicit setting):
   - If no freelancer is assigned to the conversation, AI responds
   - If a freelancer is assigned but hasn't sent any messages in the last 24 hours, AI responds
   - If a freelancer is actively participating in the conversation, AI stays silent

3. **User type restriction**:
   - AI only responds to messages from customers, never to freelancer messages

## API Endpoints

The system provides several endpoints for Gemini AI integration:

1. **Regular Chat Endpoint with AI Auto-Response**
   - `POST /api/chat/`
   - This is the standard chat endpoint that now includes AI auto-response functionality
   - When a customer sends a message, AI will respond if no freelancer is available
   - Uses the standard ChatMessageCreate schema

2. **Explicit Gemini Processing Endpoint**
   - `POST /api/chat/gemini`
   - This endpoint explicitly processes messages with Gemini AI
   - Uses the standard ChatMessageCreate schema
   - Always returns an AI response if possible

3. **Admin-only Test Endpoint**
   - `POST /api/chat/gemini-test`
   - This is a simple endpoint for testing the Gemini integration
   - Only accessible by admin users
   - Takes a simple text message and returns the AI response

## Configuration

The AI behavior is controlled by the `should_ai_respond()` function in `app/utils/gemini_ai.py`. You can modify this function to change when the AI should respond.

Current behavior:
- AI responds if no freelancer is assigned to the conversation
- AI stays silent if a freelancer is assigned

## Admin Controls

The system provides admin controls to enable or disable AI responses for specific conversations:

- **Toggle AI for a conversation**:
  - `POST /api/chat/conversation/{conversation_id}/ai-toggle`
  - Body: `{"enable": true}` or `{"enable": false}`
  - Accessible by administrators and the assigned freelancer for a conversation

## Customization

You can customize the AI behavior by modifying:

1. `generate_ai_response()` in `app/utils/gemini_ai.py` to change how AI responses are generated
2. `should_ai_respond()` in `app/utils/gemini_ai.py` to change when AI should respond

## Security

Please ensure your API keys are kept secure and not exposed in client-side code or version control systems.
