import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'hero-unity'
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string }

export default defineConfig({
  plugins: [react()],
  base: isGitHubPages ? `/${repoName}/` : '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
