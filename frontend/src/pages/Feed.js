import './Feed.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:3001';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/posts`);
        if (!res.ok) {
          console.error('Failed to fetch posts:', res.status);
          return;
        }
        const data = await res.json();
        setPosts(data);
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };

    fetchPosts();
  }, []);

  const handlePostSubmit = async () => {
    if (newPost.trim() !== '' && newPost.length <= 280) {
      const res = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newPost })
      });
      if (res.ok) {
        const created = await res.json();
        setPosts([created, ...posts]);
        setNewPost('');
      }
    }
  };

  const handleLike = async (postId) => {
    const res = await fetch(`${BACKEND_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const { liked } = await res.json();
      setPosts(posts.map(post =>
        post.id === postId ? { ...post, likes: post.likes + (liked ? 1 : -1) } : post
      ));
    }
  };

  const handleReply = async (postId, replyContent) => {
    const res = await fetch(`${BACKEND_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: replyContent })
    });
    if (res.ok) {
      const comment = await res.json();
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, replies: [...post.replies, comment] }
          : post
      ));
    }
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
              <strong>{post.author.username}</strong>
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
