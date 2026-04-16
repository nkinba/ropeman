<script lang="ts">
	// Hero illustration — Stitch "Ropeman Landing - Hero Redesign v2" (landing-hero-redesign-v2.html)
	// Three glass-panel nodes (AppContainer / AuthModule / DataStore) connected by
	// dashed cubic edges, with a pulsing primary glow anchored to the center.
</script>

<div class="hero-illustration" aria-hidden="true">
	<!-- Radial glow backdrop -->
	<div class="hero-radial-glow"></div>

	<!-- SVG edges (dashed, colored like ZUICanvas edges) -->
	<svg class="hero-edges" viewBox="0 0 400 400" preserveAspectRatio="none">
		<path
			class="edge-glow edge-flow"
			d="M120 150 Q 200 100 280 150"
			fill="none"
			stroke="var(--accent-secondary, #53ddfc)"
			stroke-dasharray="4 4"
			stroke-width="1.5"
			opacity="0.6"
		/>
		<path
			class="edge-flow edge-flow-slow"
			d="M120 150 Q 200 250 280 250"
			fill="none"
			stroke="var(--accent, #a3a6ff)"
			stroke-dasharray="4 4"
			stroke-width="1.5"
			opacity="0.4"
		/>
		<path
			class="edge-glow edge-flow edge-flow-fast"
			d="M280 150 Q 320 200 280 250"
			fill="none"
			stroke="var(--accent-secondary, #53ddfc)"
			stroke-dasharray="4 4"
			stroke-width="1.5"
			opacity="0.6"
		/>
	</svg>

	<!-- Central pulse -->
	<div class="hero-pulse"></div>

	<!-- Node 1 — AppContainer (primary) -->
	<div class="hero-node pos-tl">
		<div class="node-bar" style="background: var(--accent, #a3a6ff);"></div>
		<div class="node-title">App Container</div>
		<div class="node-sub">Primary Entry Point</div>
	</div>

	<!-- Node 2 — AuthModule (secondary) -->
	<div class="hero-node pos-tr">
		<div class="node-bar" style="background: var(--accent-secondary, #53ddfc);"></div>
		<div class="node-title">Auth Module</div>
		<div class="node-sub">JWT / Middleware</div>
	</div>

	<!-- Node 3 — DataStore (tertiary) -->
	<div class="hero-node pos-br">
		<div class="node-bar" style="background: var(--accent-tertiary, #ac8aff);"></div>
		<div class="node-title">Data Store</div>
		<div class="node-sub">State Management</div>
	</div>
</div>

<style>
	.hero-illustration {
		position: relative;
		width: 100%;
		height: 500px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-radial-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			circle at center,
			color-mix(in srgb, var(--accent, #a3a6ff) 20%, transparent) 0%,
			transparent 70%
		);
		filter: blur(40px);
		opacity: 0.4;
		pointer-events: none;
	}

	.hero-edges {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.edge-glow {
		filter: drop-shadow(0 0 4px rgba(83, 221, 252, 0.3));
	}

	/* Flowing dash animation along each edge path */
	.edge-flow {
		animation: dash-flow 6s linear infinite;
	}
	.edge-flow-slow {
		animation-duration: 9s;
		animation-direction: reverse;
	}
	.edge-flow-fast {
		animation-duration: 4s;
	}

	@keyframes dash-flow {
		to {
			stroke-dashoffset: -80;
		}
	}

	.hero-pulse {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 128px;
		height: 128px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--accent, #a3a6ff) 10%, transparent);
		filter: blur(32px);
		animation: pulse-glow 3s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes pulse-glow {
		0%,
		100% {
			opacity: 0.6;
			transform: translate(-50%, -50%) scale(1);
		}
		50% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.15);
		}
	}

	.hero-node {
		position: absolute;
		width: 140px;
		padding: 12px;
		background: rgba(32, 38, 47, 0.85);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
		z-index: 2;
		animation: hero-float 6s ease-in-out infinite;
	}

	@keyframes hero-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	.pos-tl {
		top: 120px;
		left: 60px;
		animation-delay: 0s;
	}

	.pos-tr {
		top: 120px;
		right: 40px;
		animation-delay: 2s;
	}

	.pos-br {
		bottom: 120px;
		right: 60px;
		animation-delay: 4s;
	}

	.node-bar {
		height: 4px;
		width: 32px;
		border-radius: 999px;
		margin-bottom: 8px;
	}

	.node-title {
		font-family: var(--font-display, 'Space Grotesk', sans-serif);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-primary, #f1f3fc);
		line-height: 1.2;
	}

	.node-sub {
		margin-top: 2px;
		font-family: var(--font-body, 'Inter', sans-serif);
		font-size: 9px;
		color: var(--text-muted, #64748b);
		line-height: 1.3;
	}

	@media (max-width: 1024px) {
		.hero-illustration {
			display: none;
		}
	}

	/* Respect users who prefer reduced motion — OS-level a11y setting.
	   Animations (float / pulse / dash flow) would be distracting for
	   those users, so we disable them while keeping the static layout. */
	@media (prefers-reduced-motion: reduce) {
		.hero-node,
		.hero-pulse,
		.edge-flow {
			animation: none;
		}
	}
</style>
