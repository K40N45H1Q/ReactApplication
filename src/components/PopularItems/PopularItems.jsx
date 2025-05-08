import React from "react"
import styles from "./PopularItems.module.css"

function PopularItems(props) {
    return (
        <div className={styles.PopularItems}>
            <h1 className={styles.Title}>Popular products</h1>
            <div className={styles.ProductGrid}>
                <div className={styles.ProductImage}></div>
                <div className={styles.ProductImage}></div>
                <div className={styles.ProductImage}></div>
                <div className={styles.ProductImage}></div>
            </div>
        </div>
    )
}

export default PopularItems