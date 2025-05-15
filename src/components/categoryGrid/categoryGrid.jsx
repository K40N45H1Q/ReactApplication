import React, { useEffect, useState } from "react";
import "./categoryGrid.css";
import styles from "./categoryGrid.module.css";
import footwearImg from "../../footwear-img.webp";
import watchesImg from "../../watches-img.png";
import bagsImg from "../../bags-img.png"
import accessoriesImg from "../../accessories.png"
import glassess from "../../glassess.png"

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch("https://reactapplicationapi.onrender.com/categories/");
                if (!response.ok) {
                    throw new Error("Failed to fetch categories");
                }
                const data = await response.json();
                setCategories(data);
            } catch (err) {
                console.error("Error loading categories:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    if (loading) {
        return <div className={styles.loading}>Loading categories...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    if (!categories || categories.length === 0) {
        return <div className={styles.noCategories}>No categories found</div>;
    }

    return (
        <div className={`CategoryGrid ${styles.categoryGrid}`}>
            {categories.map((cat, index) => {
                const gradientClass = gradientClasses[index % gradientClasses.length];
                return (
                    <div key={cat.id || cat.name} className={`${styles.CategoryItem} ${gradientClass}`}>
                        <h3>{cat.name}</h3>
                        {cat.name === 'Footwear' && (
                            <img
                                src={footwearImg}
                                alt="Footwear"
                                className={`${styles.categoryImage} ${styles.footwearImage}`}
                                loading="lazy"
                            />
                        )}
                        {cat.name === 'Watches' && (
                            <img
                                src={watchesImg}
                                alt="Watches"
                                className={`${styles.categoryImage} ${styles.watchesImage}`}
                                loading="lazy"
                            />
                        )}
                        {cat.name === 'Bags' && (
                            <img
                                src={bagsImg}
                                alt="Bags"
                                className={`${styles.categoryImage} ${styles.bagsImage}`}
                                loading="lazy"
                            />
                        )}
                        {cat.name === 'Accessories' && (
                            <img
                                src={accessoriesImg}
                                alt="Accessories"
                                className={`${styles.categoryImage} ${styles.accessoriesImg}`}
                                loading="lazy"
                            />
                        )}

                    </div>
                );
            })}
        </div>
    );
}

export default CategoryGrid;