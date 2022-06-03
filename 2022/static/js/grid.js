let g_width, g_height, g_scene, g_camera, g_renderer, g_settings, g_gui;

g_settings = {
	progress: 0
};

const vertexShader = `
uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec2 uQuadSize;

varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vSize;

void main() {
    vUv = uv;
    vec4 thumbState = modelMatrix * vec4(position, 1.0);
    vec4 fullState = vec4(position, 1.0);
    // fullState.x *= uQuadSize.x;
    // fullState.y *= uQuadSize.y;
    fullState.x *= uResolution.x;
    fullState.y *= uResolution.y;
    vec4 finalState = mix(thumbState, fullState, uProgress);
    gl_Position = projectionMatrix * viewMatrix * finalState;
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uProgress;
uniform sampler2D uTexture;

varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vSize;

void main() {
    vec4 image = texture2D(uTexture, vUv);
    gl_FragColor = image;
}
`;

function setup() {
	g_container = document.querySelector('.webgl-container');
	g_width = g_container.offsetWidth;
	g_height = g_container.offsetHeight;
	console.log(g_width, g_height);
	g_scene = new THREE.Scene();
	g_camera = new THREE.PerspectiveCamera(75, g_width / g_height, 0.1, 1000);
	g_camera.position.z = 30;
	g_renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
	g_renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	g_renderer.setSize(g_width, g_height);

	g_container.appendChild(g_renderer.domElement);

	if (document.location.hash === '#debug') {
		g_gui = new lil.GUI();
		g_gui.add(g_settings, 'progress', 0, 1, 0.001);
	}

	syncImages();
	onResize();

	animate();
}

function createShaderMaterial(texture) {
	const uniforms = {
		uTime: { value: 1.0 },
		uProgress: { value: 0.0 },
		uCorners: { value: new THREE.Vector4(0, 0, 0, 0) },
		uTexture: { value: new THREE.TextureLoader().load(texture) },
		uTextureSize: { value: new THREE.Vector2(100, 100) },
		uResolution: { value: new THREE.Vector2(g_width, g_height) },
		uQuadSize: { value: new THREE.Vector2(300, 300) } // Size of the plane
	};
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader,
		fragmentShader,
		wireframe: false
	});
	return material;
}

function syncImages() {
	// Get all project images on the page.
	const images = document.querySelectorAll('.students-grid img');
	for (const image of images) {
		const bounds = image.getBoundingClientRect();
		image._x = bounds.left + bounds.width / 2 - g_width / 2;
		image._y = -(bounds.top + bounds.height / 2) + g_height / 2 - window.scrollY;

		if (!image._mesh) {
			const texture = new THREE.TextureLoader().load(image.src);
			const geometry = new THREE.PlaneBufferGeometry(1, 1, 30, 30);
			const material = createShaderMaterial(image.src);
			const plane = new THREE.Mesh(geometry, material);
			plane.scale.set(300, 300, 1);
			g_scene.add(plane);
			image._mesh = plane;
		}

		image._mesh.position.set(image._x, image._y + window.scrollY, 0);

		// plane.position.set(image._x, image._y, 0);
		// plane.scale.set(300, 300, 1);
		// g_scene.add(plane);
		// image._mesh = plane;
	}
}

function onScroll() {
	const images = document.querySelectorAll('.students-grid img');
	for (const image of images) {
		// console.log(image._mesh.position);
		if (!image._mesh) continue;
		// const bounds = image.getBoundingClientRect();
		image._mesh.position.set(image._x, image._y + window.scrollY, 0);
	}
}

function animate() {
	requestAnimationFrame(animate);
	const images = document.querySelectorAll('.students-grid img');
	for (const image of images) {
		if (!image._mesh) continue;
		image._mesh.material.uniforms.uProgress.value = g_settings.progress;
	}
	g_renderer.render(g_scene, g_camera);
}

function onResize() {
	g_width = g_container.offsetWidth;
	g_height = g_container.offsetHeight;
	g_renderer.setSize(g_width, g_height);

	// Set up camera so the THREE dimensions match the screen.
	g_camera.aspect = g_width / g_height;
	g_camera.fov = (Math.atan(g_height / 2 / g_camera.position.z) * 2 * 180) / Math.PI;
	g_camera.updateProjectionMatrix();

	syncImages();
}

setup();
// animate();
window.addEventListener('resize', onResize);
window.addEventListener('scroll', onScroll);
