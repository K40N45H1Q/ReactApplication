import React from 'react';
import Header from './components/Header/Header';
import ToggleButtons from './components/ToggleButtons/ToggleButtons';
import categoryGrid from "./components/categoryGrid/categoryGrid";
import './App.css';
import CategoryGrid from "./components/categoryGrid/categoryGrid";
import PopularItems from "./components/PopularItems/PopularItems";

function App() {
    return (
        <div className="App">
            <Header />
            <main className="main-section">
                <input type="text" placeholder="Search" className="search-input" />
                <ToggleButtons />
                <CategoryGrid />
                <PopularItems />
            </main>
        </div>
    );
}

export default App;