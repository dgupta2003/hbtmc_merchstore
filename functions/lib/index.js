"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayWebhook = exports.exportOrdersCsv = exports.deleteStudentAccount = exports.importAllowedStudents = exports.verifyGuestRazorpayPayment = exports.createGuestRazorpayOrder = exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.verifyAndCreateStudentProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto = __importStar(require("crypto"));
// Re-deploy trigger to pick up new .env variables
admin.initializeApp();
const db = admin.firestore();
// Initialize Razorpay
// Note: secure these keys in production via environment variables
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || 'replace_me',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'replace_me',
});
/**
 * Verify roll number and create student profile.
 * Called after user signs up with Email/Password.
 */
exports.verifyAndCreateStudentProfile = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { rollNumber, name } = data;
    const uid = context.auth.uid;
    const email = context.auth.token.email;
    if (!rollNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Roll number is required.');
    }
    // 1. Check if roll number exists in allowed_students
    const allowedStudentDoc = await db.collection('allowed_students').doc(rollNumber).get();
    if (!allowedStudentDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Roll number not found in allowed list.');
    }
    const allowedData = allowedStudentDoc.data();
    // 2. Optional: Check name match (case-insensitive)
    if (name && (allowedData === null || allowedData === void 0 ? void 0 : allowedData.name_normalized)) {
        const inputNameClean = name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
        const allowedNameClean = allowedData.name_normalized.replace(/\s*\(.*?\)\s*/g, '').trim();
        if (inputNameClean !== allowedNameClean) {
            throw new functions.https.HttpsError('invalid-argument', 'Name does not match our records for this roll number.');
        }
    }
    // 3. Create User Profile
    const batch = db.batch();
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
        uid,
        email,
        roll_number: rollNumber,
        name: (allowedData === null || allowedData === void 0 ? void 0 : allowedData.raw_name) || name || '',
        role: 'student',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 4. Set Custom Claim for role=student
    await admin.auth().setCustomUserClaims(uid, { role: 'student' });
    await batch.commit();
    return { success: true, message: 'Profile created.' };
});
/**
 * Create Razorpay Order.
 * Validates stock and creates order in Firestore and Razorpay.
 */
