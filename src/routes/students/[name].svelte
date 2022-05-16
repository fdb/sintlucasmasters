<script>
	export let body;
	export let attributes;
	import { marked } from 'marked';
</script>

<svelte:head>
	<title>{attributes.student_name} — {attributes.project_title} | Sint Lucas Masters</title>
</svelte:head>

<div class="meta">
	<h2>{attributes.student_name} — {attributes.project_title}</h2>
	<p class="year">{attributes.year}</p>
</div>

<div class="full-width">
	<img class="main-image" src={attributes.main_image} alt={attributes.project_title} />
</div>

<article>
	{@html marked.parse(body)}
</article>

{#if attributes.images}
	{#each attributes.images as image}
		<img class="image" src={image} alt={attributes.project_title} />
	{/each}
{/if}

<style>
	.meta {
		margin-top: 2rem;
		margin-bottom: 4rem;
	}
	.full-width {
		margin-left: calc(-50vw + 50%);
		margin-right: calc(-50vw + 50%);
	}
	.main-image {
		max-height: 80vh;
		width: 100%;
		object-fit: contain;
	}
	article {
		max-width: 80ch;
		margin: 5rem auto;
	}
	p {
		margin-bottom: 1rem;
	}

	.year {
		font-size: 0.8rem;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.image {
		display: block;
		margin: 4rem auto;
	}
</style>
