import { describe, it, expect, beforeEach } from 'vitest';
import { chatStore } from './chatStore.svelte';

describe('chatStore', () => {
	beforeEach(() => {
		chatStore.clear();
		chatStore.open = false;
		chatStore.loading = false;
	});

	describe('initial state', () => {
		it('messages starts as empty array', () => {
			expect(chatStore.messages).toEqual([]);
		});

		it('open starts as false', () => {
			expect(chatStore.open).toBe(false);
		});

		it('loading starts as false', () => {
			expect(chatStore.loading).toBe(false);
		});
	});

	describe('toggle', () => {
		it('toggles open from false to true', () => {
			chatStore.toggle();
			expect(chatStore.open).toBe(true);
		});

		it('toggles open from true to false', () => {
			chatStore.open = true;
			chatStore.toggle();
			expect(chatStore.open).toBe(false);
		});

		it('toggles back and forth', () => {
			chatStore.toggle();
			expect(chatStore.open).toBe(true);
			chatStore.toggle();
			expect(chatStore.open).toBe(false);
		});
	});

	describe('addMessage', () => {
		it('adds a user message', () => {
			chatStore.addMessage('user', 'Hello');
			const msgs = chatStore.messages;
			expect(msgs).toHaveLength(1);
			expect(msgs[0].role).toBe('user');
			expect(msgs[0].content).toBe('Hello');
			expect(msgs[0].relatedNodes).toEqual([]);
		});

		it('adds an assistant message', () => {
			chatStore.addMessage('assistant', 'Hi there');
			const msgs = chatStore.messages;
			expect(msgs).toHaveLength(1);
			expect(msgs[0].role).toBe('assistant');
		});

		it('adds message with related nodes', () => {
			chatStore.addMessage('user', 'About this file', ['node1', 'node2']);
			const msgs = chatStore.messages;
			expect(msgs[0].relatedNodes).toEqual(['node1', 'node2']);
		});

		it('includes timestamp', () => {
			const before = Date.now();
			chatStore.addMessage('user', 'test');
			const after = Date.now();
			const msgs = chatStore.messages;
			expect(msgs[0].timestamp).toBeGreaterThanOrEqual(before);
			expect(msgs[0].timestamp).toBeLessThanOrEqual(after);
		});

		it('appends messages in order', () => {
			chatStore.addMessage('user', 'first');
			chatStore.addMessage('assistant', 'second');
			chatStore.addMessage('user', 'third');
			const msgs = chatStore.messages;
			expect(msgs).toHaveLength(3);
			expect(msgs[0].content).toBe('first');
			expect(msgs[1].content).toBe('second');
			expect(msgs[2].content).toBe('third');
		});
	});

	describe('clear', () => {
		it('removes all messages', () => {
			chatStore.addMessage('user', 'msg1');
			chatStore.addMessage('assistant', 'msg2');
			chatStore.clear();
			expect(chatStore.messages).toEqual([]);
		});

		it('is safe to call when already empty', () => {
			chatStore.clear();
			expect(chatStore.messages).toEqual([]);
		});
	});
});
