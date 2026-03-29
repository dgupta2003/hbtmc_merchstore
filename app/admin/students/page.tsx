"use client";
import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Trash2, Upload, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';

export default function AdminStudentsPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // CSV Upload State
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploadingCsv, setUploadingCsv] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ imported: number, failed: number } | null>(null);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setStudents(data.filter((u: any) => u.role === 'student').sort((a: any, b: any) => b.created_at?.seconds - a.created_at?.seconds));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (user) fetchStudents(); }, [user]);

    const handleDelete = async (uid: string) => {
        if (!confirm("Delete this student permanently?")) return;
        setActionLoading(uid);
        try {
            const deleteFn = httpsCallable(functions, 'deleteStudentAccount');
            await deleteFn({ targetUid: uid });
            fetchStudents();
        } catch (error) {
            alert("Delete failed.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCsvUpload = async () => {
        if (!csvFile) return;
        setUploadingCsv(true);
        setUploadResult(null);

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const parsedStudents = results.data.map((row: any) => {
                    // Handle variations in CSV headers
                    const rollNumber = row['Roll Number'] || row['ROLL NUMBER'] || row['roll_number'] || row['Roll No'];
                    const name = row['Name'] || row['NAME'] || row['name'];
                    return { roll_number: rollNumber?.toString().trim(), name: name?.trim() };
                }).filter(s => s.roll_number);

                if (parsedStudents.length === 0) {
                    alert("No valid students found. Ensure headers are 'Roll Number' and 'Name'.");
                    setUploadingCsv(false);
                    return;
                }

                try {
                    const importFn = httpsCallable(functions, 'importAllowedStudents');
                    const res = await importFn({ students: parsedStudents });
                    setUploadResult(res.data as any);
                    setCsvFile(null); // Reset file input
                } catch (error: any) {
                    console.error("CSV Import Error:", error);
                    alert("Import failed: " + error.message);
                } finally {
                    setUploadingCsv(false);
                }
            },
            error: (error) => {
                alert("Error parsing CSV: " + error.message);
                setUploadingCsv(false);
            }
        });
    };

    if (loading && !students.length) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-serif text-blue-900">Registered Students</h1>
            </div>

            {/* CSV Import Section */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="bg-blue-50 p-4 rounded-full text-blue-900 hidden md:block">
                    <Users size={32} />
                </div>
                <div className="flex-grow">
                    <h3 className="font-bold text-lg text-blue-900">Import allowed students</h3>
                    <p className="text-sm text-gray-500 mb-4">Upload a CSV file containing <code className="bg-gray-100 px-1 rounded text-xs text-orange-600">Roll Number</code> and <code className="bg-gray-100 px-1 rounded text-xs text-orange-600">Name</code> columns.</p>
                    
                    <div className="flex gap-3 items-center">
                        <input 
                            type="file" 
                            accept=".csv" 
                            onChange={e => setCsvFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        <button 
                            onClick={handleCsvUpload} 
                            disabled={!csvFile || uploadingCsv}
                            className="btn-navy whitespace-nowrap px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploadingCsv ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18}/>}
                            Upload CSV
                        </button>
                    </div>

                    {uploadResult && (
                        <div className="mt-4 p-3 rounded-lg border bg-gray-50 text-sm flex gap-6">
                            <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle size={16}/> Imported: <b>{uploadResult.imported}</b></span>
                            <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle size={16}/> Skipped/Failed: <b>{uploadResult.failed}</b></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Roll Number</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Auth Email</th>
                                <th className="px-6 py-4">Registered On</th>
                                <th className="px-6 py-4 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-mono font-bold text-blue-900">{student.roll_number}</td>
                                    <td className="px-6 py-4 font-medium">{student.name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-500">{student.email}</td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {student.created_at ? new Date(student.created_at.seconds * 1000).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleDelete(student.id)}
                                            disabled={actionLoading === student.id}
                                            className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            {actionLoading === student.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {students.length === 0 && <div className="p-16 text-center text-gray-400">No students registered yet.</div>}
            </div>
        </div>
    );
}
