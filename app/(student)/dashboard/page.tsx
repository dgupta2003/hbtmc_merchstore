
"use client";
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Product, useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { Loader2, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const { user, role, loading: authLoading } = useAuth();
    const { addToCart } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Selection state map: string (productId) -> string (size)
    const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!authLoading && (!user || role !== 'student')) {
            router.push('/login');
            return;
        }

        const fetchProducts = async () => {
            try {
                const q = query(
                    collection(db, 'products'),
                    where('is_active', '==', true),
                    // orderBy('created_at', 'desc') // Requires index, simpler to sort client side if small list, or create index.
                    // Let's stick to simple where for now, or ensure index creation. 
                    // "created_at" might be missing on seeded/new items initially.
                );
                const querySnapshot = await getDocs(q);
                const productsData: Product[] = [];
                querySnapshot.forEach((doc) => {
                    productsData.push({ id: doc.id, ...doc.data() } as Product);
                });
                setProducts(productsData);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && role === 'student') {
            fetchProducts();
        }
    }, [user, role, authLoading, router]);

    const handleSizeChange = (productId: string, size: string) => {
        setSelectedSizes(prev => ({ ...prev, [productId]: size }));
    };

    const handleAddToCart = (product: Product) => {
        const size = selectedSizes[product.id];
        if (product.sizes && product.sizes.length > 0 && !size) {
            alert("Please select a size");
            return;
        }
        addToCart(product, size || 'N/A');
        alert("Added to Cart!");
    };

    if (authLoading || loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-blue-900">Merchandise</h1>

            {products.length === 0 ? (
                <p className="text-gray-500">No products available at the moment.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 flex flex-col">
                            <div className="relative h-64 w-full bg-gray-100">
                                {product.image_url ? (
                                    <Image
                                        src={product.image_url}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                )}
                            </div>

                            <div className="p-4 flex-grow flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                                    <span className="text-lg font-bold text-green-600">₹{product.price_inr}</span>
                                </div>

                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>

                                <div className="mt-auto space-y-3">
                                    {product.sizes && product.sizes.length > 0 && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Size</label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {product.sizes.map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => handleSizeChange(product.id, size)}
                                                        className={`px-3 py-1 text-sm border rounded-md transition ${selectedSizes[product.id] === size
                                                                ? 'bg-blue-900 text-white border-blue-900'
                                                                : 'text-gray-700 border-gray-300 hover:border-blue-500'
                                                            }`}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleAddToCart(product)}
                                        className="w-full flex items-center justify-center gap-2 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition shadow-sm"
                                    >
                                        <ShoppingCart size={18} /> Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
