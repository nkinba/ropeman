export type TabType = 'diagram' | 'code';

export interface Tab {
	id: string;
	type: TabType;
	label: string;
	/** Unique key: drilldown path hash for diagram tabs, file path for code tabs */
	key: string;
	pinned: boolean;
	preview: boolean;
	lastAccessed: number;
	/** File path for code tabs */
	filePath?: string;
	/** Drilldown path snapshot for diagram tabs */
	drilldownPath?: { nodeId: string; label: string }[];
	/** Which pane this tab belongs to (default: 'primary') */
	paneId?: 'primary' | 'secondary';
}
