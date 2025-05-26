import './App.css';
import React from 'react';
import Header from './components/Header/Header';
import Catalog from "./components/Catalog/catalog"

function App() {
    return (
        <div className="App">
            <Header />
            <Catalog />
        </div>
    );
}

export default App;