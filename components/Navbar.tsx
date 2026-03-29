"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { ShoppingCart, Menu, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const { user, role, loading } = useAuth();
    const { cart } = useCart();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (loading) return null;

    const isHomePage = pathname === '/';

    return (
        <nav
            style={{
                background: scrolled ? 'rgba(248,246,240,0.95)' : 'transparent',
                borderBottom: scrolled ? '1px solid var(--hbt-border)' : 'none',
                color: 'var(--hbt-orange)',
                position: isHomePage ? 'fixed' : 'sticky',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                transition: 'all 0.3s ease',
                backdropFilter: scrolled ? 'blur(12px)' : 'none',
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 flex-shrink-0">
                        <div className="relative h-10 w-10 shrink-0">
                            <Image
                                src="/collegelogo.png"
                                alt="HBT Logo"
                                width={40}
                                height={40}
                                className="object-contain"
                            />
                        </div>
                        <span className="text-2xl hidden md:block tracking-wide">
                            HBTMC GYMKHANA EMPORIUM
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {!user ? (
                            <>
                                <Link href="/login" className="text-[1.1rem] hover:opacity-70 transition-opacity">Login</Link>
                                <Link href="/register" className="text-[1.1rem] hover:opacity-70 transition-opacity">Register</Link>
                            </>
                        ) : (
                            <>
                                {role === 'student' && (
                                    <>
                                        <Link href="/dashboard" className="text-[1.1rem] hover:opacity-70 transition-opacity">Shop</Link>
                                        <Link href="/orders" className="text-[1.1rem] hover:opacity-70 transition-opacity">My Orders</Link>
                                        <Link href="/cart" className="relative flex items-center gap-1.5 text-[1.1rem] hover:opacity-70 transition-opacity">
                                            <ShoppingCart size={20} />
                                            <span>Cart</span>
                                            {cartCount > 0 && (
                                                <span className="absolute -top-2 -right-3 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                                                    style={{ background: 'var(--hbt-orange)' }}>
                                                    {cartCount}
                                                </span>
                                            )}
                                        </Link>
                                    </>
                                )}
                                {role === 'admin' && (
                                    <>
                                        <Link href="/admin/dashboard" className="text-[1.1rem] hover:opacity-70 transition-opacity">Dashboard</Link>
                                        <Link href="/admin/products" className="text-[1.1rem] hover:opacity-70 transition-opacity">Products</Link>
                                        <Link href="/admin/orders" className="text-[1.1rem] hover:opacity-70 transition-opacity">Orders</Link>
                                        <Link href="/admin/students" className="text-[1.1rem] hover:opacity-70 transition-opacity">Students</Link>
                                    </>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 text-[1.1rem] hover:opacity-70 transition-opacity text-red-500"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center gap-3">
                        {role === 'student' && (
                            <Link href="/cart" className="relative">
                                <ShoppingCart size={22} />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                                        style={{ background: 'var(--hbt-orange)', fontSize: '0.65rem' }}>
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        <button onClick={() => setIsOpen(!isOpen)} className="p-1">
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden border-t" style={{ background: 'var(--background)', color: 'var(--hbt-orange)', borderColor: 'var(--hbt-border)' }}>
                    <div className="px-4 py-4 space-y-2">
                        {!user ? (
                            <>
                                <Link href="/login" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Login</Link>
                                <Link href="/register" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Register</Link>
                            </>
                        ) : (
                            <>
                                {role === 'student' && (
                                    <>
                                        <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Shop</Link>
                                        <Link href="/orders" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">My Orders</Link>
                                        <Link href="/cart" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Cart {cartCount > 0 && `(${cartCount})`}</Link>
                                    </>
                                )}
                                {role === 'admin' && (
                                    <>
                                        <Link href="/admin/dashboard" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Dashboard</Link>
                                        <Link href="/admin/products" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Products</Link>
                                        <Link href="/admin/orders" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Orders</Link>
                                        <Link href="/admin/students" onClick={() => setIsOpen(false)} className="block px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50">Students</Link>
                                    </>
                                )}
                                <button
                                    onClick={() => { handleLogout(); setIsOpen(false); }}
                                    className="block w-full text-left px-4 py-2.5 rounded-lg font-medium text-red-500 hover:bg-red-50"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
