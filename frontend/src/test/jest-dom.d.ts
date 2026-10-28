/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
import type matchers from '@testing-library/jest-dom/matchers';

// jest-dom's own augmentation targets the hoisted vitest copy (the API's), not the one the frontend resolves.
declare module 'vitest' {
  interface Assertion<T = any> extends matchers.TestingLibraryMatchers<any, T> {}
}
