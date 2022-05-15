<script>
	import '../styles/global.css';
</script>

<svelte:head><title>Sint Lucas Masters</title></svelte:head>

<div id="wrapper">
	<header>
		<h1><a href="/">Sint Lucas Masters</a></h1>
		<nav><a href="/about">About</a></nav>
	</header>
	<main>
		<slot />
	</main>
	<footer>
		<a href="https://www.sintlucasantwerpen.be/">Sint Lucas Antwerpen</a>
	</footer>
</div>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #111827;
		color: #f3f4f6;
		padding: 1rem 2rem;
	}

	header h1 {
		font-size: 1rem;
	}

	header h1 a {
		text-decoration: none;
	}

	main {
		padding: 1rem 2rem;
		min-height: 100vh;
	}

	footer {
		padding: 1rem 2rem;
		font-size: 0.8rem;
		color: #374151;
	}
</style>
