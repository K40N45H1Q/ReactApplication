import React, { useState } from 'react';
import './ToggleButtons.css'; // Стили кнопок

function ToggleButtons() {
    const [activeButton, setActiveButton] = useState('left'); // по умолчанию активна левая

    return (
        <div className="button-group">
            <button
                className={activeButton === 'left' ? 'btn active' : 'btn'}
                onClick={() => setActiveButton('left')}
            >
                For men
            </button>
            <button
                className={activeButton === 'right' ? 'btn active' : 'btn'}
                onClick={() => setActiveButton('right')}
            >
                For women
            </button>
        </div>
    );
}

export default ToggleButtons;
