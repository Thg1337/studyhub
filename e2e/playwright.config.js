import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4186' },
  projects: [
    { name: 'Chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Firefox', use: { ...devices['Desktop Firefox'] } }
  ],
  webServer: {
    command: 'npm --prefix .. run preview -- --host 127.0.0.1 --port 4186 --strictPort',
    url: 'http://127.0.0.1:4186',
    reuseExistingServer: false
  }
})
