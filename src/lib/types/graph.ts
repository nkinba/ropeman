import type { BadgeKind } from './ast';

export type NodeKind = 'directory' | 'file' | 'function' | 'class' | 'method' | 'import';

export interface GraphNode {
	id: string;
	kind: NodeKind;
	label: string;
	filePath: string;
	lineStart?: number;
	lineEnd?: number;
	parentId: string | null;
	childCount: number;
	language?: string;
	isExpanded: boolean;
	code?: string;
	badges?: BadgeKind[];
}

export interface GraphEdge {
	id: string;
	source: string;
	target: string;
	type: 'contains' | 'imports' | 'calls';
}
