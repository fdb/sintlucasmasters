<script>
	export let students;
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

{#each students as student}
	<div class="student">
		<a href={`/students/${student.student_name.toLowerCase().replace(' ', '-')}`}>
			{student.student_name} — {student.project_title}</a
		>
	</div>
{/each}
