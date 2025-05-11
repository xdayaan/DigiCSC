# AI Chat Feature - DigiCSC

This document describes the AI Chat feature implementation for the DigiCSC app.

## Overview

The AI Chat feature allows customers to have direct conversations with an AI assistant powered by Google's Gemini AI. This feature is particularly useful for:

1. Getting quick answers to common questions
2. Receiving support when human freelancers are unavailable
3. Testing services before connecting with a human freelancer

## Features

### AI-Only Conversations
- Dedicated conversation space for AI interactions
- No freelancer assignment needed
- Messages stored in the user's MongoDB collection

### Language Selection
- Users can change their preferred language on-the-fly
- Supports multiple languages:
  - English
  - Hindi
  - Kumaoni
  - Gharwali
- Immediate language testing with sample responses

### Document Handling
- Users can upload documents to the AI
- AI can help interpret or respond to document content
- Same document types supported as regular chat

## Implementation Details

### Backend Integration
- Uses the existing `/chat/gemini` endpoint
- Leverages the user's `preferred_language` setting
- No freelancer ID is assigned to AI conversations

### Frontend Components
- `AiChatScreen.js`: Main screen for AI interactions
- Language selector modal in the header
- Integration with existing `MessageBubble` and `ChatInput` components

### Data Flow
1. User creates or accesses an AI conversation (without freelancer)
2. Messages sent to the `/chat/gemini` endpoint
3. AI generates responses based on user's preferred language
4. Responses stored in the MongoDB collection

## Usage Instructions

1. Navigate to the AI Chat from the customer dashboard
2. Send messages directly to the AI
3. Change language by tapping the language icon in header
4. Upload documents using the attachment button

## Future Enhancements

Possible future improvements:
- AI conversation history summarization
- Custom AI personalities/roles
- Integration with service booking
- Voice input/output support
