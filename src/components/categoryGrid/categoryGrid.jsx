import React, { useEffect, useState } from "react";
import "./categoryGrid.css";
import styles from "./categoryGrid.module.css";

const gradientClasses = [
    styles["gradient-a"],
    styles["gradient-b"],
    styles["gradient-c"],
    styles["gradient-d"],
    styles["gradient-e"],
    styles["gradient-i"],
];

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
            {categories.map((cat, index) => {
                const gradientClass = gradientClasses[index % gradientClasses.length];
                return (
                    <div key={cat.name} className={`${styles.CategoryItem} ${gradientClass}`}>
                        <h3>{cat.name}</h3>
                    </div>
                );
            })}
        </div>
    );
}

export default CategoryGrid;
