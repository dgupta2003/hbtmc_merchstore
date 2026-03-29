"use client";
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Package, CheckCircle2, Truck, Clock, PackageCheck, Pencil } from 'lucide-react';
import Link from 'next/link';

interface Order {
    id: string;
    items: any[];
    total_amount: number;
    payment_status: string;
    order_status: string;
    created_at: Timestamp;
}

export default function OrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchOrders = async () => {
            try {
                const q = query(collection(db, 'orders'), where('user_id', '==', user.uid));
                const snapshot = await getDocs(q);
                const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
                setOrders(ordersData.sort((a, b) => b.created_at?.seconds - a.created_at?.seconds));
            } catch (error) {
                console.error("Error fetching orders", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [user]);

    if (authLoading || loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--hbt-navy)' }} />
        </div>
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock size={20} className="text-orange-500" />;
            case 'ready_for_pickup': return <Package size={20} className="text-blue-600" />;
            case 'completed': return <PackageCheck size={20} className="text-emerald-600" />;
            default: return <Truck size={20} className="text-gray-400" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <div className="mb-10">
                <p className="section-eyebrow mb-2">History</p>
                <h1 className="section-title">My Orders</h1>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
                    <Package size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg text-gray-500 mb-6">No orders found.</p>
                    <Link href="/dashboard" className="btn-primary">Browse Collection</Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-2xl p-6 md:p-8"
                            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)', border: '1px solid var(--hbt-border)' }}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                                <div>
                                    <h3 className="font-bold text-xl font-serif text-blue-900 mb-1">
                                        Order #{order.id.slice(0, 8).toUpperCase()}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Placed directly on {order.created_at?.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>

                                {/* Status Timeline / Badge */}
                                <div className="flex items-center gap-3 px-4 py-2 rounded-full font-medium text-sm"
                                    style={{
                                        background: order.order_status === 'completed' ? '#d1fae5' : order.order_status === 'ready_for_pickup' ? '#dbeafe' : '#fef3c7',
                                        color: order.order_status === 'completed' ? '#065f46' : order.order_status === 'ready_for_pickup' ? '#1e40af' : '#92400e',
                                    }}>
                                    {getStatusIcon(order.order_status)}
                                    {order.order_status?.toUpperCase().replace(/_/g, ' ')}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-start text-sm border-l-2 pl-3 border-gray-100 py-1">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.product_name_snapshot}</p>
                                            <span className="text-gray-500">Size: {item.size} × {item.quantity}</span>
                                            
                                            {/* Legacy single text */}
                                            {item.customizationText && typeof item.customizationText === 'string' && (
                                                <p className="flex items-center gap-1.5 mt-1 text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full inline-flex">
                                                    <Pencil size={12} /> Custom: "{item.customizationText}"
                                                </p>
                                            )}
                                            
                                            {/* New multi-field map */}
                                            {item.customizationTexts && (
                                                <div className="mt-1 flex gap-2 flex-wrap">
                                                    {Object.entries(item.customizationTexts).map(([label, val]) => (
                                                        <span key={label} className="flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-full">
                                                            <Pencil size={10} className="text-blue-500"/> {label}: "{val as string}"
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-medium text-gray-900">₹{item.line_total}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-gray-500">Total Amount</span>
                                <span className="font-bold text-2xl" style={{ color: 'var(--hbt-orange)' }}>₹{order.total_amount}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
