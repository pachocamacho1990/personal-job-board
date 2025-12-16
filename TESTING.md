# Testing Guide

## Running Tests

```bash
node tests.js
```

## Test Coverage (13 tests)

### 1. CRUD Operations (5 tests)
- **Create**: Adds job to array with defaults
- **Read**: Finds job by ID  
- **Update**: Modifies existing job
- **Delete**: Removes job from array

### 2. State Management (2 tests)
- **Opening**: Sets `currentJobId`
- **Closing**: Clears `currentJobId`

### 3. Form Submission (3 tests)
- **Create**: When `currentJobId` is null
- **Update**: When `currentJobId` is set
- **Critical Bug**: view→close→add workflow creates new job (doesn't overwrite)

### 4. Persistence (3 tests)
- **Save**: Persists to localStorage
- **Load**: Restores from localStorage  
- **Migration**: Handles old data without type/rating fields

## Design Philosophy

**Simple, not exhaustive**: Tests cover core behaviors needed for confidence, not every edge case.

**One assertion per concept**: Each test validates one clear behavior.

**Minimal mocking**: Only mocks DOM elements actually used by tested functions.

**Fast feedback**: All tests run in <100ms.

## What's NOT Tested

- UI rendering (hard to mock, easy to verify visually)
- Drag-and-drop (integration test territory)
- Event listener binding (covered by manual testing)
- Browser-specific behavior (use browser's dev tools)

## Why 13 Tests?

The original 23-test suite had redundancies:
- **Removed**: Tests that checked same behavior from different angles (e.g., "createJob generates unique ID" + "createJob adds to array")
- **Combined**: Related assertions into single tests
- **Eliminated**: Overly detailed state checks that repeated basic behavior

**Result**: 43% fewer tests, same critical coverage.
