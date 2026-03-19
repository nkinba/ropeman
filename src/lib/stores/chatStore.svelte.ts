export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	relatedNodes: string[];
	timestamp: number;
}

function createChatStore() {
	let messages = $state<ChatMessage[]>([]);
	let open = $state(false);
	let loading = $state(false);

	return {
		get messages() {
			return messages;
		},
		set messages(v: ChatMessage[]) {
			messages = v;
		},
		get open() {
			return open;
		},
		set open(v: boolean) {
			open = v;
		},
		get loading() {
			return loading;
		},
		set loading(v: boolean) {
			loading = v;
		},
		toggle() {
			open = !open;
		},
		addMessage(role: 'user' | 'assistant', content: string, relatedNodes: string[] = []) {
			messages = [...messages, { role, content, relatedNodes, timestamp: Date.now() }];
		},
		clear() {
			messages = [];
		}
	};
}

export const chatStore = createChatStore();
