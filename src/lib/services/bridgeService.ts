import { authStore } from '$lib/stores/authStore.svelte';

let ws: WebSocket | null = null;
let messageId = 0;
const pendingRequests = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>();

export function connectBridge(port: number = 9876): Promise<void> {
	return new Promise((resolve, reject) => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			resolve();
			return;
		}

		authStore.bridgeStatus = 'connecting';
		authStore.bridgeError = '';

		try {
			ws = new WebSocket(`ws://localhost:${port}`);
		} catch (err) {
			authStore.bridgeStatus = 'error';
			authStore.bridgeError = (err as Error).message;
			reject(err);
			return;
		}

		const timeout = setTimeout(() => {
			if (ws && ws.readyState !== WebSocket.OPEN) {
				ws.close();
				authStore.bridgeStatus = 'error';
				authStore.bridgeError = 'Connection timeout';
				reject(new Error('Connection timeout'));
			}
		}, 5000);

		ws.onopen = () => {
			clearTimeout(timeout);
			authStore.bridgeStatus = 'connected';
			authStore.bridgePort = port;
			resolve();
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.id !== undefined && pendingRequests.has(data.id)) {
					const pending = pendingRequests.get(data.id)!;
					pendingRequests.delete(data.id);
					if (data.error) {
						pending.reject(new Error(data.error));
					} else {
						pending.resolve(data.result ?? data.content ?? '');
					}
				}
			} catch {
				// ignore non-JSON messages
			}
		};

		ws.onerror = () => {
			clearTimeout(timeout);
			authStore.bridgeStatus = 'error';
			authStore.bridgeError = 'WebSocket connection failed';
			reject(new Error('WebSocket connection failed'));
		};

		ws.onclose = () => {
			authStore.bridgeStatus = 'disconnected';
			ws = null;
			// Reject all pending requests
			for (const [id, pending] of pendingRequests) {
				pending.reject(new Error('Connection closed'));
				pendingRequests.delete(id);
			}
		};
	});
}

export function sendViaBridge(message: string): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			reject(new Error('Bridge not connected'));
			return;
		}

		const id = ++messageId;
		pendingRequests.set(id, { resolve, reject });

		ws.send(JSON.stringify({ id, type: 'chat', message }));

		// Timeout after 30s
		setTimeout(() => {
			if (pendingRequests.has(id)) {
				pendingRequests.delete(id);
				reject(new Error('Bridge request timeout'));
			}
		}, 30000);
	});
}

export function disconnectBridge(): void {
	if (ws) {
		ws.close();
		ws = null;
	}
	authStore.bridgeStatus = 'disconnected';
}
