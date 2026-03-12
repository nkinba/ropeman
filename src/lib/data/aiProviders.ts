export interface AIModel {
	id: string;
	label: string;
	contextWindow?: number;
}

export interface AIProvider {
	id: string;
	label: string;
	models: AIModel[];
	requiresBridge?: boolean;
}

export const AI_PROVIDERS: AIProvider[] = [
	{
		id: 'google',
		label: 'Google Gemini',
		models: [
			{ id: 'fault-test', label: 'fault-test' },
			{ id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)' },
			{ id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
			{ id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (Preview)' },
			{ id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
			{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
			{ id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
			{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
		]
	},
	{
		id: 'anthropic',
		label: 'Anthropic Claude',
		requiresBridge: true,
		models: [
			{ id: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
			{ id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' }
		]
	}
];

export function getProvider(providerId: string): AIProvider | undefined {
	return AI_PROVIDERS.find((p) => p.id === providerId);
}

export function getDefaultModel(providerId: string): string {
	const provider = getProvider(providerId);
	return provider?.models[0]?.id ?? '';
}
