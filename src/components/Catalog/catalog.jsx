import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./catalog.module.css";

// Импорты изображений для категорий
import footwearImg from "../../assets/fw.png";
import footwearImgFemale from "../../assets/fw_women.png";
import bagsImgMale from "../../assets/bag-DR.png";
import bagsImgFemale from "../../assets/bag_women.png";
import accessoriesImg from "../../assets/accessories.png";
import watchesImg from "../../assets/watches_gold.png";
import watchesImgFemale from "../../assets/watches_gold_women.png";
import outerwearImg from "../../assets/balenciaga.png";
import outerwearImgFemale from "../../assets/balenciaga_women.png";
import trapingsImg from "../../assets/perc.png";
import technique1 from "../../assets/technique1.png";
import technique2 from "../../assets/technique2.png";

// ✅ Важно: добавлен протокол http://
const api_url = "https://reactapplicationbot-1.onrender.com";

const gradientClasses = [
  "gradient-a",
  "gradient-b",
  "gradient-c",
  "gradient-d",
  "gradient-e",
  "gradient-i",
];

function Catalog() {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeButton, setActiveButton] = useState("left");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // ✅ Загрузка категорий с параметром gender
  useEffect(() => {
    setCategoriesLoading(true);
    fetch(
      `${api_url}/get_categories/?gender=${activeButton === "left" ? "male" : "female"}`
    )
      .then((response) => response.json())
      .then((data) => {
        setCategories(data);
        setSelectedCategory(null); // сброс выбранной категории при смене пола
      })
      .catch((error) => setCategoriesError(error.message))
      .finally(() => setCategoriesLoading(false));
  }, [activeButton]);

  // Загрузка товаров (однократно)
  useEffect(() => {
    fetch(`${api_url}/get_products/`)
      .then((response) => response.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error("Error fetching products:", error))
      .finally(() => setProductsLoading(false));
  }, []);

  const filteredProducts = products.filter((product) => {
    const genderMatch =
      activeButton === "left" ? product.gender === "male" : product.gender === "female";

    const searchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());

    const categoryMatch = selectedCategory ? product.category === selectedCategory : true;

    return genderMatch && searchMatch && categoryMatch;
  });

  if (categoriesLoading || productsLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.catalog}>
      {/* Поиск */}
      <input
        type="text"
        placeholder="Search products..."
        className={styles.searchInput}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Переключатели пола */}
      <div className={styles.buttonGroup}>
        <button
          className={activeButton === "left" ? `${styles.btn} ${styles.active}` : styles.btn}
          onClick={() => setActiveButton("left")}
        >
          For men
        </button>
        <button
          className={activeButton === "right" ? `${styles.btn} ${styles.active}` : styles.btn}
          onClick={() => setActiveButton("right")}
        >
          For women
        </button>
      </div>

      {/* Категории */}
      {categoriesError ? (
        <div className={styles.error}>{categoriesError}</div>
      ) : (
        <div className={styles.categoryGrid}>
          {categories.map((cat, idx) => {
            const gradientClass = styles[gradientClasses[idx % gradientClasses.length]];
            return (
              <div
                key={cat.id || cat}
                className={`${styles.categoryItem} ${gradientClass} ${
                  selectedCategory === cat ? styles.activeCategory : ""
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                <div className={styles.categoryText}>{cat}</div>
                {cat === "Footwear" && (
                  <img
                    src={activeButton === "left" ? footwearImg : footwearImgFemale}
                    alt="Footwear"
                    className={`${styles.categoryImage} ${styles.footwearImage}`}
                    loading="lazy"
                  />
                )}
                {cat === "Bags" && (
                  <img
                    src={activeButton === "left" ? bagsImgMale : bagsImgFemale}
                    alt="Bags"
                    className={`${styles.categoryImage} ${styles.bagsImage}`}
                    loading="lazy"
                  />
                )}
                {cat === "Trappings" && (
                  <img
                    src={trapingsImg}
                    alt="Trappings"
                    className={`${styles.categoryImage} ${styles.trappingsImage}`}
                    loading="lazy"
                  />
                )}
                {cat === "Watches" && (
                  <img
                    src={activeButton === "left" ? watchesImg : watchesImgFemale}
                    alt="Watches"
                    className={`${styles.categoryImage} ${
                      activeButton === "left"
                        ? styles.watchesImage
                        : styles.watchesImageFemale
                    }`}
                    loading="lazy"
                  />
                )}
                {cat === "Outerwear" && (
                  <img
                    src={activeButton === "left" ? outerwearImg : outerwearImgFemale}
                    alt="Outerwear"
                    className={`${styles.categoryImage} ${styles.outerwearImage}`}
                    loading="lazy"
                  />
                )}
                {cat === "Technique" && (
                  <>
                    <img
                      src={technique1}
                      alt="Technique 1"
                      className={`${styles.categoryImage} ${styles.techniqueImage}`}
                      loading="lazy"
                    />
                    <img
                      src={technique2}
                      alt="Technique 2"
                      className={`${styles.categoryImage} ${styles.techniqueImageAlt}`}
                      loading="lazy"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Продукты */}
      {filteredProducts.length === 0 ? (
        <div className={styles.noProducts}>No products found 🪫</div>
      ) : (
        <div className={styles.productGrid}>
          {filteredProducts.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <Link to={`/product/${product.id}`} className={styles.productLink}>
                <div className={styles.productImage}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={styles.productImg}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>{product.name}</div>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <p className={styles.productName}>{product.name}</p>
                  <p className={styles.productPrice}>€{product.price}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Catalog;
