
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, IdTokenResult } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    role: 'student' | 'admin' | null;
    loading: boolean;
    userData: any; // Additional firestore data
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    userData: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'student' | 'admin' | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // 1. Get Custom Claims for Role
                const tokenResult: IdTokenResult = await currentUser.getIdTokenResult();
                const customRole = tokenResult.claims.role as 'student' | 'admin' | undefined;

                // 2. Fetch User Data from Firestore
                // Note: For students, we might want their Order History etc directly or just profile
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);
                        if (data.role) {
                            setRole(data.role as 'student' | 'admin');
                        } else if (customRole) {
                            setRole(customRole);
                        }
                    } else if (customRole === 'admin') {
                        // Admin might not have a user doc if manually set, but let's assume valid
                        setRole('admin');
                    }
                } catch (e) {
                    console.error("Error fetching user profile", e);
                }
            } else {
                setRole(null);
                setUserData(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, role, loading, userData }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
