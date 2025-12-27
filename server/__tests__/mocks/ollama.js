// Mock Ollama responses for testing

export const mockSuccessResponse = {
  success: true,
  response: 'note',
};

export const mockErrorResponse = {
  success: false,
  error: 'Connection refused',
};

export const mockCategoryResponses = {
  note: { success: true, response: 'note' },
  invoice: { success: true, response: 'invoice' },
  screenshot: { success: true, response: 'screenshot' },
  photo: { success: true, response: 'photo' },
  meeting_notes: { success: true, response: 'meeting_notes' },
};

export const mockFilenameResponses = {
  note: { success: true, response: 'note_project-ideas_2024-12-15.txt' },
  invoice: { success: true, response: 'inv_amazon_echo-dot_29-99_2024-12-15.pdf' },
  screenshot: { success: true, response: 'ss_github_pull-request_2024-12-15_1430.png' },
};

let currentMockCategory = 'note';
let shouldFail = false;
let customResponse = null;

export const setMockCategory = (category) => {
  currentMockCategory = category;
};

export const setMockFailure = (fail) => {
  shouldFail = fail;
};

export const setCustomResponse = (response) => {
  customResponse = response;
};

export const resetMocks = () => {
  currentMockCategory = 'note';
  shouldFail = false;
  customResponse = null;
};

export const createMockGenerateText = () => jest.fn(async (prompt) => {
  if (shouldFail) {
    return mockErrorResponse;
  }
  if (customResponse) {
    return { success: true, response: customResponse };
  }
  // Detect if this is a categorization or naming prompt
  if (prompt.includes('You are a file categorizer') || prompt.includes('Category:')) {
    return mockCategoryResponses[currentMockCategory] || mockSuccessResponse;
  }
  // Return filename response
  return mockFilenameResponses[currentMockCategory] || {
    success: true,
    response: `${currentMockCategory}_generated-file_2024-12-15.txt`,
  };
});

export const createMockGenerateWithVision = () => jest.fn(async (prompt, images) => {
  if (shouldFail) {
    return mockErrorResponse;
  }
  if (customResponse) {
    return { success: true, response: customResponse };
  }
  // Same logic as generateText
  if (prompt.includes('You are a file categorizer') || prompt.includes('Category:')) {
    return mockCategoryResponses[currentMockCategory] || mockSuccessResponse;
  }
  return mockFilenameResponses[currentMockCategory] || {
    success: true,
    response: `${currentMockCategory}_generated-file_2024-12-15.png`,
  };
});
