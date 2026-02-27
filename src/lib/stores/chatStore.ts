import { writable } from 'svelte/store';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  relatedNodes: string[];
  timestamp: number;
}

export const chatMessages = writable<ChatMessage[]>([]);
export const chatOpen = writable<boolean>(false);
export const chatLoading = writable<boolean>(false);

export function toggleChat(): void {
  chatOpen.update(v => !v);
}

export function addMessage(role: 'user' | 'assistant', content: string, relatedNodes: string[] = []): void {
  chatMessages.update(msgs => [...msgs, { role, content, relatedNodes, timestamp: Date.now() }]);
}

export function clearChat(): void {
  chatMessages.set([]);
}
