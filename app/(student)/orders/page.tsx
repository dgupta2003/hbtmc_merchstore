
"use client";
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Order {
    id: string;
    items: any[];
    total_amount: number;
    payment_status: string;
    order_status: string;
    created_at: Timestamp;
    razorpay_payment_id?: string;
}

export default function OrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchOrders = async () => {
            try {
                const q = query(
                    collection(db, 'orders'),
                    where('user_id', '==', user.uid),
                    orderBy('created_at', 'desc')
                );
                const snapshot = await getDocs(q);
                const ordersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Order[];
                setOrders(ordersData);
            } catch (error) {
                console.error("Error fetching orders", error);
                // Fallback if index missing
                const q = query(
                    collection(db, 'orders'),
                    where('user_id', '==', user.uid)
                );
                const snapshot = await getDocs(q);
                const ordersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Order[];
                setOrders(ordersData.sort((a, b) => b.created_at?.seconds - a.created_at?.seconds));
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user]);

    if (authLoading || loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-blue-900">Your Orders</h1>

            {orders.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500 mb-4">No orders found.</p>
                    <Link href="/dashboard" className="text-blue-600 hover:underline">Start Shopping</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-4 border-b pb-2">
                                <div>
                                    <p className="text-sm text-gray-500">Order ID: {order.id}</p>
                                    <p className="text-sm text-gray-500">Date: {order.created_at?.toDate().toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                                        {order.payment_status.toUpperCase()}
                                    </p>
                                    <p className="text-sm font-semibold text-blue-900">Status: {order.order_status}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.product_name_snapshot} (Size: {item.size}) x {item.quantity}</span>
                                        <span>₹{item.line_total}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-2 border-t flex justify-between items-center bg-gray-50 p-2 rounded">
                                <span className="font-bold text-gray-700">Total</span>
                                <span className="font-bold text-blue-900 text-lg">₹{order.total_amount}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
