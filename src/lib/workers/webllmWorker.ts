import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';

let engine: MLCEngine | null = null;

const MODEL_ID = 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC';

self.onmessage = async (e: MessageEvent) => {
	const { type, id, payload } = e.data;

	switch (type) {
		case 'init':
			await handleInit(id);
			break;
		case 'generate':
			await handleGenerate(id, payload);
			break;
		case 'cancel-download':
			// WebLLM doesn't support mid-download cancel natively,
			// but we can signal the main thread to ignore results
			self.postMessage({ type: 'cancel-ack', id });
			break;
	}
};

async function handleInit(id: string) {
	try {
		engine = await CreateMLCEngine(MODEL_ID, {
			initProgressCallback: (progress: InitProgressReport) => {
				self.postMessage({
					type: 'init-progress',
					id,
					payload: {
						progress: Math.round(progress.progress * 100),
						stage: progress.text
					}
				});
			}
		});
		self.postMessage({ type: 'init-done', id });
	} catch (err) {
		self.postMessage({
			type: 'error',
			id,
			payload: { message: err instanceof Error ? err.message : String(err) }
		});
	}
}

async function handleGenerate(id: string, payload: { system: string; prompt: string }) {
	if (!engine) {
		self.postMessage({
			type: 'error',
			id,
			payload: { message: 'Model not initialized. Call init first.' }
		});
		return;
	}

	try {
		const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
		if (payload.system) {
			messages.push({ role: 'system', content: payload.system });
		}
		messages.push({ role: 'user', content: payload.prompt });

		const reply = await engine.chat.completions.create({
			messages,
			max_tokens: 4096,
			temperature: 0.3
		});

		const text = reply.choices[0]?.message?.content || '';
		self.postMessage({ type: 'generate-result', id, payload: { text } });
	} catch (err) {
		self.postMessage({
			type: 'error',
			id,
			payload: { message: err instanceof Error ? err.message : String(err) }
		});
	}
}
