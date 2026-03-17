export type WebGPUStatus = 'idle' | 'confirming' | 'downloading' | 'ready' | 'error';

function createWebGPUStore() {
	let status = $state<WebGPUStatus>('idle');
	let downloadProgress = $state(0);
	let downloadStage = $state('');
	let errorMessage = $state('');
	let isSupported = $state(false);

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

		reset() {
			status = 'idle';
			downloadProgress = 0;
			downloadStage = '';
			errorMessage = '';
		}
	};
}

export const webgpuStore = createWebGPUStore();
