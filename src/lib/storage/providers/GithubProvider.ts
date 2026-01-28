import { StorageProvider, type FlatCMSConfig } from '../../types/storage';
import { Octokit } from '@octokit/core';
import { parseFile, stringifyFile } from '../../utils/parser';

/**
 * UTF-8 safe Base64 helpers (replacing js-base64)64
 */
const toBase64 = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
const fromBase64 = (str: string) => decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

export class GithubProvider extends StorageProvider {
    private octokit: Octokit;

    constructor(config: FlatCMSConfig) {
        super('github', config);
        if (!config.github?.token) throw new Error("GitHub configuration missing.");
        this.octokit = new Octokit({ auth: config.github.token });
    }

    private get gh() {
        const { owner, repo, branch } = this.config.github!;
        return { owner, repo, branch };
    }

    async hasAccess(): Promise<boolean> {
        return !!this.config.github?.token;
    }

    async listEntries(folder: string, extension: string, format: 'frontmatter' | 'json'): Promise<any[]> {
        const { owner, repo, branch } = this.gh;
        try {
            const res = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner, repo, path: folder, ref: branch
            });

            if (!Array.isArray(res.data)) return [];

            // We fetch individual contents to get the frontmatter
            const promises = res.data
                .filter(file => file.type === 'file' && file.name.endsWith(`.${extension}`))
                .map(file => this.getEntry(folder, file.name.replace(`.${extension}`, ''), extension, format));
            
            return Promise.all(promises);
        } catch (e: any) {
            return e.status === 404 ? [] : Promise.reject(e);
        }
    }

    async getEntry(folder: string, id: string, extension: string, format: 'frontmatter' | 'json'): Promise<any> {
        const { owner, repo, branch } = this.gh;
        const res = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner, repo, path: `${folder}/${id}.${extension}`, ref: branch
        });

        // @ts-ignore
        const content = fromBase64(res.data.content);
        const data = parseFile(content, format);
        return { ...data, id };
    }

    async saveEntry(folder: string, id: string, data: any, extension: string, format: 'frontmatter' | 'json'): Promise<void> {
        const { owner, repo, branch: mainBranch } = this.gh;
        const filePath = `${folder}/${id}.${extension}`;
        
        const fileContent = stringifyFile(data, format);

        // editorial_mode logic
        const editorialMode = this.config.editorial_mode;
        const targetBranch = editorialMode ? `cms/${id}-${Date.now()}` : mainBranch;

        // 1. If Editorial Mode, create a new branch from the main branch
        if (editorialMode) {
            const { data: ref } = await this.octokit.request('GET /repos/{owner}/{repo}/git/ref/heads/{branch}', {
                owner, repo, branch: mainBranch
            });
            await this.octokit.request('POST /repos/{owner}/{repo}/git/refs', {
                owner, repo, ref: `refs/heads/${targetBranch}`, sha: ref.object.sha
            });
        }

        // 2. Get existing file SHA (if any) to update
        let sha: string | undefined;
        try {
            const { data: existing } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner, repo, path: filePath, ref: targetBranch
            });
            // @ts-ignore
            sha = existing.sha;
        } catch (e) {}

        // 3. Commit file to target branch
        await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner, repo, path: filePath,
            message: `content: update ${id}`,
            content: toBase64(fileContent),
            branch: targetBranch,
            sha
        });

        // 4. Create Pull Request if in Editorial Mode
        if (editorialMode) {
            await this.octokit.request('POST /repos/{owner}/{repo}/pulls', {
                owner, repo,
                title: `CMS: Edit ${id}`,
                head: targetBranch,
                base: mainBranch,
                body: `Changes made via Flat CMS.`
            });
        }
    }

    async deleteEntry(folder: string, id: string, extension: string): Promise<void> {
        const { owner, repo, branch } = this.gh;
        const path = `${folder}/${id}.${extension}`;
        const { data: file } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner, repo, path, ref: branch
        });
        // @ts-ignore
        await this.octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
            owner, repo, path,
            // @ts-ignore
            sha: file.sha,
            message: `content: delete ${id}`,
            branch
        });
    }
}