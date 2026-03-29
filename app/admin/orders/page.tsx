"use client";
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Download, Package, Clock, CheckCircle, User } from 'lucide-react';
import { sendPickupNotification, sendCompletionNotification } from '@/lib/email';

export default function AdminOrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'orders'));
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a: any, b: any) => b.created_at?.seconds - a.created_at?.seconds);
            setOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (user) fetchOrders(); }, [user]);

    const updateStatus = async (order: any, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'orders', order.id), { order_status: newStatus });
            
            if (newStatus === 'ready_for_pickup') {
                await sendPickupNotification(order.user_email || order.guestDetail?.email, order.user_roll_number || order.guestDetail?.name, order.id);
            } else if (newStatus === 'completed') {
                await sendCompletionNotification(order.user_email || order.guestDetail?.email, order.user_roll_number || order.guestDetail?.name, order.id, order.total_amount);
            }
            fetchOrders();
        } catch (error) {
            console.error("Update failed", error);
            alert("Status update failed");
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
        } catch (error) {
            console.error("Export failed", error);
        } finally {
            setExporting(false);
        }
    };

    const displayOrders = orders.filter(o => activeTab === 'all' ? true : o.order_status === activeTab);

    if (loading && !orders.length) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold font-serif text-blue-900">Manage Orders</h1>
                <button onClick={handleExport} disabled={exporting} className="btn-primary">
                    {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} Export CSV
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'all', label: 'All Orders' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'ready_for_pickup', label: 'Ready for Pickup' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`admin-tab whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Order ID & Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Items Summary</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status & Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <p className="font-mono text-xs text-blue-900 font-bold mb-1">{order.id.slice(0, 8).toUpperCase()}</p>
                                        <p className="text-xs text-gray-500">{new Date(order.created_at?.seconds * 1000).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {order.user_id === 'guest' ? (
                                            <>
                                                <p className="font-bold text-orange-700 flex items-center gap-1"><User size={12}/> Guest: {order.guestDetail?.name || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{order.guestDetail?.email || 'N/A'}</p>
                                                <p className="text-[10px] text-gray-400">{order.guestDetail?.phone}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium text-gray-900">{order.user_roll_number}</p>
                                                <p className="text-xs text-gray-500">{order.user_email || 'No email'}</p>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {order.items.map((i: any, idx: number) => (
                                            <div key={idx} className="mb-2 text-xs text-gray-700">
                                                <span className="font-semibold">{i.quantity}x</span> {i.product_name_snapshot} ({i.size})
                                                
                                                {/* Legacy Custom Field */}
                                                {i.customizationText && typeof i.customizationText === 'string' && (
                                                    <span className="block text-blue-600 ml-4 border-l-2 pl-2 mt-0.5 border-blue-200 bg-blue-50 py-0.5 rounded-r">
                                                        "Legacy Custom: {i.customizationText}"
                                                    </span>
                                                )}

                                                {/* New Multi-field Hash */}
                                                {i.customizationTexts && (
                                                    <div className="ml-4 mt-1 border-l-2 border-orange-200 pl-2 space-y-0.5">
                                                        {Object.entries(i.customizationTexts).map(([label, val]) => (
                                                            <div key={label} className="text-[11px] bg-orange-50/50 rounded-r py-0.5 px-2">
                                                                <b className="text-orange-800">{label}:</b> "{val as string}"
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-orange-600">₹{order.total_amount}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2 items-start">
                                            <span className={`status-badge status-${order.order_status}`}>
                                                {order.order_status.replace(/_/g, ' ')}
                                            </span>
                                            
                                            {/* Smart Action Buttons */}
                                            {order.order_status === 'pending' && (
                                                <div className="flex gap-1 mt-1">
                                                    <button onClick={() => updateStatus(order, 'ready_for_pickup')} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Mark Ready</button>
                                                    <button onClick={() => updateStatus(order, 'cancelled')} className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50">Cancel</button>
                                                </div>
                                            )}
                                            {order.order_status === 'ready_for_pickup' && (
                                                <button onClick={() => updateStatus(order, 'completed')} className="text-xs px-2 py-1 mt-1 rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium">Complete Order</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {displayOrders.length === 0 && <div className="p-16 text-center text-gray-400">No orders matching filter.</div>}
            </div>
        </div>
    );
}
