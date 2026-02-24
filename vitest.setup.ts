import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Automatically cleanup after each test
afterEach(() => {
  cleanup()
})

// Extend Vitest's expect with React Testing Library's matchers
// (already done via '@testing-library/jest-dom/vitest')