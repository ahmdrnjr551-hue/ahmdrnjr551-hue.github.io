import {defineConfig} from 'vitest/config';
export default defineConfig({test: {include: ['tests/unit/**/*.test.ts'], maxWorkers: 1, reporters: ['default', 'json'], outputFile: {json: 'reports/unit-results.json'}}});
