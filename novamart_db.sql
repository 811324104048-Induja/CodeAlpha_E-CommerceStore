create database novamart_db;
USE novamart_db;
-- ==========================================
-- 1. PRODUCTS TABLE
-- Compatible with the structure created earlier
-- ==========================================
drop table products;
CREATE TABLE IF NOT EXISTS products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    stock INT NOT NULL DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_product_price CHECK (price >= 0),
    CONSTRAINT chk_product_stock CHECK (stock >= 0)
);

-- ==========================================
-- 2. USERS TABLE
-- Stores customer registration details
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. ADDRESSES TABLE
-- Stores customer delivery addresses
-- ==========================================

CREATE TABLE IF NOT EXISTS addresses (
    address_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(15) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_addresses_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ==========================================
-- 4. CART ITEMS TABLE
-- Stores products added to a customer's cart
-- ==========================================

CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_cart_user_product
        UNIQUE (user_id, product_id),

    CONSTRAINT chk_cart_quantity CHECK (quantity > 0),

    CONSTRAINT fk_cart_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE CASCADE
);

-- ==========================================
-- 5. ORDERS TABLE
-- Stores the main order details
-- ==========================================

CREATE TABLE IF NOT EXISTS orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    address_id INT NULL,

    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    order_status ENUM(
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    payment_method ENUM(
        'COD',
        'UPI',
        'CARD'
    ) NOT NULL DEFAULT 'COD',

    payment_status ENUM(
        'PENDING',
        'PAID',
        'FAILED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'PENDING',

    shipping_name VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    shipping_address VARCHAR(255) NOT NULL,
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(15) NOT NULL,
    shipping_country VARCHAR(100) NOT NULL DEFAULT 'India',

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_order_total CHECK (total_amount >= 0),

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT fk_orders_address
        FOREIGN KEY (address_id)
        REFERENCES addresses(address_id)
        ON DELETE SET NULL
);

-- ==========================================
-- 6. ORDER ITEMS TABLE
-- Stores each product belonging to an order
-- ==========================================

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NULL,

    product_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT chk_order_item_price CHECK (unit_price >= 0),
    CONSTRAINT chk_order_item_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_item_subtotal CHECK (subtotal >= 0),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE SET NULL
);

-- ==========================================
-- 7. PAYMENTS TABLE
-- Stores payment transaction information
-- ==========================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,

    payment_method ENUM(
        'COD',
        'UPI',
        'CARD'
    ) NOT NULL DEFAULT 'COD',

    payment_status ENUM(
        'PENDING',
        'SUCCESS',
        'FAILED',
        'REFUNDED'
    ) NOT NULL DEFAULT 'PENDING',

    transaction_reference VARCHAR(150) UNIQUE,
    payment_date TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_payment_amount CHECK (amount >= 0),

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE
);

-- ==========================================
-- 8. INDEXES FOR FASTER SEARCH
-- ==========================================

CREATE INDEX idx_products_category
    ON products(category);

CREATE INDEX idx_products_name
    ON products(name);

CREATE INDEX idx_orders_user_date
    ON orders(user_id, order_date);

CREATE INDEX idx_orders_status
    ON orders(order_status);

CREATE INDEX idx_order_items_order
    ON order_items(order_id);

-- ==========================================
-- 9. VERIFY ALL TABLES
-- ==========================================

SHOW TABLES;

-- Check product data
SELECT * FROM products;

-- Check table structures
DESCRIBE users;
DESCRIBE products;
DESCRIBE addresses;
DESCRIBE cart_items;
DESCRIBE orders;
DESCRIBE order_items;
DESCRIBE payments;
USE novamart_db;

INSERT INTO products
(name, description, price, image_url, stock, category)
VALUES
(
    'Classic Red Sneakers',
    'Comfortable everyday sneakers.',
    2499.00,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    20,
    'Footwear'
),
(
    'Wireless Headphones',
    'Wireless headphones for music and calls.',
    1999.00,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    15,
    'Electronics'
),
(
    'Classic Wrist Watch',
    'A stylish watch for everyday wear.',
    1499.00,
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    12,
    'Accessories'
),
(
    'Casual Cotton T-Shirt',
    'A comfortable casual T-shirt.',
    799.00,
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
    25,
    'Clothing'
),
(
    'Everyday Backpack',
    'A practical backpack for daily use.',
    1299.00,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
    10,
    'Bags'
);

USE novamart_db;

DROP TEMPORARY TABLE IF EXISTS new_novamart_products;

CREATE TEMPORARY TABLE new_novamart_products (
    name VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2),
    image_url VARCHAR(1000),
    stock INT,
    category VARCHAR(100)
);

