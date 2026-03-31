import React, { useState } from 'react';
import './Sidebar.css';
import { FaHome, FaBell, FaAppStore, FaUser, FaCog } from 'react-icons/fa';

const Sidebar = () => {
  const [isHidden, setIsHidden] = useState(false);

  const toggleSidebar = () => {
    setIsHidden(!isHidden);
  };

  return (
    <div className={`sidebar ${isHidden ? 'hidden' : ''}`}>
      <button className="toggle-button" onClick={toggleSidebar}>
        {isHidden ? 'Show' : 'Hide'}
      </button>
      {!isHidden && (
        <ul>
          <li><FaHome /> Home</li>
          <li><FaBell /> Notifications</li>
          <li><FaAppStore /> Apps</li>
          <li><FaUser /> Profile</li>
          <li><FaCog /> Settings</li>
        </ul>
      )}
    </div>
  );
};

export default Sidebar;