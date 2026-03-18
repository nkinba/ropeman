import { settingsStore } from './settingsStore.svelte';
import { webgpuStore } from './webgpuStore.svelte';

export type AuthTrack = 'none' | 'edge' | 'byok' | 'bridge' | 'webgpu';
export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

function createAuthStore() {
	let bridgeStatus = $state<BridgeStatus>('disconnected');
	let bridgePort = $state(9876);
	let bridgeError = $state('');
	let edgeEnabled = $state(false);

	return {
		get bridgeStatus() {
			return bridgeStatus;
		},
		set bridgeStatus(v: BridgeStatus) {
			bridgeStatus = v;
		},

		get bridgePort() {
			return bridgePort;
		},
		set bridgePort(v: number) {
			bridgePort = v;
		},

		get bridgeError() {
			return bridgeError;
		},
		set bridgeError(v: string) {
			bridgeError = v;
		},

		get edgeEnabled() {
			return edgeEnabled;
		},
		set edgeEnabled(v: boolean) {
			edgeEnabled = v;
		},

		get isReady(): boolean {
			return (
				edgeEnabled ||
				settingsStore.hasApiKey ||
				bridgeStatus === 'connected' ||
				webgpuStore.isReady
			);
		},

		get activeTrack(): AuthTrack {
			if (bridgeStatus === 'connected') return 'bridge';
			if (edgeEnabled) return 'edge';
			if (webgpuStore.isReady) return 'webgpu';
			if (settingsStore.hasApiKey) return 'byok';
			return 'none';
		}
	};
}

export const authStore = createAuthStore();
