# Testing Strategy

The project uses a hybrid testing strategy: **Automated Backend Tests** for logic/security and **Manual verification** for UI flows.

## 1. Automated Backend Tests (Jest)

The API is fully tested using `jest` and `supertest`.

### Running Tests
```bash
cd server
npm test
```

### Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `auth.test.js` | 6 | Signup, Login, Duplicate emails, Token validation |
| `jobs.test.js` | 5 | CRUD operations, Data isolation |
| `business.test.js` | 10 | CRUD, Type validation, Ownership checks |
| `dashboard.test.js` | 5 | Summary endpoint, Query validation, Error handling |

**Total: 26 tests**

### Coverage Areas

- **Authentication**: Signup, Login, Duplicate emails, Invalid passwords
- **Authorization**: Accessing protected routes without tokens
- **Jobs CRUD**: Creating, Reading, Updating, and Deleting jobs
- **Business CRUD**: Creating, Reading, Updating, and Deleting entities
- **Validation**: Required fields, Invalid types, Ownership verification
- **Dashboard**: Interview aggregation, AI match filtering
- **Data Isolation**: Verifying User A cannot interact with User B's data
- **Error Handling**: Database errors, Not found responses

## 2. Manual Verification (Acceptance Testing)

Since the frontend is a Vanilla JS SPA, visual verification complements automated tests.

### Test Checklist

#### Authentication
- [ ] Try accessing `/jobboard/index.html` without login → Redirect to Login
- [ ] Signup with new user → Success, redirect to Dashboard
- [ ] Login with wrong password → Error message
- [ ] Logout → Confirmation modal → Redirect to Login

#### Dashboard
- [ ] Dashboard loads after login → Shows widgets
- [ ] Upcoming Interviews widget → Shows jobs with 'interview' status
- [ ] New AI Matches widget → Shows agent-created unseen jobs
- [ ] Click "View" on interview → Opens job details

#### Job Board
- [ ] Navigate to Job Board via sidebar
- [ ] Create a job → Appears in "Interested" column
- [ ] Drag job to "Applied" → Status updates
- [ ] Toggle compact view → Cards shrink, preference persists
- [ ] Edit job → Changes save correctly
- [ ] Delete job → Confirmation, card removed

#### Business Board
- [ ] Navigate to Business Board via sidebar
- [ ] Create entity (Investor/VC/Accelerator/Connection) → Appears correctly
- [ ] Drag entity between columns → Status updates
- [ ] Toggle compact view → Works independently from Job Board
- [ ] Color-coded columns visible (Indigo, Cyan, Violet, Orange, Green)

#### Navigation
- [ ] Sidebar highlights current page
- [ ] All three pages accessible via sidebar
- [ ] User profile visible in sidebar footer

#### Persistence
- [ ] Create items → Refresh page → Items persist
- [ ] Stop Docker containers → Start them → Data persists
- [ ] View preferences persist across sessions

#### User Isolation (Security)
- [ ] Create User A → Add "Job A" and "Entity A"
- [ ] Open Incognito → Create User B
- [ ] Verify "Job A" and "Entity A" are NOT visible to User B

## 3. Browser Testing

For comprehensive UI testing, use the browser subagent or manual testing:

```bash
# Ensure app is running
docker-compose up -d

# Access app
open http://localhost/jobboard/
```

## 4. API Testing (curl)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost/jobboard/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

# Get jobs
curl -H "Authorization: Bearer $TOKEN" http://localhost/jobboard/api/jobs

# Get business entities
curl -H "Authorization: Bearer $TOKEN" http://localhost/jobboard/api/business

# Get dashboard summary
curl -H "Authorization: Bearer $TOKEN" http://localhost/jobboard/api/dashboard/summary
```

## 5. Adding New Tests

When adding new features:

1. Create test file in `server/tests/` following naming convention `*.test.js`
2. Mock database: `jest.mock('../config/db')`
3. Mock auth middleware: `jest.mock('../middleware/auth', () => mockFn)`
4. Use `supertest` for HTTP assertions
5. Run `npm test` to verify all tests pass
