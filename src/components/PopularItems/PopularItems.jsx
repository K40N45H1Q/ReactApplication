import React, { useEffect, useState } from "react";
import styles from "./PopularItems.module.css";

function PopularItems() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch("https://reactapplicationapi.onrender.com/products/")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch products");
                return res.json();
            })
            .then(setProducts)
            .catch((err) => console.error("Error loading products:", err));
    }, []);

    return (
        <div className={styles.PopularItems}>
            <h1 className={styles.Title}>Popular products</h1>
            <div className={styles.ProductGrid}>
                {products.map((product) => (
                    <div key={product.name} className={styles.ProductCard}>
                        <div className={styles.ProductImage}>
                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className={styles.ProductImg}
                                />
                            ) : (
                                <div className={styles.ImagePlaceholder}>
                                    {product.name}
                                </div>
                            )}
                        </div>
                        <div className={styles.ProductInfo}>
                            <p className={styles.ProductName}>{product.name}</p>
                            <p className={styles.ProductPrice}>€{product.price.toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PopularItems;
