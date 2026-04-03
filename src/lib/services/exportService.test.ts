import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('html-to-image', () => ({
	toPng: vi.fn(async () => 'data:image/png;base64,iVBOR'),
	toSvg: vi.fn(async () => 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E')
}));

// Mock DOM APIs
(globalThis as any).window = {
	devicePixelRatio: 2
};

(globalThis as any).document = {
	createElement: vi.fn(() => ({
		href: '',
		download: '',
		click: vi.fn()
	})),
	body: {
		appendChild: vi.fn(),
		removeChild: vi.fn()
	}
};

// Mock FileReader
class MockFileReader {
	onload: (() => void) | null = null;
	result: string = '';
	readAsDataURL(_blob: Blob) {
		this.result = 'data:mock';
		setTimeout(() => this.onload?.(), 0);
	}
}
(globalThis as any).FileReader = MockFileReader;

// Mock fetch for data URL conversion
const mockBlob = new Blob(['test'], { type: 'image/png' });
(globalThis as any).fetch = vi.fn(async () => ({
	blob: async () => mockBlob
}));

import { toPng, toSvg } from 'html-to-image';
import { exportAsPNG, exportAsSVG } from './exportService';

describe('exportService', () => {
	const mockElement = {
		scrollWidth: 800,
		scrollHeight: 600
	} as HTMLElement;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset window to not have showSaveFilePicker (use fallback path)
		delete (window as any).showSaveFilePicker;
	});

	describe('exportAsPNG', () => {
		it('calls toPng with element and correct options', async () => {
			vi.useFakeTimers();

			const promise = exportAsPNG(mockElement, 'test.png');
			await vi.advanceTimersByTimeAsync(10);
			await promise;

			expect(toPng).toHaveBeenCalledWith(
				mockElement,
				expect.objectContaining({
					width: 800,
					height: 600,
					pixelRatio: 2
				})
			);

			vi.useRealTimers();
		});

		it('uses custom dimensions when provided', async () => {
			vi.useFakeTimers();

			const promise = exportAsPNG(mockElement, 'test.png', {
				width: 1024,
				height: 768
			});
			await vi.advanceTimersByTimeAsync(10);
			await promise;

			expect(toPng).toHaveBeenCalledWith(
				mockElement,
				expect.objectContaining({
					width: 1024,
					height: 768
				})
			);

			vi.useRealTimers();
		});
	});

	describe('exportAsSVG', () => {
		it('calls toSvg with element', async () => {
			vi.useFakeTimers();

			const promise = exportAsSVG(mockElement, 'test.svg');
			await vi.advanceTimersByTimeAsync(10);
			await promise;

			expect(toSvg).toHaveBeenCalledWith(
				mockElement,
				expect.objectContaining({
					width: 800,
					height: 600
				})
			);

			vi.useRealTimers();
		});
	});
});
