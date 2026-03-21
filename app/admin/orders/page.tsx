
"use client";
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Download, CheckCircle, Clock, Truck } from 'lucide-react';

export default function AdminOrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (user) fetchOrders();
    }, [user]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders", error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { order_status: status });
            fetchOrders(); // Refresh
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update status");
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const exportFn = httpsCallable(functions, 'exportOrdersCsv');
            const result = await exportFn({});
            const csvContent = (result.data as any).csv;

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
            alert("Export failed");
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-blue-900">Orders</h1>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
                >
                    {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} Export CSV
                </button>
            </div>

            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                            <tr>
                                <th className="px-6 py-3">Order ID</th>
                                <th className="px-6 py-3">Roll No</th>
                                <th className="px-6 py-3">Items</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3">Payment</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs">{order.id.substring(0, 8)}...</td>
                                    <td className="px-6 py-4">{order.user_roll_number}</td>
                                    <td className="px-6 py-4">
                                        {order.items.map((i: any, idx: number) => (
                                            <div key={idx} className="whitespace-nowrap">
                                                {i.quantity}x {i.product_name_snapshot} ({i.size})
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-6 py-4 font-bold">₹{order.total_amount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {order.payment_status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={order.order_status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            className="border rounded p-1 bg-white"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {new Date(order.created_at?.seconds * 1000).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {orders.length === 0 && <div className="p-10 text-center text-gray-500">No orders found.</div>}
            </div>
        </div>
    );
}
