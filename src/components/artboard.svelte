<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as THREE from 'three';
	import anime from 'animejs/lib/anime';

	const STATE_GRID = 'grid';
	const STATE_DETAIL = 'detail';

	const LAYOUT_RANDOM = 'random';
	const LAYOUT_LINE = 'line';

	const ANIMATION_DURATION = 400;
	const ANIMATION_EASING = 'easeOutCubic';

	const CAMERA_INITIAL_Z = 5;

	export let students;
	let canvas, scene, camera, renderer, thumbnailsGroup;
	let mouse = new THREE.Vector2();
	let widthScale = 5;
	let heightScale = 4;
	let depthScale = 5;
	let currentState = STATE_GRID;
	let currentLayout = LAYOUT_RANDOM;
	let activePlane;
	let activeStudent;

	onMount(() => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff);
		camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
		camera.position.z = CAMERA_INITIAL_Z;

		renderer = new THREE.WebGLRenderer({ canvas });
		renderer.setSize(canvas.width, canvas.height);
		renderer.render(scene, camera);

		thumbnailsGroup = new THREE.Group();
		scene.add(thumbnailsGroup);
		const planeGeo = new THREE.PlaneBufferGeometry(1, 1);
		const textureLoader = new THREE.TextureLoader();
		for (const student of students) {
			const imageUrl = student.main_image + '-/scale_crop/500x500/';
			const texture = textureLoader.load(imageUrl);
			const material = new THREE.MeshBasicMaterial({ map: texture });
			const plane = new THREE.Mesh(planeGeo, material);
			plane.position.x = THREE.MathUtils.randFloatSpread(widthScale);
			plane.position.y = THREE.MathUtils.randFloatSpread(heightScale);
			plane.position.z = THREE.MathUtils.randFloatSpread(depthScale);
			plane.student = student;
			plane.name = student.student_name;
			thumbnailsGroup.add(plane);
		}

		window.addEventListener('resize', resize);
		requestAnimationFrame(animate);
		return () => {
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(animate);
		};
	});

	const animate = () => {
		let targetX, targetY;
		if (currentLayout === LAYOUT_RANDOM) {
			targetX = mouse.x * 0.2;
			targetY = mouse.y * 0.2;
		} else if (currentLayout === LAYOUT_LINE) {
			targetX = 1.5 + mouse.x * 0.2;
			targetY = 1.5 + mouse.y * 0.2;
		}
		camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.1);
		camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
		camera.lookAt(scene.position);
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	};

	const resize = () => {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		renderer.setSize(canvas.width, canvas.height);
		camera.aspect = canvas.width / canvas.height;
		camera.updateProjectionMatrix();
	};

	const onClick = (e) => {
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		mouse.x = (e.clientX / canvas.width) * 2 - 1;
		mouse.y = -(e.clientY / canvas.height) * 2 + 1;
		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(thumbnailsGroup.children);
		if (intersects.length > 0) {
			const { object } = intersects[0];
			if (currentState === STATE_DETAIL) {
				// Zoom out
				zoomOut();
				if (object !== activePlane) {
					zoomIntoPlane(object);
				}
			} else {
				zoomIntoPlane(object);
			}
		} else {
			if (currentState === STATE_DETAIL) {
				zoomOut();
			}
		}
	};

	const onWheel = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (currentState === STATE_DETAIL) {
			zoomOut();
		}
		if (e.deltaY < 0) {
			anime({
				targets: camera.position,
				z: THREE.MathUtils.clamp(camera.position.z * 0.8, 0, 10),
				duration: 200,
				easing: 'easeOutQuad'
			});
		} else {
			anime({
				targets: camera.position,
				z: THREE.MathUtils.clamp(camera.position.z * 1.2, 0, 10),
				duration: 200,
				easing: 'easeOutQuad'
			});
		}
	};

	const onMouseMove = (e) => {
		mouse.x = (e.clientX / canvas.width) * 2 - 1;
		mouse.y = -(e.clientY / canvas.height) * 2 + 1;
	};

	const zoomIntoPlane = (object) => {
		currentState = STATE_DETAIL;
		activePlane = object;
		activeStudent = object.student;
		object.oldPosition = object.position.clone();
		if (currentLayout === LAYOUT_RANDOM) {
			anime({
				targets: object.position,
				x: 0,
				y: 0,
				z: camera.position.z - 1,
				duration: ANIMATION_DURATION,
				easing: ANIMATION_EASING
			});
		} else if (currentLayout === LAYOUT_LINE) {
			anime({
				targets: object.position,
				x: 1.5,
				y: 1.5,
				duration: ANIMATION_DURATION,
				easing: ANIMATION_EASING
			});
		}
	};

	const zoomOut = () => {
		currentState = STATE_GRID;
		activeStudent = null;
		anime({
			targets: activePlane.position,
			x: activePlane.oldPosition.x,
			y: activePlane.oldPosition.y,
			z: activePlane.oldPosition.z,
			duration: ANIMATION_DURATION,
			easing: ANIMATION_EASING
		});
	};

	const shuffleImages = () => {
		currentState = STATE_GRID;
		if (currentLayout === LAYOUT_RANDOM) {
			for (const plane of thumbnailsGroup.children) {
				anime({
					targets: plane.position,
					x: THREE.MathUtils.randFloatSpread(widthScale),
					y: THREE.MathUtils.randFloatSpread(heightScale),
					z: THREE.MathUtils.randFloatSpread(depthScale),
					duration: ANIMATION_DURATION,
					easing: ANIMATION_EASING
				});
				// plane.position.x = THREE.MathUtils.randFloatSpread(widthScale);
				// plane.position.y = THREE.MathUtils.randFloatSpread(heightScale);
				// plane.position.z = THREE.MathUtils.randFloatSpread(depthScale);
			}
		} else if (currentLayout === LAYOUT_LINE) {
			let z = camera.position.z - 1;
			for (const plane of thumbnailsGroup.children) {
				anime({
					targets: plane.position,
					x: 0,
					y: 0,
					z: z,
					duration: ANIMATION_DURATION,
					easing: ANIMATION_EASING
				});
				z -= 0.3;
				// plane.position.x = THREE.MathUtils.randFloatSpread(widthScale);
				// plane.position.y = THREE.MathUtils.randFloatSpread(heightScale);
				// plane.position.z = THREE.MathUtils.randFloatSpread(depthScale);
			}
		}
	};

	const setLayout = (layout) => {
		currentLayout = layout;
		activeStudent = null;
		if (currentLayout === LAYOUT_RANDOM) {
			shuffleImages();
			anime({
				targets: camera.position,
				x: 0,
				y: 0,
				z: CAMERA_INITIAL_Z,
				duration: ANIMATION_DURATION * 2,
				easing: ANIMATION_EASING,
				update: function (anim) {
					camera.lookAt(scene.position);
				}
			});
		} else if (currentLayout === LAYOUT_LINE) {
			shuffleImages();

			anime({
				targets: camera.position,
				x: 2,
				y: 2,
				z: CAMERA_INITIAL_Z,
				duration: ANIMATION_DURATION * 2,
				easing: ANIMATION_EASING,
				update: function (anim) {
					camera.lookAt(scene.position);
				}
			});
		}
	};
</script>

<div class="layouts">
	<button on:click={() => setLayout(LAYOUT_RANDOM)}>Random</button>
	<button on:click={() => setLayout(LAYOUT_LINE)}>Line</button>
</div>
<canvas bind:this={canvas} on:click={onClick} on:mousewheel={onWheel} on:mousemove={onMouseMove} />
{#if activeStudent}
	<a href={`/students/${activeStudent.slug}`}>{activeStudent.student_name}</a>
{/if}

<style>
	canvas {
		position: fixed;
		top: 4rem;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 0;
	}
		position: fixed;
		top: 4rem;
		left: 0;
		background: rgb(0 0 0 / 0.2);
		display: inline-block;
		padding: 0.5rem;
		z-index: 10;
	}
	.layouts {
		position: fixed;
		top: 4rem;
		right: 0;
		display: inline-block;
		padding: 0.5rem;
		background: rgb(0 0 0 / 0.2);
		z-index: 10;
	}
</style>
