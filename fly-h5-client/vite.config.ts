import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import os from 'os'

// 获取局域网 IP
function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部 IP 和 IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

const localIP = getLocalIP()

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',      // 绑定所有网络接口
    port: 3000,
    strictPort: false,    // 端口被占用时自动换端口
    proxy: {
      '/api': {
        target: `http://${localIP}:8080`,  // 使用真实 IP，支持局域网访问
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://${localIP}:8080`,    // WebSocket 也使用真实 IP
        ws: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
