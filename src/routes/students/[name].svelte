<script>
	export let body;
	export let attributes;
	import { marked } from 'marked';
</script>

<svelte:head>
	<title>{attributes.student_name} — {attributes.project_title} | Sint Lucas Masters</title>
</svelte:head>

<h2>{attributes.student_name} — {attributes.project_title}</h2>
<p class="year">{attributes.year}</p>

<img src={attributes.main_image} alt={attributes.project_title} />

<article>
	{@html marked.parse(body)}
</article>

{#if attributes.images}
	{#each attributes.images as image}
		<img src={image} alt={attributes.project_title} />
	{/each}
{/if}

<style>
	article {
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	p {
		margin-bottom: 1rem;
	}

	.year {
		font-size: 0.8rem;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}
</style>
