import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ponytail: base './' 로 두면 GitHub Pages 하위 경로에서도 그대로 동작한다.
export default defineConfig({
  base: './',
  plugins: [react()],
})
