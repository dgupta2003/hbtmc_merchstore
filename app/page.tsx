"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Product } from "@/lib/cart-context";
import { ArrowRight, ShoppingBag, Star, Sparkles } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { useRouter } from "next/navigation";
import { ShoppingCart, Pencil } from "lucide-react";

function SpotlightSection({ products }: { products: Product[] }) {
    const { addToCart } = useCart();
    const router = useRouter();
    const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
    const [customTexts, setCustomTexts] = useState<Record<string, Record<string, string>>>({});
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    const handleSizeChange = (productId: string, size: string) =>
        setSelectedSizes(prev => ({ ...prev, [productId]: size }));

    const handleCustomTextChange = (productId: string, fieldLabel: string, value: string) => {
        setCustomTexts(prev => ({
            ...prev,
            [productId]: {
                ...(prev[productId] || {}),
                [fieldLabel]: value
            }
        }));
    };

    const handleAddToCart = (product: Product) => {
        const size = selectedSizes[product.id];
        if (product.sizes && product.sizes.length > 0 && !size) {
            alert("Please select a size.");
            return;
        }

        let customData: Record<string, string> | undefined = undefined;

        if (product.customizations && product.customizations.length > 0) {
            const productCustoms = customTexts[product.id] || {};
            const missing = product.customizations.some(field => !productCustoms[field.label]?.trim());
            if (missing) {
                alert("Please fill in all customization fields.");
                return;
            }
            customData = productCustoms;
        } else if ((product as any).isCustomizable) {
            const legacyVal = customTexts[product.id]?.['Text'] || '';
            if (!legacyVal.trim()) {
                alert("Please enter customization text.");
                return;
            }
            customData = { 'Text': legacyVal };
        }

        addToCart(product, size || 'N/A', customData);

        setAddedIds(prev => new Set(prev).add(product.id));
        setTimeout(() => {
            setAddedIds(prev => { const s = new Set(prev); s.delete(product.id); return s; });
            router.push('/cart'); // Redirect directly to cart for guest flow
        }, 500);
    };

    if (!products.length) return null;
    return (
        <section className="py-20 px-4" style={{ background: 'white' }}>
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <p className="section-eyebrow mb-3">✦ Spotlight</p>
                    <h2 className="section-title">Featured Products</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((product) => {
                        const hasCustomizations = (product.customizations && product.customizations.length > 0) || (product as any).isCustomizable;

                        return (
                            <div key={product.id} className="product-card flex flex-col" style={{ border: '1px solid var(--hbt-border)' }}>
                                <div className="card-image relative h-72 bg-gray-50">
                                    <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                                        style={{ background: 'var(--hbt-orange)' }}>
                                        ✦ Featured
                                    </div>
                                    {hasCustomizations && (
                                        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm"
                                            style={{ background: 'var(--hbt-navy)', color: 'white' }}>
                                            <Pencil size={10} /> Custom
                                        </div>
                                    )}
                                    {product.image_url ? (
                                        <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ShoppingBag size={40} style={{ color: 'var(--hbt-border)' }} />
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 flex-grow flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-3xl leading-tight tracking-wide" style={{ color: 'var(--hbt-navy)' }}>
                                            {product.name}
                                        </h3>
                                        <span className="text-xl flex-shrink-0" style={{ color: 'var(--hbt-orange)' }}>₹{product.price_inr}</span>
                                    </div>
                                    <p className="text-[1.1rem] mb-6 line-clamp-2" style={{ color: 'var(--hbt-muted)' }}>{product.description}</p>

                                    <div className="mt-auto space-y-4">
                                        {product.sizes && product.sizes.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--hbt-muted)' }}>Select Size</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {product.sizes.map(size => (
                                                        <button
                                                            key={size}
                                                            onClick={() => handleSizeChange(product.id, size)}
                                                            className={`size-pill ${selectedSizes[product.id] === size ? 'active' : ''}`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {product.customizations && product.customizations.map(field => (
                                            <div key={field.id} className="pt-2 border-t border-gray-100">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hbt-muted)' }}>
                                                        {field.label}
                                                    </p>
                                                    {field.maxLength && (
                                                        <span className="text-[10px] text-gray-400">Max {field.maxLength} chars</span>
                                                    )}
                                                </div>
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    placeholder={field.desc || `Enter ${field.label}`}
                                                    maxLength={field.maxLength}
                                                    value={customTexts[product.id]?.[field.label] || ''}
                                                    onChange={e => handleCustomTextChange(product.id, field.label, e.target.value)}
                                                    className="premium-input text-sm"
                                                />
                                            </div>
                                        ))}

                                        {(product as any).isCustomizable && !(product.customizations && product.customizations.length > 0) && (
                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--hbt-muted)' }}>
                                                    Customization
                                                </p>
                                                <input
                                                    type="text"
                                                    placeholder="Enter your name/text (max 25 chars)"
                                                    maxLength={25}
                                                    value={customTexts[product.id]?.['Text'] || ''}
                                                    onChange={e => handleCustomTextChange(product.id, 'Text', e.target.value)}
                                                    className="premium-input text-sm"
                                                />
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm transition-all shadow-sm"
                                            style={{
                                                background: addedIds.has(product.id) ? '#059669' : 'var(--hbt-navy)',
                                                color: 'white',
                                                transform: addedIds.has(product.id) ? 'scale(0.98)' : 'scale(1)',
                                                transition: 'all 0.3s ease',
                                            }}
                                        >
                                            <ShoppingCart size={16} />
                                            {addedIds.has(product.id) ? '✓ Added to Cart!' : 'Add to Cart / Guest Checkout'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default function Home() {
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchFeatured = async () => {
            try {
                const q = query(
                    collection(db, 'products'),
                    where('is_active', '==', true),
                    where('is_featured', '==', true),
                    limit(3)
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
                setFeaturedProducts(data);
            } catch {
                // No featured products or no index yet — fail silently
            }
        };
        fetchFeatured();
    }, []);

    return (
        <div>
            {/* Hero Section */}
            <section className="hero-section" style={{ paddingTop: '64px' }}>
                <div className="max-w-7xl mx-auto px-6 py-24 w-full">
                    <div className="max-w-3xl">
                        <p
                            className={`section-eyebrow mb-4 text-orange-300 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}
                        >
                            ✦ Official Products
                        </p>
                        <h1
                            className={`leading-tight mb-8 ${mounted ? 'animate-fade-up delay-100' : 'opacity-0'}`}
                            style={{
                                /* inherited serif */
                                fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
                                lineHeight: 1.05,
                            }}
                        >
                            Wear Your<br />
                            <span style={{ color: 'var(--hbt-orange)' }}>Pride.</span>
                        </h1>
                        <p
                            className={`text-2xl mb-12 max-w-2xl ${mounted ? 'animate-fade-up delay-200' : 'opacity-0'}`}
                            style={{ color: 'var(--hbt-text)', lineHeight: 1.6 }}
                        >
                            High-quality apparel and accessories crafted exclusively for
                            registered H.B.T. Medical College students.
                        </p>
                        <div className={`flex flex-wrap gap-4 ${mounted ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
                            <Link href="/login" className="btn-outline">
                                Shop Now <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative */}
                <div className="absolute bottom-0 left-0 right-0 h-24"
                    style={{ background: 'linear-gradient(to bottom, transparent, var(--hbt-cream))', pointerEvents: 'none' }} />
            </section>

            {/* Features Strip */}
            <section className="py-24 px-4 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        {[
                            { icon: '🎓', title: 'Students Only', desc: 'Verified through roll number — exclusive access.' },
                            { icon: '🏷️', title: 'Quality Products', desc: 'Premium fabrics, lasting prints.' },
                            { icon: '📦', title: 'Easy Pickup', desc: 'Collect from Common Room, Main Building.' },
                        ].map((f, i) => (
                            <div key={i} className={`p-8 flex flex-col items-center ${mounted ? `animate-fade-up delay-${(i + 1) * 100}` : 'opacity-0'}`}>
                                <div className="text-6xl mb-6">{f.icon}</div>
                                <h3 className="text-3xl mb-3 tracking-wide" style={{ color: 'var(--hbt-orange)' }}>{f.title}</h3>
                                <p className="text-[1.1rem]" style={{ color: 'var(--hbt-text)' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Spotlight Section */}
            <SpotlightSection products={featuredProducts} />

            {/* Notice Banner */}
            <section className="py-16 px-4">
                <div className="max-w-2xl mx-auto text-center border-t border-b py-16 mt-12" style={{ borderColor: 'var(--hbt-orange)' }}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium"
                        style={{ background: 'rgba(232,93,47,0.1)', color: 'var(--hbt-orange)' }}>
                        <Sparkles size={14} /> Important Notice
                    </div>
                    <h2 className="section-title text-2xl font-bold mb-3" style={{ color: 'var(--hbt-orange)' }}>
                        Verification Required
                    </h2>
                    <p className="leading-relaxed" style={{ color: 'var(--hbt-muted)' }}>
                        You must verify your Roll Number during registration.
                        Only valid students on the approved list can access the store.
                        Please contact the Students' Council if you face issues.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <Link href="/login" className="btn-outline">Login</Link>
                        <Link href="/register" className="btn-outline">Register with Roll No.</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
