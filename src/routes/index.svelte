<script>
	export let students;
</script>

<div class="grid">
	{#each students as student}
		<div class="student">
			<a href={`/students/${student.student_name.toLowerCase().replace(' ', '-')}`}>
				<img
					src={`${student.main_image}/-/smart_resize/600x600/`}
					alt={student.project_title}
					width="300"
					height="300"
				/>
				<div class="project-title">{student.project_title}</div>
				<div class="student-name">{student.student_name}</div></a
			>
		</div>
	{/each}
</div>

<style>
	.student a {
		text-decoration: none;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		grid-gap: 4rem 1rem;
		text-decoration: none;
	}
	.project-title {
		font-size: 1rem;
		font-weight: bold;
		margin-top: 0.5rem;
	}
	.student-name {
		font-size: 0.8rem;
	}
</style>
