import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages project site: https://<user>.github.io/RandomEpisodeSuggester/
export default defineConfig({
  base: '/RandomEpisodeSuggester/',
  plugins: [svelte(), tailwindcss()]
});
