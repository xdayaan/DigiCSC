// User related types
export enum UserType {
  USER = "user",
  FREELANCER = "freelancer"
}

export enum Language {
  ENGLISH = "english",
  HINDI = "hindi",
  KUMAONI = "kumaoni",
  GHARWALI = "gharwali"
}

export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  csc_id?: string;
  user_type: UserType;
  preferred_language: Language;
}

// Chat related types
export enum MessageSender {
  USER = "user",
  AI = "ai",
  FREELANCER = "freelancer"
}

export enum MessageType {
  TEXT = "text",
  FILE = "file",     // Changed from DOCUMENT to FILE to match backend expectations
  PDF = "pdf",       // Adding other backend-supported types
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video"
}

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  docLink?: string;
  docType?: string;
}

export interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  messages: Message[];
}