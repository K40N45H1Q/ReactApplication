import React from "react"
import "./categoryGrid.css"
import styles from "./categoryGrid.module.css"

function CategoryGrid() {
    return (
        <div className="CategoryGrid">
            <div className={styles.CategoryItem}>
                <h3>Trappings</h3>
            </div>
            <div className={styles.CategoryItem}>
                <h3>Footwear</h3>
            </div>
            <div className={styles.CategoryItem}>
                <h3>Watches</h3>
            </div>
            <div className={styles.CategoryItem}>
                <h3>Outerwear</h3>
            </div>
            <div className={styles.CategoryItem}>
                <h3>Bags</h3>
            </div>
            <div className={styles.CategoryItem}>
                <h3>Accessories</h3>
            </div>
        </div>
    )
}

export default CategoryGrid;