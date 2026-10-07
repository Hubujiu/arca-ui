import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
 testDir: './tests/weaveos', timeout: 20000, expect: { timeout: 5000 }, fullyParallel: true, workers: 2,
 reporter: [['list'], ['json', { outputFile: 'test-results/weaveos.json' }]],
 use: { baseURL: 'http://127.0.0.1:5189', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
 projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, launchOptions: { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } } }],
 webServer: { command: 'npm run dev:weaveos', url: 'http://127.0.0.1:5189/weaveos.html', reuseExistingServer: !process.env.CI }
})
