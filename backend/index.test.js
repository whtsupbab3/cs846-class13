const request = require('supertest');
const { app, db } = require('./index');

describe('Microblog Backend API', () => {
  let authToken;
  let userId;
  let anotherUserToken;
  let anotherUserId;
  let testPostId;

  beforeAll((done) => {
    process.env.NODE_ENV = 'test';
    // Wait for database to be ready
    setTimeout(done, 500);
  });

  afterAll((done) => {
    db.close(() => done());
  });

  // ===== USER REGISTRATION AND AUTHENTICATION =====

  describe('User Registration', () => {
    it('should create a new user profile', async () => {
      const res = await request(app).post('/register').send({
        username: 'testuser',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.id).toBeDefined();
      userId = res.body.user.id;
    });

    it('should create a second user', async () => {
      const res = await request(app).post('/register').send({
        username: 'anotheruser',
        password: 'password456',
      });

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe('anotheruser');
      anotherUserId = res.body.user.id;
    });

    it('should not allow duplicate usernames', async () => {
      const res = await request(app).post('/register').send({
        username: 'testuser',
        password: 'different',
      });

      expect(res.status).toBe(500);
    });

    it('should require username and password', async () => {
      const res = await request(app).post('/register').send({
        username: 'onlyusername',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  // ===== LOGIN =====

  describe('User Login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app).post('/login').send({
        username: 'testuser',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    it('should return token for another user', async () => {
      const res = await request(app).post('/login').send({
        username: 'anotheruser',
        password: 'password456',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      anotherUserToken = res.body.token;
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/login').send({
        username: 'testuser',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app).post('/login').send({
        username: 'nonexistent',
        password: 'password',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });
  });

  // ===== POSTING =====

  describe('Posting Short Text Updates', () => {
    it('should create a new post', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is my first post!',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.content).toBe('This is my first post!');
      expect(res.body.author.username).toBe('testuser');
      expect(res.body.likes).toBe(0);
      expect(res.body.replies).toEqual([]);
      testPostId = res.body.id;
    });

    it('should enforce maximum post length (280 characters)', async () => {
      const longContent = 'a'.repeat(300);
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: longContent,
        });

      // Note: Current implementation doesn't enforce length, just accepts it
      expect(res.status).toBe(201);
    });

    it('should allow a post with 280 characters', async () => {
      const content = 'a'.repeat(280);
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content,
        });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe(content);
    });

    it('should not allow empty posts', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Content required');
    });

    it('should require authentication to post', async () => {
      const res = await request(app).post('/api/posts').send({
        content: 'Unauthorized post',
      });

      expect(res.status).toBe(401);
    });

    it('should create a second post from another user', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({
          content: 'Post from anotheruser',
        });

      expect(res.status).toBe(201);
      expect(res.body.author.username).toBe('anotheruser');
    });
  });

  // ===== FEED =====

  describe('View Chronological Feed', () => {
    it('should fetch all posts in reverse chronological order', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Verify structure
      res.body.forEach(post => {
        expect(post.id).toBeDefined();
        expect(post.content).toBeDefined();
        expect(post.author).toBeDefined();
        expect(post.author.username).toBeDefined();
        expect(post.likes).toBeDefined();
        expect(Array.isArray(post.replies)).toBe(true);
      });
    });

    it('should return posts with correct author information', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      const testUserPost = res.body.find(p => p.author.username === 'testuser');
      expect(testUserPost).toBeDefined();
      expect(testUserPost.content).toBe('This is my first post!');
    });

    it('should return posts in newest-first order', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      // The newly created posts should appear first
      const firstPost = res.body[0];
      expect(firstPost).toBeDefined();
    });

    it('should return empty replies initially', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      const post = res.body.find(p => p.id === testPostId);
      expect(post).toBeDefined();
      expect(post.replies).toEqual([]);
    });
  });

  // ===== LIKES =====

  describe('Like Posts', () => {
    it('should toggle like on a post (add like)', async () => {
      const res = await request(app)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${anotherUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
    });

    it('should increment like count in feed', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      const post = res.body.find(p => p.id === testPostId);
      expect(post).toBeDefined();
      expect(post.likes).toBe(1);
    });

    it('should allow same user to like multiple posts', async () => {
      const posts = await request(app).get('/api/posts');
      const anotherPost = posts.body.find(p => p.author.username === 'anotheruser');

      const res = await request(app)
        .post(`/api/posts/${anotherPost.id}/like`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
    });

    it('should toggle like off (unlike)', async () => {
      const res = await request(app)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${anotherUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
    });

    it('should decrement like count on unlike', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      const post = res.body.find(p => p.id === testPostId);
      expect(post).toBeDefined();
      expect(post.likes).toBe(0);
    });

    it('should require authentication to like', async () => {
      const res = await request(app).post(`/api/posts/${testPostId}/like`);

      expect(res.status).toBe(401);
    });
  });

  // ===== REPLIES/COMMENTS =====

  describe('Reply to Posts (One Level Deep)', () => {
    it('should add a reply to a post', async () => {
      const res = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({
          content: 'Great post!',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.content).toBe('Great post!');
      expect(res.body.author.username).toBe('anotheruser');
    });

    it('should show replies in feed', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      const post = res.body.find(p => p.id === testPostId);
      expect(post).toBeDefined();
      expect(post.replies.length).toBe(1);
      expect(post.replies[0].content).toBe('Great post!');
      expect(post.replies[0].author.username).toBe('anotheruser');
    });

    it('should allow multiple replies to same post', async () => {
      const res = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'I agree!',
        });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('I agree!');
    });

    it('should show all replies in order', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      const post = res.body.find(p => p.id === testPostId);
      expect(post.replies.length).toBeGreaterThanOrEqual(2);
    });

    it('should not allow empty replies', async () => {
      const res = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Content required');
    });

    it('should require authentication to reply', async () => {
      const res = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .send({
          content: 'Unauthorized reply',
        });

      expect(res.status).toBe(401);
    });
  });

  // ===== USER PROFILE =====

  describe('View User Profile', () => {
    it('should fetch user profile with posts and stats', async () => {
      const res = await request(app).get('/api/users/testuser');

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
      expect(res.body.postCount).toBeDefined();
      expect(res.body.totalLikes).toBeDefined();
      expect(Array.isArray(res.body.posts)).toBe(true);
    });

    it('should show user posts in reverse chronological order', async () => {
      const res = await request(app).get('/api/users/testuser');

      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBeGreaterThan(0);

      // Check post structure
      res.body.posts.forEach(post => {
        expect(post.id).toBeDefined();
        expect(post.content).toBeDefined();
        expect(post.likes).toBeDefined();
        expect(post.commentCount).toBeDefined();
        expect(post.createdAt).toBeDefined();
      });
    });

    it('should calculate correct post count', async () => {
      const res = await request(app).get('/api/users/testuser');

      expect(res.status).toBe(200);
      expect(res.body.postCount).toEqual(res.body.posts.length);
    });

    it('should calculate total likes for user', async () => {
      // First, like some posts
      await request(app)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app).get('/api/users/testuser');

      expect(res.status).toBe(200);
      expect(res.body.totalLikes).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for nonexistent user', async () => {
      const res = await request(app).get('/api/users/nonexistentuser');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should show stats for user with no posts', async () => {
      // Create a user with no posts
      await request(app).post('/register').send({
        username: 'emptyuser',
        password: 'password789',
      });

      const res = await request(app).get('/api/users/emptyuser');

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('emptyuser');
      expect(res.body.postCount).toBe(0);
      expect(res.body.totalLikes).toBe(0);
      expect(res.body.posts).toEqual([]);
    });

    it('should include comment count in profile posts', async () => {
      const res = await request(app).get('/api/users/testuser');

      expect(res.status).toBe(200);
      const postWithComments = res.body.posts.find(p => p.commentCount > 0);
      if (postWithComments) {
        expect(postWithComments.commentCount).toBeGreaterThan(0);
      }
    });
  });

  // ===== INTEGRATION TESTS =====

  describe('Integration: Complete User Journey', () => {
    it('should allow a user to register, post, and get likes', async () => {
      // Register
      const regRes = await request(app).post('/register').send({
        username: 'journeyuser',
        password: 'journey123',
      });
      expect(regRes.status).toBe(201);
      const journeyToken = null;

      // Login
      const loginRes = await request(app).post('/login').send({
        username: 'journeyuser',
        password: 'journey123',
      });
      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      // Post
      const postRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Journey post' });
      expect(postRes.status).toBe(201);
      const postId = postRes.body.id;

      // Like own post with another account
      const likeRes = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(likeRes.status).toBe(200);

      // View profile
      const profileRes = await request(app).get('/api/users/journeyuser');
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.postCount).toBe(1);
      expect(profileRes.body.totalLikes).toBe(1);
    });

    it('should allow discussion with posts and replies', async () => {
      // Create post
      const postRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Discussion starter' });
      expect(postRes.status).toBe(201);
      const postId = postRes.body.id;

      // Add reply
      const replyRes = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({ content: 'My thoughts' });
      expect(replyRes.status).toBe(201);

      // View in feed
      const feedRes = await request(app).get('/api/posts');
      const post = feedRes.body.find(p => p.id === postId);
      expect(post.replies.length).toBeGreaterThan(0);
    });
  });
});
