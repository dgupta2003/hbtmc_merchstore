
"use client";
import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [name, setName] = useState(''); // Optional as per prompt, but "if you also collect NAME... validate"
    // User prompt: "at registration, must pass roll number verification... if you also collect NAME at signup, validate NAME"
    // Let's collect Name to be robust.

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Call Cloud Function to Verify & Create Profile
            const verifyProfile = httpsCallable(functions, 'verifyAndCreateStudentProfile');

            try {
                await verifyProfile({
                    rollNumber,
                    name
                });
            } catch (fnError: any) {
                // If verification fails, delete the auth user to prevent "zombie" accounts
                // or leave it but they can't do anything. Better to cleanup.
                await user.delete();
                // Map Cloud Function errors
                if (fnError.message) {
                    throw new Error(fnError.message);
                }
                throw new Error('Verification failed. Please check your details.');
            }

            // 3. Send Verification Email
            await sendEmailVerification(user);

            // 4. Force Sign Out (so they login again after verification)
            await signOut(auth);

            setSuccess(true);

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Email is already registered.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-full max-w-md p-8 text-center bg-white rounded-xl shadow-lg border border-green-100">
                    <div className="flex justify-center mb-4 text-green-600">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-green-800 mb-2">Registration Successful!</h2>
                    <p className="text-gray-600 mb-6">
                        We have sent a verification email to <strong>{email}</strong>.
                        Please verify your email before logging in.
                    </p>
                    <Link href="/login" className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold text-center text-blue-900">Student Registration</h2>

                {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                        <input
                            type="text"
                            required
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. 2023001"
                        />
                        <p className="text-xs text-gray-500 mt-1">Must match the official list.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input
                            type="text"
                            required // "if you also collect NAME... validate". I'll require it for better matching.
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="As per college records"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="student@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Min 6 characters"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying & Registering...' : 'Register'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-600">
                    Already verified? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    );
}
