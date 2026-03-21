
"use client";
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import Script from 'next/script';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function CartPage() {
    const { cart, removeFromCart, clearCart, cartTotal } = useCart();
    const { user } = useAuth();
    const router = useRouter();
    const [processing, setProcessing] = useState(false);

    const handleCheckout = async () => {
        if (!user) return;
        setProcessing(true);

        try {
            // 1. Create Order on Backend
            const createOrderFn = httpsCallable(functions, 'createRazorpayOrder');
            const orderItems = cart.map(item => ({
                productId: item.id,
                size: item.selectedSize,
                quantity: item.quantity
            }));

            const response = await createOrderFn({ items: orderItems });
            const { razorpay_order_id, amount, currency, key_id, order_db_id } = response.data as any;

            // 2. Open Razorpay
            const options = {
                key: key_id,
                amount: amount,
                currency: currency,
                name: "HBT Merch Store",
                description: "Merchandise Purchase",
                order_id: razorpay_order_id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    try {
                        const verifyFn = httpsCallable(functions, 'verifyRazorpayPayment');
                        await verifyFn({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            order_db_id: order_db_id
                        });

                        clearCart();
                        router.push('/orders');
                    } catch (err) {
                        alert('Payment verification failed. Please contact support.');
                        console.error(err);
                    }
                },
                prefill: {
                    name: user.displayName || '',
                    email: user.email || '',
                },
                theme: {
                    color: "#1e3a8a" // Blue-900
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                alert(`Payment Failed: ${response.error.description}`);
            });
            rzp1.open();

        } catch (error: any) {
            console.error("Checkout Error:", error);
            alert(error.message || "Checkout failed.");
        } finally {
            setProcessing(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-400">Your cart is empty</h2>
            </div>
        );
    }

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-blue-900 mb-8">Shopping Cart</h1>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-6 space-y-6">
                        {cart.map((item, idx) => (
                            <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between items-center pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                                    <p className="text-sm text-gray-500">Size: {item.selectedSize} | Quantity: {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-semibold text-lg text-gray-700">₹{item.price_inr * item.quantity}</span>
                                    <button
                                        onClick={() => removeFromCart(item.id, item.selectedSize)}
                                        className="text-red-400 hover:text-red-600 p-2"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-2xl font-bold text-gray-800">
                            Total: <span className="text-blue-900">₹{cartTotal}</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={processing}
                            className="px-8 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {processing ? <Loader2 className="animate-spin" /> : 'Pay Now'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
