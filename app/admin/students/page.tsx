
"use client";
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Trash2 } from 'lucide-react';

export default function AdminStudentsPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchStudents();
    }, [user]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('created_at', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter mainly for role=student if admins also in collection
            setStudents(data.filter((u: any) => u.role === 'student'));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) return;

        setActionLoading(uid);
        try {
            const deleteFn = httpsCallable(functions, 'deleteStudentAccount');
            await deleteFn({ targetUid: uid });
            fetchStudents();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete student.");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-blue-900">Registered Students</h1>

            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                            <tr>
                                <th className="px-6 py-3">Roll Number</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Registered At</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono">{student.roll_number}</td>
                                    <td className="px-6 py-4">{student.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{student.email}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">
                                        {student.created_at ? new Date(student.created_at.seconds * 1000).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(student.id)}
                                            disabled={actionLoading === student.id}
                                            className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50"
                                        >
                                            {actionLoading === student.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {students.length === 0 && <div className="p-10 text-center text-gray-500">No students found.</div>}
            </div>
        </div>
    );
}
