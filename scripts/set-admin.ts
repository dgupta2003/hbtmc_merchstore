
import * as admin from 'firebase-admin';

import * as path from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require(path.join(process.cwd(), 'service-account.json'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const email = process.argv[2];

if (!email) {
    console.error('Usage: npx tsx scripts/set-admin.ts <email>');
    process.exit(1);
}

async function setAdminRequest() {
    try {
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log(`Found existing user with UID: ${user.uid}`);
        } catch (authError: any) {
            if (authError.code === 'auth/user-not-found') {
                console.log(`User not found in Auth. Creating new user for ${email}...`);
                user = await admin.auth().createUser({
                    email: email,
                    emailVerified: true,
                    password: 'TemporaryPassword123!', // Admin can reset this later via password reset flow
                    displayName: 'Store Admin'
                });
                console.log(`Created new Auth user with UID: ${user.uid}`);
            } else {
                throw authError; // Re-throw other Auth errors
            }
        }

        // Set Custom Claim
        await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
        
        // Ensure a profile exists in Firestore so the frontend doesn't throw "profile not found"
        const db = admin.firestore();
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: email,
            role: 'admin',
            name: user.displayName || 'Store Admin',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // Use merge so we don't accidentally overwrite existing data entirely

        console.log(`Successfully granted admin role and verified Firestore profile for ${email}`);
    } catch (error) {
        console.error('Error setting admin role:', error);
    }
}

setAdminRequest();
