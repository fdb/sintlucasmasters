import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
	root: __dirname,
	plugins: [react()],
	base: '/admin/',
	build: {
		outDir: resolve(__dirname, '../static/admin'),
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		proxy: {
			'/api': 'http://localhost:8787',
			'/auth': 'http://localhost:8787',
		},
	},
});
