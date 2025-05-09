import React, { useEffect, useState } from 'react';
import './Header.css';
import styles from './Header.module.css';
import { FiSend, FiHome, FiHeart, FiBook } from 'react-icons/fi';

const Header = () => {
    const [username, setUsername] = useState('');

    useEffect(() => {
        // Проверяем, доступен ли WebApp на глобальном объекте window
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready(); // Подготовка WebApp

            const user = tg.initDataUnsafe?.user; // Получение данных пользователя

            setUsername(user?.username || 'Guest'); // Установим имя пользователя или 'Guest'
        }
    }, []);

    return (
        <header className="header">
            <div className="left-section">
                <div className="profile"></div>
                <div className="info">
                    <span className="username">{username}</span>
                    <button className="info-btn">Personal account</button>
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
                <a className={styles.link} href="/">
                    <FiHeart size={24} color="#313131" />
                </a>
                <a className={styles.link} href="/">
                    <FiBook size={24} color="#313131" />
                </a>
            </div>
        </header>
    );
};

export default Header;