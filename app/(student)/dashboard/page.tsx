"use client";
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Product, useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { Loader2, ShoppingCart, Pencil, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const { user, role, loading: authLoading } = useAuth();
    const { addToCart } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
    const [customTexts, setCustomTexts] = useState<Record<string, Record<string, string>>>({});
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!authLoading && (!user || role !== 'student')) {
            router.push('/login');
            return;
        }
        const fetchProducts = async () => {
            try {
                const q = query(collection(db, 'products'), where('is_active', '==', true));
                const querySnapshot = await getDocs(q);
                const productsData: Product[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(productsData);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };
        if (user && role === 'student') fetchProducts();
    }, [user, role, authLoading, router]);

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
        
        // Handle new multi-field customizations
        if (product.customizations && product.customizations.length > 0) {
            const productCustoms = customTexts[product.id] || {};
            const missing = product.customizations.some(field => !productCustoms[field.label]?.trim());
            if (missing) {
                alert("Please fill in all customization fields.");
                return;
            }
            customData = productCustoms;
        } 
        // Handle legacy boolean toggle
        else if ((product as any).isCustomizable) {
            const legacyVal = customTexts[product.id]?.['Text'] || '';
            if (!legacyVal.trim()) {
                alert("Please enter customization text.");
                return;
            }
            customData = { 'Text': legacyVal };
        }

        addToCart(product, size || 'N/A', customData);
        
        setAddedIds(prev => new Set(prev).add(product.id));
        setTimeout(() => setAddedIds(prev => { const s = new Set(prev); s.delete(product.id); return s; }), 1500);
    };

    if (authLoading || loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--hbt-navy)' }} />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="mb-12">
                <p className="section-eyebrow mb-2">Our Collection</p>
                <h1 className="section-title">Products</h1>
            </div>

            {products.length === 0 ? (
                <div className="text-center py-24">
                    <ShoppingBag size={48} className="mx-auto mb-4" style={{ color: 'var(--hbt-border)' }} />
                    <p className="text-lg" style={{ color: 'var(--hbt-muted)' }}>No products available at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((product) => {
                        const hasCustomizations = (product.customizations && product.customizations.length > 0) || (product as any).isCustomizable;
                        
                        return (
                            <div key={product.id} className="product-card flex flex-col">
                                <div className="card-image relative h-72 bg-gray-50">
                                    {product.is_featured && (
                                        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                            style={{ background: 'var(--hbt-orange)' }}>
                                            ✦ Featured
                                        </div>
                                    )}
                                    {hasCustomizations && (
                                        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                                            style={{ background: 'var(--hbt-navy)', color: 'white' }}>
                                            <Pencil size={10} /> Custom
                                        </div>
                                    )}
                                    {product.image_url ? (
                                        <Image
                                            src={product.image_url}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ShoppingBag size={40} style={{ color: 'var(--hbt-border)' }} />
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 flex-grow flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--hbt-navy)' }}>
                                            {product.name}
                                        </h3>
                                        <span className="font-bold text-lg flex-shrink-0" style={{ color: 'var(--hbt-orange)' }}>₹{product.price_inr}</span>
                                    </div>
                                    <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--hbt-muted)' }}>{product.description}</p>

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

                                        {/* Multi-field Customizations */}
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
                                        
                                        {/* Legacy Customization Fallback */}
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
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm transition-all"
                                            style={{
                                                background: addedIds.has(product.id) ? '#059669' : 'var(--hbt-navy)',
                                                color: 'white',
                                                transform: addedIds.has(product.id) ? 'scale(0.98)' : 'scale(1)',
                                                transition: 'all 0.3s ease',
                                            }}
                                        >
                                            <ShoppingCart size={16} />
                                            {addedIds.has(product.id) ? '✓ Added to Cart!' : 'Add to Cart'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
