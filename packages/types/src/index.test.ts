// @platform/types — Unit test
// Uses Node.js built-in test runner (node:test)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import from the compiled output
import {
  isApiError,
} from './index.js';

describe('@platform/types', () => {
  describe('isApiError', () => {
    it('returns true for error response', () => {
      const errorResponse = {
        error: { code: 'NOT_FOUND', message: 'Not found' },
        meta: { requestId: '123' },
      };
      assert.equal(isApiError(errorResponse), true);
    });

    it('returns false for success response', () => {
      const successResponse = {
        data: { id: '1' },
        meta: { requestId: '123' },
      };
      assert.equal(isApiError(successResponse), false);
    });
  });

  describe('type exports', () => {
    it('module exports are defined', async () => {
      const mod = await import('./index.js');
      assert.ok(mod, 'module should be importable');
      assert.ok(typeof mod.isApiError === 'function', 'isApiError should be exported');
    });
  });
});
