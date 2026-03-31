import './Feed.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const navigate = useNavigate();

  const currentUser = (() => {
    const token = localStorage.getItem('authToken');
    if (!token) return { username: 'Guest' };
    try { return JSON.parse(atob(token.split('.')[1])); }
    catch { return { username: 'Guest' }; }
  })();

  useEffect(() => {
    // Simulate fetching posts from a server
    const fetchPosts = async () => {
      const fetchedPosts = [
        { id: 1, content: 'Hello World!', likes: 5, replies: [], author: { username: 'Alice', email: 'alice@example.com' } },
        { id: 2, content: 'This is a second post.', likes: 3, replies: [], author: { username: 'Bob', email: 'bob@example.com' } }
      ];
      setPosts(fetchedPosts);
    };

    fetchPosts();
  }, []);

  const handlePostSubmit = () => {
    if (newPost.trim() !== '' && newPost.length <= 280) {
      const newPostObject = {
        id: Date.now(),
        content: newPost,
        likes: 0,
        replies: [],
        author: currentUser
      };
      setPosts([newPostObject, ...posts]);
      setNewPost('');
    }
  };

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, likes: post.likes + 1 } : post
    ));
  };

  const handleReply = (postId, replyContent) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, replies: [...post.replies, { id: Date.now(), content: replyContent, author: currentUser }] } 
        : post
    ));
  };

  return (
    <div className="feed-container">
      <h2>Welcome to the Feed!</h2>
      <div className="post-creator">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="What's on your mind? (280 characters max)"
          maxLength={280}
        />
        <button onClick={handlePostSubmit}>Post</button>
      </div>
      <div className="posts">
        {posts.map((post) => (
          <div key={post.id} className="post">
            <p>
              <strong>{post.author.username}</strong> ({post.author.email})
              <button onClick={() => navigate(`/profile/${post.author.username}`)}>View Profile</button>
            </p>
            <p>{post.content}</p>
            <button onClick={() => handleLike(post.id)}>Like ({post.likes})</button>
            <div className="replies">
              {post.replies.map(reply => (
                <div key={reply.id} className="reply">
                  <p><strong>{reply.author.username}</strong>: {reply.content}</p>
                </div>
              ))}
              <textarea
                placeholder="Write a reply..."
                id={`reply-input-${post.id}`}
              />
              <button
                onClick={() => {
                  const replyInput = document.getElementById(`reply-input-${post.id}`);
                  if (replyInput.value.trim() !== '') {
                    handleReply(post.id, replyInput.value);
                    replyInput.value = '';
                  }
                }}
              >
                Send Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
