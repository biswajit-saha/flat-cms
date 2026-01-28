import BooleanField from './BooleanField.svelte';
import DateField from './DateField.svelte';
import MarkdownField from './MarkdownField.svelte';
import NumberField from './NumberField.svelte';
import TextareaField from './TextareaField.svelte';
import TextField from './TextField.svelte';

export const fieldComponents: Record<string, any> = {
	text: TextField,
	textarea: TextareaField,
	number: NumberField,
	boolean: BooleanField,
	date: DateField,
	markdown: MarkdownField,
	richtext: MarkdownField, // Fallback
	mdx: MarkdownField // Fallback
};

export const defaultFieldComponent = TextField;