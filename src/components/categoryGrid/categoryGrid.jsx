import React, { useEffect, useState } from "react";
import styles from "./categoryGrid.module.css";

import footwearImg from "../../assets/footwear-img.png";
import bagsImg from "../../assets/bags-img.png";
import accessoriesImg from "../../assets/accessories.png";
import watchesImg from "../../assets/watches-img.png";
import glassesImg from "../../assets/glassess.png";
import outerwearImg from "../../assets/hoodie.png";

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
        async function fetchCategories() {
            try {
                const res = await fetch("https://reactapplicationapi.onrender.com/categories/");
                if (!res.ok) throw new Error("Failed to fetch categories");
                const data = await res.json();
                setCategories(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchCategories();
    }, []);

    if (loading) return <div className={styles.loading}>Loading categories...</div>;
    if (error) return <div className={styles.error}>Error: {error}</div>;
    if (!categories || categories.length === 0) return <div className={styles.noCategories}>No categories found</div>;

    return (
        <div className={styles.CategoryGrid}>
            {categories.map((cat, idx) => {
                const gradientClass = gradientClasses[idx % gradientClasses.length];
                return (
                    <div key={cat.id || cat.name} className={`${styles.CategoryItem} ${gradientClass}`}>
                        <div className={styles.categoryText}>{cat.name}</div>

                        {cat.name === "Footwear" && (
                            <img src={footwearImg} alt="Footwear" className={`${styles.categoryImage} ${styles.footwearImage}`} loading="lazy" />
                        )}
                        {cat.name === "Bags" && (
                            <img src={bagsImg} alt="Bags" className={`${styles.categoryImage} ${styles.bagsImage}`} loading="lazy"/>
                        )}
                        {cat.name === "Accessories" && (
                            <img src={accessoriesImg} alt="Accessories" className={`${styles.categoryImage} ${styles.accessoriesImg}`} loading={"lazy"}/>
                        )}
                        {cat.name === "Watches" && (
                            <img src={watchesImg} alt="Watches" className={`${styles.categoryImage} ${styles.watchesImage}`} loading={"lazy"}/>
                        )}
                        {cat.name === "Trappings" && (
                            <img src={glassesImg} alt="Trappings" className={`${styles.categoryImage} ${styles.trappingsImage}`} loading={"lazy"}/>
                        )}
                        {cat.name === "Outerwear" && (
                            <img src={outerwearImg} alt="Outerwear" className={`${styles.categoryImage} ${styles.outerwearImage}`} loading={"lazy"}/>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default CategoryGrid;
