
"use client";
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, Users, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const { role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role !== 'admin') {
            router.push('/login');
        }
    }, [role, loading, router]);

    if (loading) return null;

    const cards = [
        { title: 'Products', icon: Box, link: '/admin/products', desc: 'Manage inventory and pricing', color: 'bg-blue-100 text-blue-700' },
        { title: 'Orders', icon: ShoppingBag, link: '/admin/orders', desc: 'View orders and export CSV', color: 'bg-green-100 text-green-700' },
        { title: 'Students', icon: Users, link: '/admin/students', desc: 'Manage registered students', color: 'bg-purple-100 text-purple-700' },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-blue-900">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <Link href={card.link} key={card.title} className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${card.color}`}>
                                <card.icon size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-900 transition">{card.title}</h3>
                            <p className="text-gray-500 mt-2">{card.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
