// Mock environment variables
process.env = {
  ...process.env,
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/beautyflow_test',
}

// Mock global fetch if needed
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn()
}