"use client";
import { createContext, useContext, useState, useEffect } from "react";

export interface CustomizationField {
    id: string;
    label: string;
    desc: string;
    type: 'text' | 'number';
    maxLength?: number;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price_inr: number;
    sizes?: string[];
    image_url?: string;
    is_active: boolean;
    customizations?: CustomizationField[];
    is_featured?: boolean;
    category?: 'merchandise' | 'ticket' | 'other';
}

export interface CartItem extends Product {
    selectedSize: string;
    quantity: number;
    customizationTexts?: Record<string, string>;
    customizationText?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, size: string, customizationTexts?: Record<string, string>) => void;
    removeFromCart: (productId: string, size: string, customizationTexts?: Record<string, string>) => void;
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

    useEffect(() => {
        localStorage.setItem('hbt_merch_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product: Product, size: string, customizationTexts?: Record<string, string>) => {
        setCart((prev) => {
            const signature = (cTexts?: Record<string, string>) => cTexts ? JSON.stringify(Object.entries(cTexts).sort()) : '';
            const incomingSig = signature(customizationTexts);

            const existing = prev.find(
                item => item.id === product.id && item.selectedSize === size && signature(item.customizationTexts) === incomingSig
            );
            
            if (existing) {
                return prev.map(item =>
                    (item.id === product.id && item.selectedSize === size && signature(item.customizationTexts) === incomingSig)
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, selectedSize: size, quantity: 1, customizationTexts }];
        });
    };

    const removeFromCart = (productId: string, size: string, customizationTexts?: Record<string, string>) => {
        const signature = (cTexts?: Record<string, string>) => cTexts ? JSON.stringify(Object.entries(cTexts).sort()) : '';
        const incomingSig = signature(customizationTexts);

        setCart(prev => prev.filter(item => !(item.id === productId && item.selectedSize === size && signature(item.customizationTexts) === incomingSig)));
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
