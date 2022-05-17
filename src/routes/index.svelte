<script>
	import Artboard from '../components/artboard.svelte';
	export let students;
</script>

<Artboard {students} />

<ul class="student-list-invisible">
	{#each students as student}
		<li>
			<a href={`/students/${student.slug}`}>
				<h3>{student.student_name}</h3>
				<p>{student.project_title}</p>
			</a>
		</li>
	{/each}
</ul>

<style>
	.student-list-invisible {
		display: none;
	}
</style>
