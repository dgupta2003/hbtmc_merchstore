"use client";
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Trash2, ShoppingBag, ArrowRight, Pencil, Info } from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';
import { sendOrderConfirmation } from '@/lib/email';

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

    // Guest Support State
    const [guestMode, setGuestMode] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    
    const allFeatured = cart.every(item => item.is_featured);

    useEffect(() => {
        if (!user && allFeatured && cart.length > 0) {
            setGuestMode(true);
        } else {
            setGuestMode(false);
        }
    }, [user, allFeatured, cart]);

    const handleCheckout = async () => {
        if (!user && !guestMode) {
            router.push('/login');
            return;
        }
        
        if (guestMode && (!guestName || !guestEmail)) {
            alert('Please enter your name and email for the receipt.');
            return;
        }

        setProcessing(true);

        try {
            // Pick correct Cloud Function based on Auth State
            const fnName = user ? 'createRazorpayOrder' : 'createGuestRazorpayOrder';
            const createOrderFn = httpsCallable(functions, fnName);
            
            const orderItems = cart.map(item => ({
                productId: item.id,
                size: item.selectedSize,
                quantity: item.quantity,
                customizationTexts: item.customizationTexts || {}, // new structure
                customizationText: item.customizationText || '', // legacy fallback
            }));

            // Build request payload
            const payload: any = { items: orderItems };
            if (guestMode) {
                payload.guestEmail = guestEmail;
                payload.guestName = guestName;
                payload.guestPhone = guestPhone;
            }

            const response = await createOrderFn(payload);
            const { razorpay_order_id, amount, currency, key_id, order_db_id } = response.data as any;

            const options = {
                key: key_id,
                amount,
                currency,
                name: "HBTMC GYMKHANA EMPORIUM",
                description: "Products Purchase",
                order_id: razorpay_order_id,
                handler: async function (response: any) {
                    try {
                        const verifyFnName = user ? 'verifyRazorpayPayment' : 'verifyGuestRazorpayPayment';
                        const verifyFn = httpsCallable(functions, verifyFnName);
                        await verifyFn({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            order_db_id,
                        });

                        // Send email confirmation
                        const emailTarget = user ? user.email : guestEmail;
                        const nameTarget = user ? user.displayName || 'Student' : guestName;
                        if (emailTarget) {
                            sendOrderConfirmation(
                                emailTarget,
                                nameTarget,
                                order_db_id,
                                cartTotal
                            );
                        }

                        clearCart();
                        if (user) {
                            router.push('/orders');
                        } else {
                            // Guest fallback UI (can't view /orders)
                            alert('Payment Successful! A receipt has been sent to your email.');
                            router.push('/');
                        }
                    } catch (err) {
                        alert('Payment verification failed. Please contact support.');
                        console.error(err);
                    }
                },
                prefill: {
                    name: user ? (user.displayName || '') : guestName,
                    email: user ? (user.email || '') : guestEmail,
                    contact: guestPhone
                },
                theme: { color: "#1a2e5a" },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', (r: any) => {
                alert(`Payment Failed: ${r.error.description}`);
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <ShoppingBag size={56} className="mb-6" style={{ color: 'var(--hbt-border)' }} />
                <h2 className="section-title text-3xl font-bold mb-3">
                    Your cart is empty
                </h2>
                <p className="mb-8" style={{ color: 'var(--hbt-muted)' }}>Add some products to get started.</p>
                <Link href="/dashboard" className="btn-navy">
                    Browse Products <ArrowRight size={16} />
                </Link>
            </div>
        );
    }

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
                <div className="mb-10">
                    <p className="section-eyebrow mb-2">Review & Pay</p>
                    <h1 className="section-title">Shopping Cart</h1>
                </div>

                {!user && !allFeatured && (
                    <div className="mb-6 p-4 rounded-xl flex items-start gap-4" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                        <Info className="flex-shrink-0 text-orange-600 mt-0.5" />
                        <div>
                            <p className="font-bold text-orange-800">Login Required</p>
                            <p className="text-sm text-orange-700">Your cart contains exclusive student products. Please login to continue.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Items List */}
                    <div className="lg:col-span-2 space-y-4">
                        {cart.map((item) => {
                            // unique key generation
                            const customStr = item.customizationTexts ? JSON.stringify(item.customizationTexts) : item.customizationText || '';
                            return (
                                <div
                                    key={`${item.id}-${item.selectedSize}-${customStr}`}
                                    className="flex items-start gap-4 bg-white p-5 rounded-2xl"
                                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid var(--hbt-border)' }}
                                >
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-base" style={{ color: 'var(--hbt-navy)' }}>{item.name}</h3>
                                                <p className="text-sm mt-0.5" style={{ color: 'var(--hbt-muted)' }}>
                                                    Size: {item.selectedSize} · Qty: {item.quantity}
                                                </p>
                                                
                                                {/* Multiple Customizations Display */}
                                                {item.customizationTexts && Object.entries(item.customizationTexts).map(([label, val]) => (
                                                    <div key={label} className="flex items-center gap-1.5 mt-1.5 text-xs px-2 py-1 rounded-full inline-flex mr-2"
                                                        style={{ background: 'rgba(26,46,90,0.08)', color: 'var(--hbt-navy)' }}>
                                                        <Pencil size={10} /> {label}: "{val}"
                                                    </div>
                                                ))}

                                                {/* Legacy Customization Display */}
                                                {item.customizationText && !item.customizationTexts && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 text-xs px-2 py-1 rounded-full inline-flex"
                                                        style={{ background: 'rgba(26,46,90,0.08)', color: 'var(--hbt-navy)' }}>
                                                        <Pencil size={10} /> Custom: "{item.customizationText}"
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-lg ml-4" style={{ color: 'var(--hbt-orange)' }}>
                                                ₹{item.price_inr * item.quantity}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.id, item.selectedSize, item.customizationTexts)}
                                        className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Order Summary & Guest Form */}
                    <div className="lg:col-span-1 space-y-6">
                        {guestMode && (
                            <div className="bg-white rounded-2xl p-6"
                                style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid var(--hbt-border)' }}>
                                <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--hbt-orange)' }}>
                                    Guest Details
                                </h2>
                                <div className="space-y-4">
                                    <input type="text" placeholder="Full Name" className="premium-input text-sm" value={guestName} onChange={e=>setGuestName(e.target.value)} required />
                                    <input type="email" placeholder="Email Address" className="premium-input text-sm" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} required />
                                    <input type="tel" placeholder="Phone Number" className="premium-input text-sm" value={guestPhone} onChange={e=>setGuestPhone(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl p-6 sticky top-24"
                            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid var(--hbt-border)' }}>
                            <h2 className="font-bold text-xl mb-6" style={{ color: 'var(--hbt-orange)' }}>
                                Order Summary
                            </h2>

                            <div className="space-y-3 mb-6 pb-6 border-b" style={{ borderColor: 'var(--hbt-border)' }}>
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span style={{ color: 'var(--hbt-muted)' }}>{item.name} ×{item.quantity}</span>
                                        <span style={{ color: 'var(--hbt-text)' }}>₹{item.price_inr * item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mb-8">
                                <span className="font-bold text-lg" style={{ color: 'var(--hbt-navy)' }}>Total</span>
                                <span className="font-bold text-2xl" style={{ color: 'var(--hbt-orange)' }}>₹{cartTotal}</span>
                            </div>

                            {!user && !guestMode ? (
                                <Link href="/login" className="btn-navy w-full justify-center">Login to Proceed</Link>
                            ) : (
                                <button
                                    onClick={handleCheckout}
                                    disabled={processing}
                                    className="btn-primary w-full justify-center disabled:opacity-50"
                                >
                                    {processing ? <Loader2 className="animate-spin" size={18} /> : <>Pay Now <ArrowRight size={16} /></>}
                                </button>
                            )}

                            <p className="text-xs text-center mt-4" style={{ color: 'var(--hbt-muted)' }}>
                                Pickup: Male Common Room, 1st Floor, Main Building
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
