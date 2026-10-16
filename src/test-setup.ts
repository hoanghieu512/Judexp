import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Explicit imports mean vitest globals are off, so auto-cleanup never
// registers itself. Without this every render stacks onto the previous
// test's DOM and queries start finding two of everything.
afterEach(cleanup);
