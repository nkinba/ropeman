import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock webgpuStore ---
const mockWebgpuStore = {
	status: 'idle' as string,
	downloadProgress: 0,
	downloadStage: '',
	errorMessage: '',
	selectedModelId: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
	reset: vi.fn(() => {
		mockWebgpuStore.status = 'idle';
		mockWebgpuStore.downloadProgress = 0;
		mockWebgpuStore.downloadStage = '';
		mockWebgpuStore.errorMessage = '';
	})
};

vi.mock('$lib/stores/webgpuStore.svelte', () => ({
	webgpuStore: mockWebgpuStore
}));

// --- Mock Worker ---
let workerOnMessage: ((e: MessageEvent) => void) | null = null;
const mockPostMessage = vi.fn();
const mockWorkerInstance = {
	postMessage: mockPostMessage,
	set onmessage(fn: ((e: MessageEvent) => void) | null) {
		workerOnMessage = fn;
	},
	get onmessage() {
		return workerOnMessage;
	}
};

// Capture the Worker constructor mock — must use function (not arrow) to support `new`
vi.stubGlobal(
	'Worker',
	vi.fn(function () {
		return mockWorkerInstance;
	})
);

// We need to reset modules between tests because the service has module-level state
let initModel: typeof import('./webllmService').initModel;
let generate: typeof import('./webllmService').generate;
let cancelDownload: typeof import('./webllmService').cancelDownload;
let checkWebGPUSupport: typeof import('./webllmService').checkWebGPUSupport;

describe('webllmService', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		workerOnMessage = null;
		mockWebgpuStore.status = 'idle';
		mockWebgpuStore.downloadProgress = 0;
		mockWebgpuStore.downloadStage = '';
		mockWebgpuStore.errorMessage = '';

		// Re-import to get fresh module state
		vi.resetModules();
		const mod = await import('./webllmService');
		initModel = mod.initModel;
		generate = mod.generate;
		cancelDownload = mod.cancelDownload;
		checkWebGPUSupport = mod.checkWebGPUSupport;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('initModel', () => {
		it('sets store status to downloading and posts init message to worker', async () => {
			// Act
			const promise = initModel();

			// Assert — store updated before worker responds
			expect(mockWebgpuStore.status).toBe('downloading');
			expect(mockWebgpuStore.downloadProgress).toBe(0);
			expect(mockWebgpuStore.downloadStage).toBe('Starting model download...');

			// Assert — Worker created and init message sent with modelId
			expect(mockPostMessage).toHaveBeenCalledWith({
				type: 'init',
				id: expect.any(String),
				payload: { modelId: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC' }
			});

			// Simulate worker responding with init-done
			const callId = mockPostMessage.mock.calls[0][0].id;
			workerOnMessage!(new MessageEvent('message', {
				data: { type: 'init-done', id: callId }
			}));

			await promise;

			expect(mockWebgpuStore.status).toBe('ready');
			expect(mockWebgpuStore.downloadProgress).toBe(100);
		});

		it('updates store on init-progress messages', async () => {
			// Act
			const promise = initModel();
			const callId = mockPostMessage.mock.calls[0][0].id;

			// Simulate progress update
			workerOnMessage!(new MessageEvent('message', {
				data: {
					type: 'init-progress',
					id: callId,
					payload: { progress: 42, stage: 'Downloading weights...' }
				}
			}));

			expect(mockWebgpuStore.downloadProgress).toBe(42);
			expect(mockWebgpuStore.downloadStage).toBe('Downloading weights...');

			// Complete init
			workerOnMessage!(new MessageEvent('message', {
				data: { type: 'init-done', id: callId }
			}));

			await promise;
		});

		it('sets error state on worker error', async () => {
			// Act
			const promise = initModel();
			const callId = mockPostMessage.mock.calls[0][0].id;

			// Simulate error
			workerOnMessage!(new MessageEvent('message', {
				data: {
					type: 'error',
					id: callId,
					payload: { message: 'WebGPU adapter not found' }
				}
			}));

			await expect(promise).rejects.toThrow('WebGPU adapter not found');
			expect(mockWebgpuStore.status).toBe('error');
			expect(mockWebgpuStore.errorMessage).toBe('WebGPU adapter not found');
		});
	});

	describe('generate', () => {
		it('sends generate message with system and prompt', async () => {
			// First initialize (create the worker)
			const initPromise = initModel();
			const initId = mockPostMessage.mock.calls[0][0].id;
			workerOnMessage!(new MessageEvent('message', {
				data: { type: 'init-done', id: initId }
			}));
			await initPromise;

			// Act
			const genPromise = generate('You are a code analyzer.', 'Explain this function.');

			// Assert — postMessage called with generate
			const genCall = mockPostMessage.mock.calls[1][0];
			expect(genCall.type).toBe('generate');
			expect(genCall.payload).toEqual({
				system: 'You are a code analyzer.',
				prompt: 'Explain this function.'
			});

			// Simulate response
			workerOnMessage!(new MessageEvent('message', {
				data: {
					type: 'generate-result',
					id: genCall.id,
					payload: { text: 'This function does X.' }
				}
			}));

			const result = await genPromise;
			expect(result).toBe('This function does X.');
		});

		it('rejects on worker error during generate', async () => {
			// Initialize
			const initPromise = initModel();
			const initId = mockPostMessage.mock.calls[0][0].id;
			workerOnMessage!(new MessageEvent('message', {
				data: { type: 'init-done', id: initId }
			}));
			await initPromise;

			// Act
			const genPromise = generate('sys', 'prompt');
			const genCall = mockPostMessage.mock.calls[1][0];

			// Simulate error
			workerOnMessage!(new MessageEvent('message', {
				data: {
					type: 'error',
					id: genCall.id,
					payload: { message: 'Model not initialized. Call init first.' }
				}
			}));

			await expect(genPromise).rejects.toThrow('Model not initialized');
		});
	});

	describe('cancelDownload', () => {
		it('posts cancel-download message to worker and resets store', async () => {
			// Initialize first to create worker
			const initPromise = initModel();
			const initId = mockPostMessage.mock.calls[0][0].id;
			workerOnMessage!(new MessageEvent('message', {
				data: { type: 'init-done', id: initId }
			}));
			await initPromise;

			// Act
			cancelDownload();

			// Assert — cancel message sent
			const cancelCall = mockPostMessage.mock.calls[1][0];
			expect(cancelCall.type).toBe('cancel-download');

			// Assert — store reset called
			expect(mockWebgpuStore.reset).toHaveBeenCalled();
		});

		it('does not throw when no worker exists (no init called)', () => {
			// Act & Assert — should not throw
			expect(() => cancelDownload()).not.toThrow();
			// Store reset is still called
			expect(mockWebgpuStore.reset).toHaveBeenCalled();
		});
	});

	describe('checkWebGPUSupport', () => {
		it('returns false when navigator.gpu is not present', () => {
			expect(checkWebGPUSupport()).toBe(false);
		});

		it('returns true when navigator.gpu is present', () => {
			const original = globalThis.navigator;
			Object.defineProperty(globalThis, 'navigator', {
				value: { ...original, gpu: {} },
				writable: true,
				configurable: true
			});

			expect(checkWebGPUSupport()).toBe(true);

			Object.defineProperty(globalThis, 'navigator', {
				value: original,
				writable: true,
				configurable: true
			});
		});
	});
});
