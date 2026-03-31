import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './UserProfile.css';

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:3001/api/users/${username}`)
      .then(r => {
        if (!r.ok) throw new Error('User not found');
        return r.json();
      })
      .then(setProfile)
      .catch(e => setError(e.message));
  }, [username]);

  if (error) {
    return (
      <div className="profile-container">
        <p className="profile-error">{error}</p>
        <button className="profile-back" onClick={() => navigate('/')}>Back to Feed</button>
      </div>
    );
  }

  if (!profile) {
    return <div className="profile-container"><p className="profile-loading">Loading...</p></div>;
  }

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="profile-container">
      <button className="profile-back" onClick={() => navigate('/')}>← Back to Feed</button>

      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <h1 className="profile-username">{profile.username}</h1>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="stat-value">{profile.postCount}</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="stat-value">{profile.totalLikes}</span>
          <span className="stat-label">Total Likes</span>
        </div>
      </div>

      <h2 className="profile-posts-heading">Posts</h2>
      <div className="profile-posts">
        {profile.posts.length > 0 ? (
          profile.posts.map(post => (
            <div key={post.id} className="profile-post">
              <p className="profile-post-content">{post.content}</p>
              <div className="profile-post-meta">
                <span>{post.likes} likes</span>
                <span>{post.commentCount} comments</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="profile-no-posts">No posts yet.</p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
