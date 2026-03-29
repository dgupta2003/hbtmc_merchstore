"use client";
import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, orderBy, query, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth-context';
import { Product, CustomizationField } from '@/lib/cart-context';
import Image from 'next/image';
import { Loader2, Plus, Edit, Pencil, Star, Trash2 } from 'lucide-react';

export default function AdminProductsPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [customFields, setCustomFields] = useState<CustomizationField[]>([]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'products'), orderBy('created_at', 'desc'));
            const snapshot = await getDocs(q);
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        } catch {
            const snapshot = await getDocs(collection(db, 'products'));
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        }
        setLoading(false);
    };

    useEffect(() => { if (user) fetchProducts(); }, [user]);

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
                sizes: typeof currentProduct.sizes === 'string' ? (currentProduct.sizes as string).split(',').map((s: string) => s.trim()).filter((s: string) => s) : currentProduct.sizes || [],
                image_url: imageUrl,
                is_active: currentProduct.is_active ?? true,
                customizations: customFields,
                is_featured: currentProduct.is_featured ?? false,
                updated_at: new Date(),
            };

            // clean up legacy boolean if exists
            (productData as any).isCustomizable = deleteField();

            if (currentProduct.id) {
                await updateDoc(doc(db, 'products', currentProduct.id), productData);
            } else {
                await addDoc(collection(db, 'products'), { ...productData, created_at: new Date() });
            }

            setIsEditing(false);
            setCurrentProduct({});
            setCustomFields([]);
            setImageFile(null);
            fetchProducts();
        } catch (error) {
            console.error(error);
            alert("Failed to save product.");
        } finally {
            setUploading(false);
        }
    };

    const addCustomField = () => {
        setCustomFields([...customFields, { id: `field_${Date.now()}`, label: 'New Input', desc: '', type: 'text', maxLength: 20 }]);
    };

    const updateCustomField = (index: number, updates: Partial<CustomizationField>) => {
        const newFields = [...customFields];
        newFields[index] = { ...newFields[index], ...updates };
        setCustomFields(newFields);
    };

    const removeCustomField = (index: number) => {
        setCustomFields(customFields.filter((_, i) => i !== index));
    };

    if (loading && !products.length) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-serif text-blue-900">Products Catalog</h1>
                <button onClick={() => { setCurrentProduct({ is_featured: false }); setCustomFields([]); setIsEditing(true); }} className="btn-navy">
                    <Plus size={18} /> Add Product
                </button>
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
                        <h2 className="text-2xl font-bold font-serif text-blue-900 mb-6">{currentProduct.id ? 'Edit Product' : 'Create Product'}</h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">Display Name</label>
                                <input className="premium-input" value={currentProduct.name || ''} onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">Description</label>
                                <textarea className="premium-input min-h-[100px]" value={currentProduct.description || ''} onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">Price (INR)</label>
                                    <input type="number" className="premium-input" value={currentProduct.price_inr || ''} onChange={e => setCurrentProduct({ ...currentProduct, price_inr: Number(e.target.value) })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">Sizes (csv)</label>
                                    <input className="premium-input" value={Array.isArray(currentProduct.sizes) ? currentProduct.sizes.join(', ') : currentProduct.sizes || ''} onChange={e => setCurrentProduct({ ...currentProduct, sizes: e.target.value as any })} placeholder="S, M, L" />
                                </div>
                            </div>
                            
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                                    <input type="checkbox" checked={currentProduct.is_featured || false} onChange={e => setCurrentProduct({ ...currentProduct, is_featured: e.target.checked })} className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500" />
                                    Mark as Featured Spotlight
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-7">Appears on the homepage. Enables Guest Checkout for non-students.</p>
                            </div>

                            {/* Customization Fields Builder */}
                            <div className="p-5 border border-blue-100 rounded-xl bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-bold text-blue-900 flex items-center gap-2"><Pencil size={16}/> Customization Fields</h3>
                                        <p className="text-xs text-gray-500">Add input fields for students to personalize this product (e.g. Back Name, Jersey Number).</p>
                                    </div>
                                    <button type="button" onClick={addCustomField} className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium flex items-center gap-1">
                                        <Plus size={14}/> Add Field
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {customFields.map((field, idx) => (
                                        <div key={field.id} className="relative grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 group">
                                            <button type="button" onClick={() => removeCustomField(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                                <Trash2 size={12}/>
                                            </button>
                                            <div className="col-span-12 sm:col-span-5">
                                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Label</label>
                                                <input className="w-full text-sm p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" placeholder="e.g. Left Sleeve Name" value={field.label} onChange={e => updateCustomField(idx, { label: e.target.value })} required />
                                            </div>
                                            <div className="col-span-12 sm:col-span-7">
                                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Description Hint</label>
                                                <input className="w-full text-sm p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" placeholder="e.g. Max 15 chars text" value={field.desc} onChange={e => updateCustomField(idx, { desc: e.target.value })} />
                                            </div>
                                            <div className="col-span-6 sm:col-span-6">
                                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Input Type</label>
                                                <select className="w-full text-sm p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white" value={field.type} onChange={e => updateCustomField(idx, { type: e.target.value as 'text'|'number' })}>
                                                    <option value="text">Text (Name, Initials)</option>
                                                    <option value="number">Number (Jersey Num)</option>
                                                </select>
                                            </div>
                                            <div className="col-span-6 sm:col-span-6">
                                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Max Length</label>
                                                <input type="number" className="w-full text-sm p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" value={field.maxLength || ''} onChange={e => updateCustomField(idx, { maxLength: Number(e.target.value) })} />
                                            </div>
                                        </div>
                                    ))}
                                    {customFields.length === 0 && (
                                        <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-xs">
                                            No customization fields added. Product will not be customizable.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">Product Image</label>
                                <input type="file" accept="image/*" className="premium-input text-gray-500 py-3" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <button type="button" onClick={() => setIsEditing(false)} className="btn-outline border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900">Cancel</button>
                                <button type="submit" disabled={uploading} className="btn-primary">
                                    {uploading && <Loader2 className="animate-spin" size={16} />} Save Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all hover:shadow-md">
                        <div className="relative h-48 bg-gray-50">
                            {product.image_url ? (
                                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-300">No Image</div>
                            )}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {product.is_featured && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500 text-white flex items-center gap-1 shadow-sm"><Star size={10} fill="white"/> Featured</span>}
                                {(product.customizations?.length || (product as any).isCustomizable) && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900 text-white flex items-center gap-1 shadow-sm"><Pencil size={10} /> Custom ({product.customizations?.length || 'legacy'})</span>}
                            </div>
                            <div className="absolute top-2 right-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${product.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                    {product.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 flex-grow flex flex-col">
                            <h3 className="font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                            <p className="text-orange-500 font-bold mb-4">₹{product.price_inr}</p>
                            
                            <div className="mt-auto grid grid-cols-2 gap-2">
                                <button
                                    onClick={async () => {
                                        await updateDoc(doc(db, 'products', product.id), { is_active: !product.is_active });
                                        fetchProducts();
                                    }}
                                    className="text-xs py-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium"
                                >
                                    Toggle Active
                                </button>
                                <button onClick={() => { setCurrentProduct(product); setCustomFields(product.customizations || []); setIsEditing(true); }} className="text-xs py-2 bg-blue-50 hover:bg-blue-100 rounded text-blue-800 font-medium flex items-center justify-center gap-1">
                                    <Edit size={14} /> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
