/**
 * Test the deployed onOrderUpdate -> Resend -> inbox path WITHOUT a real order.
 *
 * Writes a throwaway `orders` doc to (production) Firestore and flips its status
 * fields, which fires the deployed `onOrderUpdate` Firestore trigger for each
 * transition. No Razorpay, no payment. Cleans up the test doc afterward.
 *
 *   npx tsx scripts/test-order-email.ts [recipientEmail]
 *
 * Requires service-account.json at the repo root (same as scripts/set-admin.ts).
 */
import * as admin from 'firebase-admin';
import * as path from 'path';

if (!admin.apps.length) {
    const serviceAccount = require(path.join(process.cwd(), 'service-account.json'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const RECIPIENT = process.argv[2] || 'hbtmcmerchstore@gmail.com';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cleanupLeftovers() {
    const stale = await db.collection('orders').where('is_test', '==', true).get();
    if (!stale.empty) {
        console.log(`Cleaning up ${stale.size} leftover test order(s) from prior runs...`);
        await Promise.all(stale.docs.map((d) => d.ref.delete()));
    }
}

async function run() {
    console.log(`\n=== onOrderUpdate email test → ${RECIPIENT} (admin CC: admin@hbtmcmerchstore.shop) ===\n`);
    await cleanupLeftovers();

    // 1. Create the order doc, mirroring createRazorpayOrder's shape.
    const ref = db.collection('orders').doc();
    await ref.set({
        user_id: 'TEST_USER',
        user_roll_number: 'TEST',
        user_email: RECIPIENT,
        user_name: 'Email Pipeline Test',
        items: [
            {
                product_id: 'TEST_PRODUCT',
                product_name_snapshot: 'TEST — HBTMC Hoodie',
                category_snapshot: 'merchandise',
                size: 'M',
                quantity: 1,
                unit_price_snapshot: 799,
                line_total: 799,
                image_url: '',
                customizationTexts: { 'Back Name': 'TESTER' },
            },
        ],
        total_amount: 799,
        payment_provider: 'razorpay',
        razorpay_order_id: 'TEST_' + Date.now(),
        payment_status: 'created',
        order_status: 'pending',
        is_test: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created test order ${ref.id} (payment_status=created)`);

    // 2. created -> paid  => order confirmation email
    await sleep(8000);
    await ref.update({ payment_status: 'paid', razorpay_payment_id: 'TEST_PAY_' + Date.now(), updated_at: admin.firestore.FieldValue.serverTimestamp() });
    console.log('→ payment_status=paid  (expect: Order Confirmed email)');

    // 3. -> ready_for_pickup  => pickup email
    await sleep(8000);
    await ref.update({ order_status: 'ready_for_pickup', updated_at: admin.firestore.FieldValue.serverTimestamp() });
    console.log('→ order_status=ready_for_pickup  (expect: Ready for Pickup email)');

    // 4. -> completed  => completion email
    await sleep(8000);
    await ref.update({ order_status: 'completed', updated_at: admin.firestore.FieldValue.serverTimestamp() });
    console.log('→ order_status=completed  (expect: Order Completed email)');

    // 5. Let the final trigger run, then delete (onUpdate-only, so delete sends nothing).
    console.log('\nWaiting ~20s for the last trigger to flush, then cleaning up...');
    await sleep(20000);
    await ref.delete();
    console.log(`Deleted test order ${ref.id}.`);
    console.log(`\nDone. Check ${RECIPIENT} (and admin@hbtmcmerchstore.shop) for 3 emails.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