exports.createRazorpayOrder = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // Verify email verification
    if (!context.auth.token.email_verified) {
        throw new functions.https.HttpsError('permission-denied', 'Email must be verified to place orders.');
    }
    const { items } = data; // Array of { productId, size, quantity }
    const uid = context.auth.uid;
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No items in order.');
    }
    // Fetch user details for roll number
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'student') {
        throw new functions.https.HttpsError('permission-denied', 'Only students can place orders.');
    }
    let totalAmount = 0;
    const orderItems = [];
    // Validate items and calculate total
    for (const item of items) {
        const productDoc = await db.collection('products').doc(item.productId).get();
        if (!productDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found.`);
        }
        const productData = productDoc.data();
        if (!productData.is_active) {
            throw new functions.https.HttpsError('failed-precondition', `Product ${productData.name} is not active.`);
        }
        // Check size if applicable
        if (productData.sizes && productData.sizes.length > 0 && !productData.sizes.includes(item.size)) {
            throw new functions.https.HttpsError('invalid-argument', `Size ${item.size} not available for ${productData.name}.`);
        }
        const price = productData.price_inr;
        const lineTotal = price * item.quantity;
        totalAmount += lineTotal;
        orderItems.push({
            product_id: item.productId,
            product_name_snapshot: productData.name,
            category_snapshot: productData.category || 'merchandise',
            size: item.size,
            quantity: item.quantity,
            unit_price_snapshot: price,
            line_total: lineTotal,
            image_url: productData.image_url || ''
        });
    }
    // Create Razorpay Order
    const options = {
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${uid.substring(0, 5)}`,
        notes: {
            uid: uid,
            roll_number: userData.roll_number
        }
    };
    try {
        const order = await razorpay.orders.create(options);
        // Save preliminary order to Firestore
        const orderRef = db.collection('orders').doc();
        await orderRef.set({
            user_id: uid,
            user_roll_number: userData.roll_number,
            items: orderItems,
            total_amount: totalAmount,
            payment_provider: 'razorpay',
            razorpay_order_id: order.id,
            payment_status: 'created',
            order_status: 'pending',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            razorpay_order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
            order_db_id: orderRef.id
        };
    }
    catch (error) {
        console.error("Razorpay Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to create Razorpay order.');
    }
});
/**
 * Verify Razorpay Payment.
 * Verifies signature and updates order status.
 */
exports.verifyRazorpayPayment = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_db_id } = data;
    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');
    if (generated_signature === razorpay_signature) {
        // Payment successful
        await db.collection('orders').doc(order_db_id).update({
            payment_status: 'paid',
            razorpay_payment_id: razorpay_payment_id,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    else {
        await db.collection('orders').doc(order_db_id).update({
            payment_status: 'failed',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new functions.https.HttpsError('invalid-argument', 'Payment verification failed: Signature mismatch.');
    }
});
/**
 * Create Guest Razorpay Order (Unauthenticated).
 * Validates stock, ensures all items are featured, and creates order.
 */
exports.createGuestRazorpayOrder = functions.region('asia-south1').https.onCall(async (data, context) => {
    const { items, guestName, guestEmail, guestPhone } = data;
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No items in order.');
    }
    if (!guestName || !guestEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'Guest details (name, email) are required.');
    }
    let totalAmount = 0;
    const orderItems = [];
    // Validate items
    for (const item of items) {
        const productDoc = await db.collection('products').doc(item.productId).get();
        if (!productDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found.`);
        }
        const productData = productDoc.data();
        if (!productData.is_active) {
            throw new functions.https.HttpsError('failed-precondition', `Product ${productData.name} is not active.`);
        }
        if (!productData.is_featured) {
            throw new functions.https.HttpsError('permission-denied', `Product ${productData.name} is not available for guest checkout.`);
        }
        if (productData.sizes && productData.sizes.length > 0 && !productData.sizes.includes(item.size)) {
            throw new functions.https.HttpsError('invalid-argument', `Size ${item.size} not available for ${productData.name}.`);
        }
        const price = productData.price_inr;
        const lineTotal = price * item.quantity;
        totalAmount += lineTotal;
        orderItems.push({
            product_id: item.productId,
            product_name_snapshot: productData.name,
            category_snapshot: productData.category || 'merchandise',
            size: item.size,
            quantity: item.quantity,
            unit_price_snapshot: price,
            line_total: lineTotal,
            image_url: productData.image_url || '',
            customizationTexts: item.customizationTexts || {},
            customizationText: item.customizationText || '',
        });
    }
    const options = {
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}_guest`,
        notes: { email: guestEmail, name: guestName }
    };
    try {
        const order = await razorpay.orders.create(options);
        const orderRef = db.collection('orders').doc();
        await orderRef.set({
            user_id: 'guest',
            guestDetail: { name: guestName, email: guestEmail, phone: guestPhone || '' },
            items: orderItems,
            total_amount: totalAmount,
            payment_provider: 'razorpay',
            razorpay_order_id: order.id,
            payment_status: 'created',
            order_status: 'pending',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            razorpay_order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
            order_db_id: orderRef.id
        };
    }
    catch (error) {
        console.error("Razorpay Guest Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to create guest Razorpay order.');
    }
});
/**
 * Verify Guest Razorpay Payment.
 */
exports.verifyGuestRazorpayPayment = functions.region('asia-south1').https.onCall(async (data, context) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_db_id } = data;
    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');
    if (generated_signature === razorpay_signature) {
        await db.collection('orders').doc(order_db_id).update({
            payment_status: 'paid',
            razorpay_payment_id: razorpay_payment_id,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    else {
        await db.collection('orders').doc(order_db_id).update({
            payment_status: 'failed',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new functions.https.HttpsError('invalid-argument', 'Payment verification failed: Signature mismatch.');
    }
});
/**
 * Handle CSV import of students (Admin only).
 * Accepts JSON array of {roll_number, name}.
 */
exports.importAllowedStudents = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }
    const { students } = data; // Array of objects
    if (!students || !Array.isArray(students)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid data format.');
    }
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let total = 0;
    for (const student of students) {
        if (!student.roll_number)
            continue;
        const ref = db.collection('allowed_students').doc(String(student.roll_number));
        batch.set(ref, {
            roll_number: String(student.roll_number),
            raw_name: student.name || '',
            name_normalized: student.name ? student.name.trim().toLowerCase() : '',
        });
        count++;
        total++;
        if (count >= batchSize) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
    return { success: true, count: total };
});
/**
 * Delete Student Account (Admin only).
 */
exports.deleteStudentAccount = functions.region('asia-south1').https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }
    const { targetUid } = data;
    // Delete from Auth
    await admin.auth().deleteUser(targetUid);
    // Delete from Firestore (users collection)
    await db.collection('users').doc(targetUid).delete();
    return { success: true };
});
/**
 * Export Orders to CSV (Admin only).
 * Returns a CSV string.
 */
exports.exportOrdersCsv = functions.region('asia-south1').https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }
    const { status, exportCategory } = data;
    let query = db.collection('orders').orderBy('created_at', 'desc');
    if (status && status !== 'all') {
        query = query.where('order_status', '==', status);
    }
    const snapshot = await query.get();
    const lines = ['Order ID,Date,Roll Number,Student/Guest Email,Category,Product,Size,Quantity,Line Total,Order Status,Payment Status'];
    for (const doc of snapshot.docs) {
        const order = doc.data();
        const date = ((_a = order.created_at) === null || _a === void 0 ? void 0 : _a.toDate().toISOString()) || '';
        // Flatten items
        for (const item of order.items) {
            const itemCat = item.category_snapshot || 'merchandise';
            if (exportCategory && exportCategory !== 'all' && itemCat !== exportCategory) {
                continue;
            }
            const identity = order.user_id === 'guest' ? 'GUEST' : (order.user_roll_number || 'N/A');
            const userContact = order.user_id === 'guest' ? (((_b = order.guestDetail) === null || _b === void 0 ? void 0 : _b.email) || 'N/A') : (order.user_email || 'N/A');
            const line = [
                doc.id,
                date,
                identity,
                userContact,
                itemCat,
                item.product_name_snapshot,
                item.size,
                item.quantity,
                item.line_total,
                order.order_status,
                order.payment_status
            ].map(f => `"${f}"`).join(',');
            lines.push(line);
        }
    }
    return { csv: lines.join('\n') };
});
// Webhook for Razorpay (Optional but Recommended)
exports.razorpayWebhook = functions.region('asia-south1').https.onRequest(async (req, res) => {
    try {
        const body = req.body;
        if (body.event === 'payment.captured' || body.event === 'payment.failed') {
            const paymentEntity = body.payload.payment.entity;
            const razorpay_order_id = paymentEntity.order_id;
            const razorpay_payment_id = paymentEntity.id;
            const status = body.event === 'payment.captured' ? 'paid' : 'failed';
            if (razorpay_order_id) {
                const ordersRef = db.collection('orders');
                const q = ordersRef.where('razorpay_order_id', '==', razorpay_order_id);
                const querySnapshot = await q.get();
                if (!querySnapshot.empty) {
                    const orderDoc = querySnapshot.docs[0];
                    await orderDoc.ref.update({
                        payment_status: status,
                        razorpay_payment_id: razorpay_payment_id,
                        updated_at: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Webhook updated order ${orderDoc.id} to ${status}`);
                }
            }
        }
        res.status(200).json({ received: true });
    }
    catch (err) {
        console.error("Webhook processing failed: ", err);
        res.status(500).send("Webhook Error");
    }
});
//# sourceMappingURL=index.js.map