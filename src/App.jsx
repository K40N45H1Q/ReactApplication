import React from 'react';
import Header from './components/Header/Header';
import './App.css';
import style from './components/Header/Header.module.css';

function App() {
    return (
        <div className="App">
            <Header />
            <main className="main-section">
                <input type="text" placeholder="Search" className="search-input" />
                <div className="gender-toggle">
                    <button className={style.genderButton}>For male</button>
                    <button className={style.genderButton}>For female</button>
                </div>
            </main>
        </div>
    );
}

export default App;