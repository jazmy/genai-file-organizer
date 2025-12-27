// Mock database operations for testing

export const mockPrompts = {
  _categorization: {
    id: 1,
    category: '_categorization',
    prompt: 'You are a file categorizer. Analyze the file and respond with ONLY ONE category.',
    description: null,
    is_default: 1,
  },
  note: {
    id: 2,
    category: 'note',
    prompt: 'Generate a filename for this NOTE.\n\nFORMAT: note_[topic]_[date].ext',
    description: 'quick notes, personal notes, jottings, reminders',
    is_default: 1,
  },
  invoice: {
    id: 3,
    category: 'invoice',
    prompt: 'Generate a filename for this INVOICE/RECEIPT/ORDER.',
    description: 'receipts, orders, invoices, bills',
    is_default: 1,
  },
  screenshot: {
    id: 4,
    category: 'screenshot',
    prompt: 'Generate a filename for this SCREENSHOT.',
    description: 'screenshots of apps, websites, UI',
    is_default: 1,
  },
};

export const mockSettings = {
  'ollama.host': 'http://127.0.0.1:11434',
  'ollama.model': 'qwen3-vl:8b',
  'folders.enabled': 'false',
};

export const mockAILogs = [];
export const mockAPILogs = [];
export const mockErrorLogs = [];

export const createMockDbOperations = () => ({
  // Prompt operations
  getAllPrompts: jest.fn(() => Object.values(mockPrompts)),
  getPromptByCategory: jest.fn((category) => mockPrompts[category] || null),
  updatePrompt: jest.fn(),
  resetPromptToDefault: jest.fn(() => true),
  getDefaultPrompt: jest.fn((category) => mockPrompts[category]?.prompt || null),

  // Settings operations
  getSetting: jest.fn((key) => mockSettings[key] || null),
  getAllSettings: jest.fn(() => mockSettings),
  setSetting: jest.fn(),

  // AI Log operations
  createAILog: jest.fn((requestId, fileInfo, batchId) => {
    mockAILogs.push({ requestId, fileInfo, batchId, status: 'pending' });
    return requestId;
  }),
  updateAILogCategorization: jest.fn(),
  updateAILogNaming: jest.fn(),
  completeAILog: jest.fn(),
  recordAILogFeedback: jest.fn(),
  getAILogs: jest.fn(() => mockAILogs),
  getAILogById: jest.fn((id) => mockAILogs.find(l => l.requestId === id)),
  getAILogsCount: jest.fn(() => mockAILogs.length),

  // API Log operations
  createAPILog: jest.fn((logData) => {
    mockAPILogs.push(logData);
    return logData.requestId;
  }),
  getAPILogs: jest.fn(() => mockAPILogs),
  getAPILogsCount: jest.fn(() => mockAPILogs.length),

  // Error Log operations
  createErrorLog: jest.fn((errorData) => {
    mockErrorLogs.push(errorData);
    return errorData.errorId;
  }),
  getErrorLogs: jest.fn(() => mockErrorLogs),
  resolveError: jest.fn(),

  // Stats operations
  getLogStats: jest.fn(() => ({
    ai: { total: 10, successful: 8, failed: 2, avgResponseTime: 1500 },
    api: { total: 100, successful: 95, avgResponseTime: 50 },
    errors: { total: 5, unresolved: 2 },
    timeRange: 'all',
  })),
  getPromptEffectiveness: jest.fn(() => [
    { detected_category: 'note', total_suggestions: 50, accepted: 40, acceptance_rate: 80 },
    { detected_category: 'invoice', total_suggestions: 30, accepted: 20, acceptance_rate: 66.7 },
  ]),

  // File operations
  saveProcessedFile: jest.fn(() => 1),
  updateProcessedFile: jest.fn(),
  markFileApplied: jest.fn(),
  getProcessedFile: jest.fn(),
  getPendingFiles: jest.fn(() => []),

  // Cleanup
  close: jest.fn(),
});

export const resetMocks = () => {
  mockAILogs.length = 0;
  mockAPILogs.length = 0;
  mockErrorLogs.length = 0;
};
