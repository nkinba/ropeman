export interface GitHubRepoInfo {
	owner: string;
	repo: string;
	branch?: string;
}

const GITHUB_URL_REGEX =
	/^https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?(?:\/tree\/([^/]+(?:\/[^/]+)*))?(?:\/)?$/;

/**
 * Parse a GitHub URL into owner, repo, and optional branch.
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/branch
 *   https://github.com/owner/repo/tree/feature/nested-branch
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
	const trimmed = url.trim();
	if (!trimmed) return null;

	const match = trimmed.match(GITHUB_URL_REGEX);
	if (!match) return null;

	const [, owner, repo, branch] = match;
	return { owner, repo, branch: branch || undefined };
}

/**
 * Check if a string looks like a GitHub repository URL.
 */
export function isGitHubUrl(url: string): boolean {
	return parseGitHubUrl(url) !== null;
}
