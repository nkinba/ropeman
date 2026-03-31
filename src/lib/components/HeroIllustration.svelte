<script lang="ts">
	// Stitch-style hero illustration — abstract semantic nodes with connections
</script>

<div class="hero-illustration">
	<div class="hero-grid"></div>

	<!-- Center node (primary) -->
	<div class="hero-node center-node">
		<div class="node-bar" style="background: var(--accent)"></div>
		<div class="node-line-thick"></div>
		<div class="node-line-wide"></div>
		<div class="node-tags">
			<div class="node-tag-sm"></div>
			<div class="node-tag-md"></div>
		</div>
	</div>

	<!-- Secondary nodes -->
	<div class="hero-node secondary-node pos-tr">
		<div class="node-bar" style="background: var(--accent-secondary, #53ddfc)"></div>
		<div class="node-line-md"></div>
	</div>

	<div class="hero-node secondary-node pos-br">
		<div class="node-bar" style="background: var(--accent-tertiary, #ac8aff)"></div>
		<div class="node-line-md"></div>
	</div>

	<div class="hero-node secondary-node pos-tl">
		<div class="node-bar" style="background: var(--color-warning, #f2c478)"></div>
		<div class="node-line-sm"></div>
	</div>

	<!-- Connection lines -->
	<svg class="hero-lines" viewBox="0 0 400 400">
		<line
			x1="200"
			y1="200"
			x2="320"
			y2="80"
			stroke="var(--accent)"
			stroke-dasharray="4 4"
			stroke-width="1"
			opacity="0.3"
		/>
		<line
			x1="200"
			y1="200"
			x2="300"
			y2="320"
			stroke="var(--accent)"
			stroke-dasharray="4 4"
			stroke-width="1"
			opacity="0.3"
		/>
		<line
			x1="200"
			y1="200"
			x2="80"
			y2="100"
			stroke="var(--accent)"
			stroke-dasharray="4 4"
			stroke-width="1"
			opacity="0.3"
		/>
	</svg>
</div>

<style>
	.hero-illustration {
		position: relative;
		width: 100%;
		height: 400px;
	}

	.hero-grid {
		position: absolute;
		inset: 0;
		opacity: 0.2;
		pointer-events: none;
		background-image: radial-gradient(var(--accent, #a3a6ff) 1px, transparent 1px);
		background-size: 32px 32px;
	}

	.hero-lines {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.hero-node {
		position: absolute;
		background: var(--bg-tertiary, #1b2028);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.center-node {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 192px;
		z-index: 10;
		border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 5%, transparent);
		animation: float 4s ease-in-out infinite;
	}

	.secondary-node {
		animation: float 4s ease-in-out infinite;
	}

	.pos-tr {
		top: 15%;
		right: 10%;
		width: 144px;
		animation-delay: 0.8s;
	}

	.pos-br {
		bottom: 15%;
		right: 15%;
		width: 160px;
		animation-delay: 1.6s;
	}

	.pos-tl {
		top: 20%;
		left: 5%;
		width: 128px;
		animation-delay: 2.4s;
	}

	.node-bar {
		height: 6px;
		width: 48px;
		border-radius: 3px;
		margin-bottom: 8px;
	}

	.secondary-node .node-bar {
		height: 4px;
		width: 32px;
	}

	.node-line-thick {
		height: 12px;
		width: 128px;
		background: #334155;
		border-radius: 4px;
		margin-bottom: 8px;
	}

	.node-line-wide {
		height: 12px;
		width: 100%;
		background: #334155;
		border-radius: 4px;
		margin-bottom: 8px;
		opacity: 0.5;
	}

	.node-line-md {
		height: 10px;
		width: 80%;
		background: rgba(51, 65, 85, 0.5);
		border-radius: 4px;
	}

	.node-line-sm {
		height: 10px;
		width: 60%;
		background: rgba(51, 65, 85, 0.5);
		border-radius: 4px;
	}

	.node-tags {
		display: flex;
		gap: 4px;
	}

	.node-tag-sm {
		height: 8px;
		width: 32px;
		background: #1e293b;
		border-radius: 4px;
	}

	.node-tag-md {
		height: 8px;
		width: 40px;
		background: #1e293b;
		border-radius: 4px;
	}

	@media (max-width: 1024px) {
		.hero-illustration {
			display: none;
		}
	}
</style>
