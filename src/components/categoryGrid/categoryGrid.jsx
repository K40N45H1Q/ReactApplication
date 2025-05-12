import React, { useEffect, useState } from "react";
import "./categoryGrid.css";
import styles from "./categoryGrid.module.css";

function CategoryGrid() {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetch("https://reactapplicationapi.onrender.com/categories/")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch categories");
                return res.json();
            })
            .then(setCategories)
            .catch((err) => console.error("Error loading categories:", err));
    }, []);

    return (
        <div className="CategoryGrid">
            {categories.map((cat) => (
                <div key={cat.name} className={styles.CategoryItem}>
                    <h3>{cat.name}</h3>
                </div>

            ))}
        </div>
    );
}

export default CategoryGrid;
