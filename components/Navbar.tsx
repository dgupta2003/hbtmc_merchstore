"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { LogOut, ShoppingCart, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    if (loading) return null;

    return (
        <nav className="bg-blue-900 text-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0 flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="relative h-10 w-10 bg-white rounded-full p-1 overflow-hidden">
                                {/* Using the uploaded logo. Ensure it exists in public/ */}
                                <Image
                                    src="/collegelogo.png"
                                    alt="HBT Logo"
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                />
                            </div>
                            <span className="font-bold text-lg hidden sm:block">HBT Merch Store</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {!user ? (
                            <Link href="/login" className="hover:text-blue-200">Login</Link>
                        ) : (
                            <>
                                {role === 'student' && (
                                    <>
                                        <Link href="/dashboard" className="hover:text-blue-200">Products</Link>
                                        <Link href="/orders" className="hover:text-blue-200">My Orders</Link>
                                        <Link href="/cart" className="hover:text-blue-200 flex items-center gap-1">
                                            <ShoppingCart size={20} /> Cart
                                        </Link>
                                    </>
                                )}
                                {role === 'admin' && (
                                    <>
                                        <Link href="/admin/dashboard" className="hover:text-blue-200">Dashboard</Link>
                                        <Link href="/admin/products" className="hover:text-blue-200">Products</Link>
                                        <Link href="/admin/orders" className="hover:text-blue-200">Orders</Link>
                                        <Link href="/admin/students" className="hover:text-blue-200">Students</Link>
                                    </>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1 hover:text-red-300 ml-4"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-gray-200 p-2">
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-blue-800 px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {!user ? (
                        <Link href="/login" className="block px-3 py-2 rounded-md hover:bg-blue-700">Login</Link>
                    ) : (
                        <>
                            {role === 'student' && (
                                <>
                                    <Link href="/dashboard" className="block px-3 py-2 rounded-md hover:bg-blue-700">Products</Link>
                                    <Link href="/orders" className="block px-3 py-2 rounded-md hover:bg-blue-700">My Orders</Link>
                                    <Link href="/cart" className="block px-3 py-2 rounded-md hover:bg-blue-700">Cart</Link>
                                </>
                            )}
                            {role === 'admin' && (
                                <>
                                    <Link href="/admin/dashboard" className="block px-3 py-2 rounded-md hover:bg-blue-700">Dashboard</Link>
                                    <Link href="/admin/products" className="block px-3 py-2 rounded-md hover:bg-blue-700">Products</Link>
                                    <Link href="/admin/orders" className="block px-3 py-2 rounded-md hover:bg-blue-700">Orders</Link>
                                    <Link href="/admin/students" className="block px-3 py-2 rounded-md hover:bg-blue-700">Students</Link>
                                </>
                            )}
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left px-3 py-2 rounded-md hover:bg-red-700 text-red-200"
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
