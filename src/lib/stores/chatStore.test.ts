import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	chatMessages,
	chatOpen,
	chatLoading,
	toggleChat,
	addMessage,
	clearChat
} from './chatStore';

describe('chatStore', () => {
	beforeEach(() => {
		clearChat();
		chatOpen.set(false);
		chatLoading.set(false);
	});

	describe('initial state', () => {
		it('chatMessages starts as empty array', () => {
			expect(get(chatMessages)).toEqual([]);
		});

		it('chatOpen starts as false', () => {
			expect(get(chatOpen)).toBe(false);
		});

		it('chatLoading starts as false', () => {
			expect(get(chatLoading)).toBe(false);
		});
	});

	describe('toggleChat', () => {
		it('toggles chatOpen from false to true', () => {
			toggleChat();
			expect(get(chatOpen)).toBe(true);
		});

		it('toggles chatOpen from true to false', () => {
			chatOpen.set(true);
			toggleChat();
			expect(get(chatOpen)).toBe(false);
		});

		it('toggles back and forth', () => {
			toggleChat();
			expect(get(chatOpen)).toBe(true);
			toggleChat();
			expect(get(chatOpen)).toBe(false);
		});
	});

	describe('addMessage', () => {
		it('adds a user message', () => {
			addMessage('user', 'Hello');
			const msgs = get(chatMessages);
			expect(msgs).toHaveLength(1);
			expect(msgs[0].role).toBe('user');
			expect(msgs[0].content).toBe('Hello');
			expect(msgs[0].relatedNodes).toEqual([]);
		});

		it('adds an assistant message', () => {
			addMessage('assistant', 'Hi there');
			const msgs = get(chatMessages);
			expect(msgs).toHaveLength(1);
			expect(msgs[0].role).toBe('assistant');
		});

		it('adds message with related nodes', () => {
			addMessage('user', 'About this file', ['node1', 'node2']);
			const msgs = get(chatMessages);
			expect(msgs[0].relatedNodes).toEqual(['node1', 'node2']);
		});

		it('includes timestamp', () => {
			const before = Date.now();
			addMessage('user', 'test');
			const after = Date.now();
			const msgs = get(chatMessages);
			expect(msgs[0].timestamp).toBeGreaterThanOrEqual(before);
			expect(msgs[0].timestamp).toBeLessThanOrEqual(after);
		});

		it('appends messages in order', () => {
			addMessage('user', 'first');
			addMessage('assistant', 'second');
			addMessage('user', 'third');
			const msgs = get(chatMessages);
			expect(msgs).toHaveLength(3);
			expect(msgs[0].content).toBe('first');
			expect(msgs[1].content).toBe('second');
			expect(msgs[2].content).toBe('third');
		});
	});

	describe('clearChat', () => {
		it('removes all messages', () => {
			addMessage('user', 'msg1');
			addMessage('assistant', 'msg2');
			clearChat();
			expect(get(chatMessages)).toEqual([]);
		});

		it('is safe to call when already empty', () => {
			clearChat();
			expect(get(chatMessages)).toEqual([]);
		});
	});
});
