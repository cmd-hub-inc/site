import { normalizeServerErrorPayload } from '../api_handlers/_lib/errorResponses.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const fourHundredInput = { error: 'Bad request', detail: 'x' };
  const fourHundredOutput = normalizeServerErrorPayload(400, fourHundredInput);
  assert(
    fourHundredOutput.error === 'Bad request',
    '400 responses should preserve original error message',
  );

  const fiveHundredInput = { error: 'Detailed internal error', code: 'E_INTERNAL' };
  const fiveHundredOutput = normalizeServerErrorPayload(500, fiveHundredInput);
  assert(fiveHundredOutput.error === 'Server error', '500 responses must be normalized');
  assert(
    fiveHundredOutput.code === 'E_INTERNAL',
    '500 normalization should preserve non-error fields',
  );

  const fiveHundredWithoutError = { message: 'no error key' };
  const unchanged = normalizeServerErrorPayload(500, fiveHundredWithoutError);
  assert(
    unchanged.message === 'no error key',
    'Payloads without an error key should not be modified',
  );

  const arrayPayload = ['oops'];
  const arrayUnchanged = normalizeServerErrorPayload(500, arrayPayload);
  assert(Array.isArray(arrayUnchanged), 'Array payloads should not be modified');

  console.log('errorResponses guard tests passed');
}

run();
