export type WebGPUStatus = 'idle' | 'confirming' | 'downloading' | 'ready' | 'error';

export interface WebGPUModelInfo {
	id: string;
	label: string;
	params: string;
	vramMB: number;
	downloadSizeMB: number;
}

export const WEBGPU_MODELS: WebGPUModelInfo[] = [
	{
		id: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
		label: 'Qwen2.5-Coder-0.5B',
		params: '0.5B',
		vramMB: 945,
		downloadSizeMB: 400
	},
	{
		id: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
		label: 'Qwen2.5-Coder-1.5B',
		params: '1.5B',
		vramMB: 1630,
		downloadSizeMB: 900
	},
	{
		id: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC',
		label: 'Qwen2.5-Coder-3B',
		params: '3B',
		vramMB: 2505,
		downloadSizeMB: 1700
	},
	{
		id: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
		label: 'Qwen2.5-Coder-7B',
		params: '7B',
		vramMB: 5107,
		downloadSizeMB: 4300
	}
];

const DEFAULT_MODEL_ID = 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC';

function createWebGPUStore() {
	let status = $state<WebGPUStatus>('idle');
	let downloadProgress = $state(0);
	let downloadStage = $state('');
	let errorMessage = $state('');
	let isSupported = $state(false);
	let selectedModelId = $state(DEFAULT_MODEL_ID);
	let isCached = $state(false);

	// Check WebGPU support on creation (browser only)
	if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
		isSupported = true;
	}

	return {
		get status() {
			return status;
		},
		set status(v: WebGPUStatus) {
			status = v;
		},

		get downloadProgress() {
			return downloadProgress;
		},
		set downloadProgress(v: number) {
			downloadProgress = v;
		},

		get downloadStage() {
			return downloadStage;
		},
		set downloadStage(v: string) {
			downloadStage = v;
		},

		get errorMessage() {
			return errorMessage;
		},
		set errorMessage(v: string) {
			errorMessage = v;
		},

		get isSupported() {
			return isSupported;
		},

		get isReady(): boolean {
			return status === 'ready';
		},

		get selectedModelId() {
			return selectedModelId;
		},
		set selectedModelId(v: string) {
			selectedModelId = v;
		},

		get selectedModel(): WebGPUModelInfo {
			return WEBGPU_MODELS.find((m) => m.id === selectedModelId) ?? WEBGPU_MODELS[1];
		},

		get isCached() {
			return isCached;
		},
		set isCached(v: boolean) {
			isCached = v;
		},

		reset() {
			status = 'idle';
			downloadProgress = 0;
			downloadStage = '';
			errorMessage = '';
		}
	};
}

export const webgpuStore = createWebGPUStore();
