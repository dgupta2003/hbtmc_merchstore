import emailjs from '@emailjs/browser';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';
const ORDER_TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_ORDER_TEMPLATE_ID || '';
const PICKUP_TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_PICKUP_TEMPLATE_ID || '';
const COMPLETE_TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_COMPLETE_TEMPLATE_ID || '';
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'hbtmcmerchstore@gmail.com';

function emailsConfigured() {
    return SERVICE_ID && PUBLIC_KEY && ORDER_TEMPLATE;
}

export async function sendOrderConfirmation(
    userEmail: string,
    userName: string,
    orderId: string,
    totalAmount: number
) {
    if (!emailsConfigured()) {
        console.log('EmailJS not configured — skipping order confirmation email.');
        return;
    }
    try {
        // Notify user
        await emailjs.send(
            SERVICE_ID,
            ORDER_TEMPLATE,
            {
                to_email: userEmail,
                to_name: userName,
                order_id: orderId,
                total_amount: `₹${totalAmount}`,
                pickup_message:
                    'Collect your order from Male Common Room, 1st Floor, Main College Building after receiving intimation. Usual processing is 7–10 business days.',
            },
            PUBLIC_KEY
        );
        // Notify admin
        await emailjs.send(
            SERVICE_ID,
            ORDER_TEMPLATE,
            {
                to_email: ADMIN_EMAIL,
                to_name: 'Admin',
                order_id: orderId,
                total_amount: `₹${totalAmount}`,
                pickup_message:
                    'Collect your order from Male Common Room, 1st Floor, Main College Building after receiving intimation. Usual processing is 7–10 business days.',
            },
            PUBLIC_KEY
        );
        console.log('Order confirmation emails sent.');
    } catch (err) {
        console.error('Failed to send order confirmation email:', err);
    }
}

export async function sendPickupNotification(
    userEmail: string,
    userName: string,
    orderId: string
) {
    if (!emailsConfigured() || !PICKUP_TEMPLATE) {
        console.log('EmailJS pickup template not configured — skipping.');
        return;
    }
    try {
        // Notify user
        await emailjs.send(
            SERVICE_ID,
            PICKUP_TEMPLATE,
            {
                to_email: userEmail,
                to_name: userName,
                order_id: orderId,
                pickup_location: 'Male Common Room, 1st Floor, Main College Building',
            },
            PUBLIC_KEY
        );
        // Notify admin
        await emailjs.send(
            SERVICE_ID,
            PICKUP_TEMPLATE,
            {
                to_email: ADMIN_EMAIL,
                to_name: 'Admin',
                order_id: orderId,
                pickup_location: 'Male Common Room, 1st Floor, Main College Building',
            },
            PUBLIC_KEY
        );
        console.log('Pickup notifications sent.');
    } catch (err) {
        console.error('Failed to send pickup notification:', err);
    }
}

export async function sendCompletionNotification(
    userEmail: string,
    userName: string,
    orderId: string,
    totalAmount: number
) {
    if (!emailsConfigured() || !COMPLETE_TEMPLATE) {
        console.log('EmailJS completion template not configured — skipping.');
        return;
    }
    try {
        // Notify user
        await emailjs.send(
            SERVICE_ID,
            COMPLETE_TEMPLATE,
            {
                to_email: userEmail,
                to_name: userName,
                order_id: orderId,
                total_amount: `₹${totalAmount}`,
            },
            PUBLIC_KEY
        );
        // Notify admin
        await emailjs.send(
            SERVICE_ID,
            COMPLETE_TEMPLATE,
            {
                to_email: ADMIN_EMAIL,
                to_name: 'Admin',
                order_id: orderId,
                total_amount: `₹${totalAmount}`,
            },
            PUBLIC_KEY
        );
        console.log('Completion notifications sent.');
    } catch (err) {
        console.error('Failed to send completion notification:', err);
    }
}
