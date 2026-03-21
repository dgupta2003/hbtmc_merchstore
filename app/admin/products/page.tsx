
"use client";
import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth-context';
import { Product } from '@/lib/cart-context';
import Image from 'next/image';
import { Loader2, Plus, Edit, Trash, Save, X } from 'lucide-react';

export default function AdminProductsPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        const q = query(collection(db, 'products'), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(data);
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchProducts();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentProduct.name || !currentProduct.price_inr) return;

        setUploading(true);
        try {
            let imageUrl = currentProduct.image_url || '';

            if (imageFile) {
                const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            const productData = {
                name: currentProduct.name,
                description: currentProduct.description || '',
                price_inr: Number(currentProduct.price_inr),
                sizes: typeof currentProduct.sizes === 'string' ? (currentProduct.sizes as string).split(',').map(s => s.trim()) : currentProduct.sizes || [],
                image_url: imageUrl,
                is_active: currentProduct.is_active ?? true,
                updated_at: new Date(),
            };

            if (currentProduct.id) {
                await updateDoc(doc(db, 'products', currentProduct.id), productData);
            } else {
                await addDoc(collection(db, 'products'), {
                    ...productData,
                    created_at: new Date()
                });
            }

            setIsEditing(false);
            setCurrentProduct({});
            setImageFile(null);
            fetchProducts();
        } catch (error) {
            console.error("Error saving product", error);
            alert("Failed to save product.");
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (product: Product) => {
        setCurrentProduct(product);
        setIsEditing(true);
    };

    const toggleActive = async (product: Product) => {
        try {
            await updateDoc(doc(db, 'products', product.id), { is_active: !product.is_active });
            fetchProducts();
        } catch (error) {
            console.error("Error updating", error);
        }
    };

    if (loading && !products.length) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-blue-900">Products</h1>
                <button
                    onClick={() => { setCurrentProduct({}); setIsEditing(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
                >
                    <Plus size={20} /> Add Product
                </button>
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{currentProduct.id ? 'Edit Product' : 'New Product'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Name</label>
                                <input
                                    className="w-full border p-2 rounded"
                                    value={currentProduct.name || ''}
                                    onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Description</label>
                                <textarea
                                    className="w-full border p-2 rounded"
                                    value={currentProduct.description || ''}
                                    onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Price (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={currentProduct.price_inr || ''}
                                        onChange={e => setCurrentProduct({ ...currentProduct, price_inr: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Sizes (comma sep)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={Array.isArray(currentProduct.sizes) ? currentProduct.sizes.join(', ') : currentProduct.sizes || ''}
                                        onChange={e => setCurrentProduct({ ...currentProduct, sizes: e.target.value as any })}
                                        placeholder="S, M, L, XL"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="w-full border p-2 rounded"
                                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                                />
                                {(currentProduct.image_url || imageFile) && <p className="text-xs text-green-600 mt-1">Image selected</p>}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 flex items-center gap-2"
                                >
                                    {uploading && <Loader2 className="animate-spin" size={16} />} Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                    <div key={product.id} className="bg-white rounded-xl shadow border p-4 flex flex-col relative opacity-100 data-[active=false]:opacity-60" data-active={product.is_active}>
                        <div className="relative h-48 bg-gray-100 rounded-lg mb-4">
                            {product.image_url ? (
                                <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-lg" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                            )}
                        </div>
                        <h3 className="font-bold">{product.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">₹{product.price_inr}</p>

                        <div className="mt-auto flex justify-between items-center pt-4 border-t">
                            <button
                                onClick={() => toggleActive(product)}
                                className={`text-xs px-2 py-1 rounded ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                            >
                                {product.is_active ? 'Active' : 'Inactive'}
                            </button>
                            <button
                                onClick={() => handleEdit(product)}
                                className="p-2 text-gray-500 hover:text-blue-900"
                            >
                                <Edit size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
