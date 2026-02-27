<script lang="ts">
	// Decorative SVG illustration — no props needed
</script>

<div class="hero-illustration">
	<svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
		<!-- Connection edges -->
		<path d="M 140 70 Q 200 40, 280 70" class="edge" />
		<path d="M 100 70 Q 80 140, 90 190" class="edge" />
		<path d="M 280 90 Q 310 140, 310 190" class="edge" />
		<path d="M 140 90 Q 200 130, 260 190" class="edge" />
		<path d="M 200 260 Q 200 290, 200 290" class="edge" />

		<!-- Node: Auth -->
		<g class="node node-1">
			<rect x="40" y="50" width="120" height="44" rx="12" class="node-rect node-color-red" />
			<text x="100" y="77" class="node-label">Auth</text>
		</g>

		<!-- Node: API Layer -->
		<g class="node node-2">
			<rect x="200" y="50" width="140" height="44" rx="12" class="node-rect node-color-blue" />
			<text x="270" y="77" class="node-label">API Layer</text>
		</g>

		<!-- Node: Data Model -->
		<g class="node node-3">
			<rect x="30" y="170" width="150" height="44" rx="12" class="node-rect node-color-green" />
			<text x="105" y="197" class="node-label">Data Model</text>
		</g>

		<!-- Node: UI Components -->
		<g class="node node-4">
			<rect x="220" y="170" width="160" height="44" rx="12" class="node-rect node-color-purple" />
			<text x="300" y="197" class="node-label">UI Components</text>
		</g>

		<!-- Node: Config -->
		<g class="node node-5">
			<rect x="130" y="270" width="140" height="44" rx="12" class="node-rect node-color-amber" />
			<text x="200" y="297" class="node-label">Config</text>
		</g>
	</svg>
</div>

<style>
	.hero-illustration {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
	}

	svg {
		width: 100%;
		height: auto;
	}

	.edge {
		stroke: var(--border);
		stroke-width: 1.5;
		fill: none;
		stroke-dasharray: 4 3;
		opacity: 0.6;
	}

	.node-rect {
		fill: var(--bg-primary);
		stroke-width: 2;
	}

	.node-color-red { stroke: var(--color-autograd); }
	.node-color-blue { stroke: var(--color-attention); }
	.node-color-green { stroke: var(--color-embedding); }
	.node-color-purple { stroke: var(--color-mlp); }
	.node-color-amber { stroke: var(--color-training); }

	.node-label {
		fill: var(--text-primary);
		font-size: 13px;
		font-family: inherit;
		text-anchor: middle;
		dominant-baseline: central;
	}

	.node {
		animation: float 4s ease-in-out infinite;
	}
	.node-1 { animation-delay: 0s; }
	.node-2 { animation-delay: 0.6s; }
	.node-3 { animation-delay: 1.2s; }
	.node-4 { animation-delay: 1.8s; }
	.node-5 { animation-delay: 2.4s; }
</style>
