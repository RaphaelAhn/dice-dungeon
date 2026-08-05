import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ponytail: base './' 로 두면 GitHub Pages 하위 경로에서도 그대로 동작한다.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // ⚠ 임시. 상함·타 버림을 눌러서 확인하기 위한 데모 페이지다.
        //   확인이 끝나면 이 줄과 _demo.html, _demo.tsx 를 함께 지운다.
        demo: resolve(__dirname, '_demo.html'),
      },
    },
  },
})
