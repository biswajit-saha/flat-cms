import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/**
 * Parses raw file content into a JavaScript object based on the specified format.
 * @param content The raw string from the file system.
 * @param format 'json' for pure objects, 'frontmatter' for MD/MDX files.
 */
export function parseFile(content: string, format: 'frontmatter' | 'json'): any {
    if (format === 'json') {
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse JSON content", e);
            return {};
        }
    }

    if (format === 'frontmatter') {
        // Regex to split YAML frontmatter from Markdown body
        // Matches content between the first set of --- ---
        const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)/);
        
        if (match) {
            try {
                const frontmatter = parseYaml(match[1]) || {};
                const body = match[2] || '';
                // Combine frontmatter fields with the body content
                return { ...frontmatter, content: body };
            } catch (e) {
                console.error("Failed to parse YAML frontmatter", e);
                return { content: content };
            }
        }
        
        // Fallback if no frontmatter delimiters are found
        return { content: content };
    }

    throw new Error(`Unsupported format: ${format}`);
}

/**
 * Converts a JavaScript object back into a string format for saving.
 * @param data The object containing fields and content.
 * @param format 'json' or 'frontmatter'.
 */
export function stringifyFile(data: any, format: 'frontmatter' | 'json'): string {
    if (format === 'json') {
        // Save as pretty-printed JSON
        return JSON.stringify(data, null, 2);
    }

    if (format === 'frontmatter') {
        // Destructure data to separate the body ('content') and internal metadata ('id')
        // from the fields we want to save in the YAML block.
        const { content, id, ...frontmatter } = data;
        
        // Convert the frontmatter object back to YAML
        const yamlBlock = stringifyYaml(frontmatter).trim();
        
        // Construct the final file string
        // We ensure a double newline after the closing --- for clean Markdown parsing
        return `---\n${yamlBlock}\n---\n\n${content || ''}`;
    }

    throw new Error(`Unsupported format: ${format}`);
}