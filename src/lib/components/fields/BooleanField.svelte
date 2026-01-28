<script lang="ts">
	let { 
	value = $bindable(''), 
	label, 
	required = false 
	} = $props();
</script>

<div class="form-control">
	<label class="label cursor-pointer flex justify-between items-center">
		<span class="label-text font-medium text-neutral-800 dark:text-neutral-200">
			{label}{#if required}<span class="text-red-500 ml-1">*</span>{/if}
		</span>
		<input
			type="checkbox"
			bind:checked={value}
			class="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500"
			on:change />
	</label>
</div>