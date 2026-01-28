<script lang="ts">
	let { 
	value = $bindable(''), 
	label, 
	required = false 
	} = $props();
</script>

<div class="form-control w-full">
	<label class="label" for={label}>
		<span class="label-text font-medium text-neutral-800 dark:text-neutral-200">
			{label}{#if required}<span class="text-red-500 ml-1">*</span>{/if}
		</span>
	</label>
	<input
		type="number"
		id={label}
		bind:value
		class="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
		on:input />
</div>