INSERT INTO new_novamart_products
(name, description, price, image_url, stock, category)
VALUES
-- Electronics
('Bluetooth Speaker', 'Portable wireless speaker', 1499,
 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80', 20, 'Electronics'),
('Wireless Earbuds', 'Wireless earbuds for everyday listening', 1299,
 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=600&q=80', 25, 'Electronics'),
('Gaming Mouse', 'Ergonomic gaming mouse', 899,
 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=600&q=80', 18, 'Electronics'),
('Mechanical Keyboard', 'Keyboard for work and gaming', 2499,
 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', 12, 'Electronics'),
('Digital Camera', 'Camera for everyday photography', 8999,
 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80', 8, 'Electronics'),
('Smart Watch', 'Smartwatch for daily activities', 2999,
 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', 15, 'Electronics'),

-- Accessories
('Leather Wallet', 'Slim wallet for cards and cash', 699,
 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80', 20, 'Accessories'),
('Sunglasses', 'Stylish sunglasses for outdoor use', 999,
 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80', 16, 'Accessories'),
('Pendant Necklace', 'Minimal necklace for everyday wear', 799,
 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80', 14, 'Accessories'),
('Everyday Handbag', 'Modern handbag for daily use', 1899,
 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80', 9, 'Accessories'),
('Classic Wrist Watch', 'Minimal wristwatch', 1499,
 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80', 12, 'Accessories'),
('Travel Backpack', 'Backpack for travel and everyday use', 1799,
 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', 10, 'Accessories'),

-- Fashion
('Cotton T-Shirt', 'Soft cotton everyday T-shirt', 599,
 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80', 30, 'Fashion'),
('Denim Jacket', 'Classic casual denim jacket', 1999,
 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=600&q=80', 12, 'Fashion'),
('Slim Fit Jeans', 'Versatile denim jeans', 1499,
 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80', 20, 'Fashion'),
('Casual Sneakers', 'Comfortable everyday sneakers', 2299,
 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', 15, 'Fashion'),
('Summer Dress', 'Lightweight casual dress', 1599,
 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80', 10, 'Fashion'),
('Casual Hoodie', 'Comfortable everyday hoodie', 1299,
 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80', 18, 'Fashion');

USE novamart_db;

-- Step 1: Rename old categories
UPDATE products
SET category = 'Fashion'
WHERE category IN ('Clothing', 'Footwear');

UPDATE products
SET category = 'Accessories'
WHERE category = 'Bags';


-- Step 2: Add products only if category has fewer than 6
DROP TEMPORARY TABLE IF EXISTS new_products;

CREATE TEMPORARY TABLE new_products (
    name VARCHAR(255),
    description TEXT,
    price DECIMAL(10,2),
    image_url VARCHAR(1000),
    stock INT,
    category VARCHAR(100)
);

INSERT INTO new_products
(name, description, price, image_url, stock, category)
VALUES
-- ELECTRONICS
('Bluetooth Speaker', 'Portable wireless speaker', 1499,
 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80', 20, 'Electronics'),
('Wireless Earbuds', 'Wireless earbuds', 1299,
 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=600&q=80', 25, 'Electronics'),
('Gaming Mouse', 'Ergonomic gaming mouse', 899,
 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=600&q=80', 18, 'Electronics'),
('Mechanical Keyboard', 'Keyboard for work and gaming', 2499,
 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', 12, 'Electronics'),
('Digital Camera', 'Camera for everyday photography', 8999,
 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80', 8, 'Electronics'),
('Smart Watch', 'Smartwatch for daily activities', 2999,
 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', 15, 'Electronics'),

-- ACCESSORIES
('Leather Wallet', 'Slim wallet for cards and cash', 699,
 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80', 20, 'Accessories'),
('Sunglasses', 'Stylish sunglasses', 999,
 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80', 16, 'Accessories'),
('Pendant Necklace', 'Minimal everyday necklace', 799,
 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80', 14, 'Accessories'),
('Everyday Handbag', 'Modern everyday handbag', 1899,
 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80', 9, 'Accessories'),
('Classic Wrist Watch', 'Minimal wristwatch', 1499,
 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=80', 12, 'Accessories'),
('Travel Backpack', 'Backpack for travel', 1799,
 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', 10, 'Accessories'),

-- FASHION
('Cotton T-Shirt', 'Soft cotton T-shirt', 599,
 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80', 30, 'Fashion'),
('Denim Jacket', 'Classic denim jacket', 1999,
 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=600&q=80', 12, 'Fashion'),
('Slim Fit Jeans', 'Everyday denim jeans', 1499,
 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80', 20, 'Fashion'),
('Casual Sneakers', 'Comfortable everyday sneakers', 2299,
 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', 15, 'Fashion'),
('Summer Dress', 'Lightweight casual dress', 1599,
 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80', 10, 'Fashion'),
('Casual Hoodie', 'Comfortable everyday hoodie', 1299,
 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80', 18, 'Fashion');


-- Step 3: Insert only the number needed to reach 6 per category
INSERT INTO products
(name, description, price, image_url, stock, category)
SELECT
    n.name,
    n.description,
    n.price,
    n.image_url,
    n.stock,
    n.category
FROM (
    SELECT
        np.*,
        ROW_NUMBER() OVER (
            PARTITION BY np.category
            ORDER BY np.name
        ) AS rn
    FROM new_products np
) AS n
LEFT JOIN (
    SELECT category, COUNT(*) AS total
    FROM products
    WHERE category IN ('Electronics', 'Accessories', 'Fashion')
    GROUP BY category
) AS existing
ON existing.category = n.category
WHERE n.rn <= GREATEST(
    0,
    6 - COALESCE(existing.total, 0)
);

DROP TEMPORARY TABLE new_products;


-- Step 4: Verify the result
SELECT category, COUNT(*) AS total_products
FROM products
WHERE category IN ('Electronics', 'Accessories', 'Fashion')
GROUP BY category
ORDER BY category;
select *from addresses;