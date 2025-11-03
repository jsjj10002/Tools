import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 각 테스트 후 cleanup
afterEach(() => {
  cleanup();
});

// 커스텀 matcher나 전역 설정 추가 가능
// 예: expect.extend({ ... });
