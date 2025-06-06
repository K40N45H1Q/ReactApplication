import React, { useEffect, useState } from 'react';
import './Header.css';
import styles from './Header.module.css';
import shared from '../../shared.module.css'
import { FiSend, FiHome, FiHeart, FiShoppingCart } from 'react-icons/fi';

const API_BASE_URL = "https://reactapplicationbot-1.onrender.com";

const Header = () => {
    const [username, setUsername] = useState('Guest');
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();

            const user = tg.initDataUnsafe?.user;
            if (user) {
                setUsername(user.username || 'Guest');
                setUserId(user.id);
            }
        }
    }, []);

    const avatarUrl = userId ? `${API_BASE_URL}/get_avatar/${userId}` : null;

    return (
        <header className="header">
            <div className="left-section">
                <div className="profile">
                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt="User Avatar"
                            className="avatar-img"
                        />
                    )}
                </div>
                <div className="info">
                    <span className="username">{username}</span>
                    <button className={shared.defaultButton} style={{ padding: '3px 6px', fontSize: '10px' }}>
                        Personal account
                    </button>
                </div>
            </div>
            <div className="right-section">
                <a className={styles.iconWrapper} href="/">
                    <div className={styles.iconCircle}>
                        <FiSend size={20} color="#44abff" />
                    </div>
                </a>
                <a className={styles.link} href="/">
                    <FiHome size={24} color="#313131" />
                </a>
                <a className={styles.link} href="/cart">
                    <FiShoppingCart size={24} color="#313131" />  {/* <-- тут иконка корзины */}
                </a>
            </div>
        </header>
    );
};

export default Header;
