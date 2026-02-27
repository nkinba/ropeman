export interface SemanticNode {
	id: string;                    // "sem:auth-system"
	label: string;                 // "Authentication System"
	description: string;           // AI 생성 1-2줄 설명
	color: string;                 // 팔레트 색상
	filePaths: string[];           // 소속 파일 경로들
	keySymbols: string[];          // 핵심 함수/클래스명
	parentId: string | null;       // 드릴다운 부모 (null=최상위)
	depth: number;                 // 0=최상위, 1=첫 드릴다운...
	fileCount: number;
}

export interface SemanticEdge {
	id: string;
	source: string;
	target: string;
	label?: string;                // "authenticates", "reads from"
	type: 'depends_on' | 'calls' | 'extends' | 'uses';
}

export interface SemanticLevel {
	parentId: string | null;
	nodes: SemanticNode[];
	edges: SemanticEdge[];
	breadcrumbLabel: string;
}
