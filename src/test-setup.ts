import { vi } from 'vitest';

// The first test in a file pays for compiling and rendering its component
// tree (PrimeNG dialogs, forms). With every worker busy that can pass Vitest's
// 5 second default, failing a correct test, so each test gets 15 seconds.
vi.setConfig({ testTimeout: 15_000 });
