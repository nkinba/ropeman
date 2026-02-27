export interface ArchitectureGroup {
	name: string;
	color: string;
	nodeIds: string[];
}

function createArchitectureStore() {
	let groups = $state<ArchitectureGroup[]>([]);
	let isAnalyzing = $state(false);
	let enabled = $state(false);

	return {
		get groups() { return groups; },
		set groups(v: ArchitectureGroup[]) { groups = v; },

		get isAnalyzing() { return isAnalyzing; },
		set isAnalyzing(v: boolean) { isAnalyzing = v; },

		get enabled() { return enabled; },
		set enabled(v: boolean) { enabled = v; },

		clear() {
			groups = [];
			isAnalyzing = false;
			enabled = false;
		}
	};
}

export const architectureStore = createArchitectureStore();
