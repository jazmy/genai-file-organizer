// Jest setup file for GenOrganize Server tests

// Mock console.error to suppress noisy output during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress expected errors during tests
    if (args[0]?.includes?.('Expected error')) {
      return;
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
});
