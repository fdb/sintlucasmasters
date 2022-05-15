<script>
	export let body;
	export let attributes;
	import { marked } from 'marked';
</script>

<svelte:head>
	<title>{attributes.student_name} — {attributes.project_title} | Sint Lucas Masters</title>
</svelte:head>

<h2>{attributes.student_name} — {attributes.project_title}</h2>

<img src={attributes.main_image} alt={attributes.project_title} />

{@html marked.parse(body)}

{#each attributes.images as image}
	<img src={image} alt={attributes.project_title} />
{/each}
