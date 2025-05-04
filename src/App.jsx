import React from 'react';
import Header from './components/Header/Header';
import ToggleButtons from './components/ToggleButtons/ToggleButtons';
import './App.css';
import style from './components/Header/Header.module.css';

function App() {
    return (
        <div className="App">
            <Header />
            <main className="main-section">
                <input type="text" placeholder="Search" className="search-input" />
                <ToggleButtons />
            </main>
        </div>
    );
}

export default App;