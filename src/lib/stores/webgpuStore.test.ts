import { describe, it, expect, beforeEach } from 'vitest';
import { webgpuStore, WEBGPU_MODELS, type WebGPUStatus } from './webgpuStore.svelte';

describe('webgpuStore', () => {
	beforeEach(() => {
		webgpuStore.reset();
	});

	describe('initial / reset state', () => {
		it('status is idle after reset', () => {
			expect(webgpuStore.status).toBe('idle');
		});

		it('downloadProgress is 0 after reset', () => {
			expect(webgpuStore.downloadProgress).toBe(0);
		});

		it('downloadStage is empty after reset', () => {
			expect(webgpuStore.downloadStage).toBe('');
		});

		it('errorMessage is empty after reset', () => {
			expect(webgpuStore.errorMessage).toBe('');
		});
	});

	describe('isSupported', () => {
		it('returns false in node environment (no navigator.gpu)', () => {
			// In node test environment, navigator.gpu is not available
			expect(webgpuStore.isSupported).toBe(false);
		});
	});

	describe('status transitions', () => {
		it('idle → downloading', () => {
			// Arrange
			expect(webgpuStore.status).toBe('idle');

			// Act
			webgpuStore.status = 'downloading';

			// Assert
			expect(webgpuStore.status).toBe('downloading');
		});

		it('downloading → ready', () => {
			// Arrange
			webgpuStore.status = 'downloading';

			// Act
			webgpuStore.status = 'ready';

			// Assert
			expect(webgpuStore.status).toBe('ready');
		});

		it('downloading → error', () => {
			// Arrange
			webgpuStore.status = 'downloading';

			// Act
			webgpuStore.status = 'error';
			webgpuStore.errorMessage = 'WebGPU not supported';

			// Assert
			expect(webgpuStore.status).toBe('error');
			expect(webgpuStore.errorMessage).toBe('WebGPU not supported');
		});

		it('idle → confirming', () => {
			webgpuStore.status = 'confirming';
			expect(webgpuStore.status).toBe('confirming');
		});

		it('accepts all valid WebGPUStatus values', () => {
			const statuses: WebGPUStatus[] = ['idle', 'confirming', 'downloading', 'ready', 'error'];
			for (const s of statuses) {
				webgpuStore.status = s;
				expect(webgpuStore.status).toBe(s);
			}
		});
	});

	describe('isReady', () => {
		it('returns true when status is ready', () => {
			webgpuStore.status = 'ready';
			expect(webgpuStore.isReady).toBe(true);
		});

		it('returns false when status is idle', () => {
			expect(webgpuStore.isReady).toBe(false);
		});

		it('returns false when status is downloading', () => {
			webgpuStore.status = 'downloading';
			expect(webgpuStore.isReady).toBe(false);
		});

		it('returns false when status is error', () => {
			webgpuStore.status = 'error';
			expect(webgpuStore.isReady).toBe(false);
		});
	});

	describe('downloadProgress', () => {
		it('updates progress value', () => {
			webgpuStore.downloadProgress = 42;
			expect(webgpuStore.downloadProgress).toBe(42);
		});

		it('updates to 100 when complete', () => {
			webgpuStore.downloadProgress = 100;
			expect(webgpuStore.downloadProgress).toBe(100);
		});
	});

	describe('downloadStage', () => {
		it('updates stage string', () => {
			webgpuStore.downloadStage = 'Downloading model weights...';
			expect(webgpuStore.downloadStage).toBe('Downloading model weights...');
		});
	});

	describe('errorMessage', () => {
		it('updates error message', () => {
			webgpuStore.errorMessage = 'GPU out of memory';
			expect(webgpuStore.errorMessage).toBe('GPU out of memory');
		});
	});

	describe('reset', () => {
		it('resets all fields to initial values', () => {
			// Arrange — set everything to non-default
			webgpuStore.status = 'error';
			webgpuStore.downloadProgress = 75;
			webgpuStore.downloadStage = 'Loading shaders...';
			webgpuStore.errorMessage = 'Something failed';

			// Act
			webgpuStore.reset();

			// Assert
			expect(webgpuStore.status).toBe('idle');
			expect(webgpuStore.downloadProgress).toBe(0);
			expect(webgpuStore.downloadStage).toBe('');
			expect(webgpuStore.errorMessage).toBe('');
		});
	});

	describe('model selection', () => {
		it('has default model set to Qwen2.5-Coder-1.5B', () => {
			expect(webgpuStore.selectedModelId).toBe('Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC');
		});

		it('selectedModel returns matching model info', () => {
			expect(webgpuStore.selectedModel.label).toBe('Qwen2.5-Coder-1.5B');
			expect(webgpuStore.selectedModel.vramMB).toBe(1630);
		});

		it('can change selected model', () => {
			webgpuStore.selectedModelId = 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC';
			expect(webgpuStore.selectedModel.label).toBe('Qwen2.5-Coder-3B');
			expect(webgpuStore.selectedModel.vramMB).toBe(2505);
			// restore default
			webgpuStore.selectedModelId = 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC';
		});

		it('selectedModel falls back to 1.5B for unknown model ID', () => {
			webgpuStore.selectedModelId = 'unknown-model';
			expect(webgpuStore.selectedModel.label).toBe('Qwen2.5-Coder-1.5B');
			webgpuStore.selectedModelId = 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC';
		});

		it('WEBGPU_MODELS has 4 models', () => {
			expect(WEBGPU_MODELS).toHaveLength(4);
			expect(WEBGPU_MODELS.map((m) => m.params)).toEqual(['0.5B', '1.5B', '3B', '7B']);
		});
	});
});
