
"use client";
import { createContext, useContext, useState, useEffect } from "react";

export interface FileImage { // Helper type for product image
    url: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price_inr: number;
    sizes?: string[];
    image_url?: string;
    is_active: boolean;
}

export interface CartItem extends Product {
    selectedSize: string;
    quantity: number;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, size: string) => void;
    removeFromCart: (productId: string, size: string) => void;
    clearCart: () => void;
    cartTotal: number;
}

const CartContext = createContext<CartContextType>({
    cart: [],
    addToCart: () => { },
    removeFromCart: () => { },
    clearCart: () => { },
    cartTotal: 0,
});

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    // Load cart from local storage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('hbt_merch_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
    }, []);

    // Save cart to local storage on change
    useEffect(() => {
        localStorage.setItem('hbt_merch_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product: Product, size: string) => {
        setCart((prev) => {
            const existingParams = prev.find(item => item.id === product.id && item.selectedSize === size);
            if (existingParams) {
                return prev.map(item =>
                    (item.id === product.id && item.selectedSize === size)
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, selectedSize: size, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string, size: string) => {
        setCart(prev => prev.filter(item => !(item.id === productId && item.selectedSize === size)));
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((total, item) => total + (item.price_inr * item.quantity), 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
