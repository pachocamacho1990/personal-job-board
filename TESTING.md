# Testing Strategy

The project uses a hybrid testing strategy: **Automated Backend Tests** for logic/security and **Manual verification** for UI flows.

## 1. Automated Backend Tests (Jest)

The API is fully tested using `jest` and `supertest`.

### Running Tests
```bash
cd server
npm test
```

### Coverage
The suite (`server/tests/api.test.js`) covers:
- **Authentication**: Signup, Login, Duplicate emails, Invalid passwords.
- **Authorization**: Accessing protected routes without tokens.
- **CRUD Operations**: Creating, Reading, Updating, and Deleting jobs.
- **Data Isolation**: Verifying User A cannot interact with User B's data.
- **Timestamps**: Verifying auto-update behavior.

## 2. Manual Verification (Acceptance Testing)

Since the frontend is a Vanilla JS SPA, visual verification is the most effective testing method.

### Test Checklist

#### Authentication
- [ ] Try accessing `index.html` without login -> Redirect to Login
- [ ] Signup with new user -> Success
- [ ] Login with wrong password -> Error message
- [ ] Logout -> Redirect to Login

#### Persistence
- [ ] Create a job -> Refresh page -> Job persists
- [ ] Stop Docker containers (`docker-compose stop`) -> Start them -> Data persists

#### User Isolation (Security)
- [ ] Create User A -> Add "Job A"
- [ ] Open Incognito -> Create User B -> Verify "Job A" is NOT visible

#### UI Features
- [ ] **View Toggle**: Switch to Compact view -> Refresh -> Remains Compact.
- [ ] **Stars**: Sorting works (5 stars -> 1 star).
- [ ] **Drag & Drop**: Moving card updates column status.

## 3. Legacy Unit Tests
*Note: `tests.js` contains legacy unit tests for the old architecture. They are kept for reference but are superseded by the Backend Integration tests.*
