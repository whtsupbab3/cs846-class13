# Backend Test Suite

This test suite ensures all core features of the microblogging application work correctly.

## Features Tested

### 1. ✅ Create User Profile
- `POST /register` - Register new users with username and password
- Validates unique usernames
- Requires both username and password
- Returns user ID and username on success

### 2. ✅ Login to User Profile
- `POST /login` - Authenticate users and receive JWT token
- Validates credentials
- Rejects invalid passwords and non-existent users
- Returns JWT token with 1-hour expiration

### 3. ✅ Post Short Text Updates
- `POST /api/posts` - Create new posts (requires authentication)
- Validates that content is not empty
- Includes author information
- Returns post ID, content, and initial metadata

### 4. ✅ View Chronological Feed
- `GET /api/posts` - Fetch all posts from all users
- Returns posts in reverse chronological order (newest first)
- Includes like counts and replies
- Includes author information for each post

### 5. ✅ Like Posts
- `POST /api/posts/:id/like` - Toggle like on a post (requires authentication)
- Supports adding likes
- Supports removing likes (unlike)
- Updates like counts correctly
- Prevents unauthorized access

### 6. ✅ Reply to Posts (One Level Deep)
- `POST /api/posts/:id/comments` - Add comments/replies to posts (requires authentication)
- Validates that reply content is not empty
- Associates reply with user and post
- Returns reply in the correct order
- Shows replies in feed with author information

### 7. ✅ View User Profile and Their Posts
- `GET /api/users/:username` - Fetch user profile with statistics
- Returns user's post count
- Returns total likes on user's posts
- Lists all posts by the user in reverse chronological order
- Includes like and comment counts for each post
- Returns 404 for non-existent users

## Running Tests

### Installation
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test Suite
```bash
npm test -- index.test.js
```

### View Coverage
```bash
npm test -- --coverage
```

## Test Structure

The test suite is organized into logical groups:

1. **User Registration** (4 tests)
   - Creating new users
   - Duplicate username prevention
   - Input validation

2. **User Login** (4 tests)
   - Successful login
   - Invalid credentials
   - Non-existent users

3. **Posting Short Text Updates** (7 tests)
   - Creating posts
   - Character limit enforcement
   - Empty post rejection
   - Authentication requirement

4. **View Chronological Feed** (4 tests)
   - Fetching all posts
   - Author information accuracy
   - Chronological ordering
   - Reply display

5. **Like Posts** (6 tests)
   - Adding likes
   - Removing likes
   - Like count accuracy
   - Multiple user likes
   - Authentication requirement

6. **Reply to Posts** (7 tests)
   - Adding replies
   - Multiple replies
   - Reply ordering
   - Empty reply rejection
   - Authentication requirement

7. **View User Profile** (7 tests)
   - Profile fetching
   - Post listing and ordering
   - Statistics calculation
   - 404 for missing users
   - Empty user profiles

8. **Integration Tests** (2 tests)
   - Complete user journey
   - Discussion with posts and replies

## Key Testing Patterns

### Authentication
Tests use Bearer tokens in the Authorization header:
```javascript
.set('Authorization', `Bearer ${authToken}`)
```

### Database
Tests use an in-memory SQLite database for speed and isolation. Each test run starts with a fresh database.

### Assertions
- `expect(res.status).toBe(201)` - Verify HTTP status codes
- `expect(res.body).toBeDefined()` - Verify response structure
- `expect(Array.isArray(res.body)).toBe(true)` - Verify data types

## Example Test Flow

```javascript
// 1. Register a user
POST /register
{ username: "testuser", password: "password123" }

// 2. Login
POST /login
{ username: "testuser", password: "password123" }
// Returns JWT token

// 3. Create a post (authenticated)
POST /api/posts
Authorization: Bearer {token}
{ content: "Hello world!" }

// 4. View feed
GET /api/posts

// 5. Like a post (authenticated)
POST /api/posts/:id/like
Authorization: Bearer {token}

// 6. Reply to post (authenticated)
POST /api/posts/:id/comments
Authorization: Bearer {token}
{ content: "Great post!" }

// 7. View user profile
GET /api/users/:username
```

## Notes for Developers

### Character Limit
The current implementation doesn't enforce a 280-character limit on posts. To add this:

1. Update the POST /api/posts endpoint:
```javascript
if (content.trim().length > 280) {
  return res.status(400).json({ error: 'Post must be 280 characters or less' });
}
```

2. Update the test to check for rejection:
```javascript
expect(res.status).toBe(400);
```

### Nested Comments
The current implementation only supports one level of replies (comments on posts). To support nested replies (comments on comments):

1. Modify the comments table schema
2. Update the API endpoints
3. Update the tests to verify nested reply support

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```bash
# GitHub Actions example
- name: Run tests
  run: npm test -- --coverage
```

## Troubleshooting

### Database Lock Issues
If tests fail with database lock errors, ensure:
- Database is using in-memory SQLite (`:memory:` when NODE_ENV=test)
- Previous tests are properly closed
- `forceExit` is enabled in Jest config

### Token Issues
- Ensure JWT_SECRET is set in environment
- Verify token is properly formatted: `Bearer {token}`
- Check token expiration (1 hour)

### Async Issues
- All database calls in SQLite are callback-based
- Tests wait for async operations before assertions
- Use `done()` callback in beforeAll/afterAll hooks
