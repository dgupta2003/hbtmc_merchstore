import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const RESEND_FROM = process.env.RESEND_FROM || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const STORE_URL = process.env.STORE_URL || 'https://hbtmc-gymkhana-emporium.web.app';

const PICKUP_LOCATION = 'Male Common Room, 1st Floor, Main College Building';

function configured(): boolean {
    if (!process.env.RESEND_API_KEY || !RESEND_FROM) {
        console.log('Resend not configured (missing RESEND_API_KEY / RESEND_FROM) — skipping email.');
        return false;
    }
    return true;
}

interface OrderItem {
    product_name_snapshot?: string;
    category_snapshot?: string;
    size?: string;
    quantity?: number;
    unit_price_snapshot?: number;
    line_total?: number;
    customizationTexts?: Record<string, string>;
    customizationText?: string;
}

/**
 * Resolve the customer recipient email + name from an order doc.
 * Students store user_email/user_name; guests store guestDetail.{email,name}.
 */
function resolveRecipient(order: any): { email: string; name: string } {
    if (order?.user_id === 'guest') {
        return {
            email: order?.guestDetail?.email || '',
            name: order?.guestDetail?.name || 'Customer',
        };
    }
    return {
        email: order?.user_email || '',
        name: order?.user_name || order?.user_roll_number || 'Student',
    };
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCustomizations(item: OrderItem): string {
    const parts: string[] = [];
    if (item.customizationTexts && typeof item.customizationTexts === 'object') {
        for (const [label, val] of Object.entries(item.customizationTexts)) {
            if (val) parts.push(`${escapeHtml(label)}: ${escapeHtml(val)}`);
        }
    }
    if (item.customizationText) {
        parts.push(`Custom: ${escapeHtml(item.customizationText)}`);
    }
    if (parts.length === 0) return '';
    return `<div style="font-size:12px;color:#6b7280;margin-top:4px;">${parts.join(' · ')}</div>`;
}

function renderItemsTable(order: any): string {
    const items: OrderItem[] = Array.isArray(order?.items) ? order.items : [];
    const rows = items
        .map((item) => {
            const sizeLabel =
                item.size && item.size !== 'N/A' ? ` (Size: ${escapeHtml(item.size)})` : '';
            const lineTotal =
                typeof item.line_total === 'number'
                    ? item.line_total
                    : (item.unit_price_snapshot || 0) * (item.quantity || 0);
            return `
                <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
                        <div style="font-weight:600;color:#111827;">
                            ${escapeHtml(item.quantity)}x ${escapeHtml(item.product_name_snapshot)}${sizeLabel}
                        </div>
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;">
                            ${escapeHtml(item.category_snapshot || 'merchandise')}
                        </div>
                        ${renderCustomizations(item)}
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#111827;white-space:nowrap;">
                        ₹${escapeHtml(lineTotal)}
                    </td>
                </tr>`;
        })
        .join('');
    return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`;
}

function shell(title: string, inner: string): string {
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111827;">
        <div style="background:#1a2e5a;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#ffffff;margin:0;font-size:18px;">HBTMC Gymkhana Emporium</h1>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
            <h2 style="margin-top:0;color:#1a2e5a;font-size:20px;">${escapeHtml(title)}</h2>
            ${inner}
        </div>
    </div>`;
}

/**
 * Order confirmation email — to the customer, CC admin.
 */
export async function sendOrderConfirmation(order: any): Promise<boolean> {
    try {
        if (!configured()) return false;
        const { email, name } = resolveRecipient(order);
        if (!email) {
            console.log('Order confirmation skipped — no recipient email on order.');
            return false;
        }

        const inner = `
            <p>Hi ${escapeHtml(name)},</p>
            <p>Thank you for your order. Your payment has been received.</p>
            <p style="font-size:13px;color:#6b7280;">Order ID: <strong>${escapeHtml(order?.id || '')}</strong></p>
            ${renderItemsTable(order)}
            <div style="text-align:right;font-size:18px;font-weight:700;color:#1a2e5a;">
                Total: ₹${escapeHtml(order?.total_amount)}
            </div>
            <p style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;font-size:14px;">
                Collect your physical items from ${PICKUP_LOCATION}. If this is a digital pass/ticket, please present this email as confirmation.
            </p>`;

        const cc = ADMIN_EMAIL ? [ADMIN_EMAIL] : undefined;
        await resend.emails.send({
            from: RESEND_FROM,
            to: email,
            cc,
            subject: `Order Confirmed — HBTMC Gymkhana Emporium`,
            html: shell('Order Confirmed', inner),
        });
        console.log('Order confirmation email sent.');
        return true;
    } catch (err) {
        console.error('Failed to send order confirmation email:', err);
        return false;
    }
}

/**
 * Ready-for-pickup email — to the customer, CC admin.
 */
export async function sendPickupNotification(order: any): Promise<boolean> {
    try {
        if (!configured()) return false;
        const { email, name } = resolveRecipient(order);
        if (!email) {
            console.log('Pickup notification skipped — no recipient email on order.');
            return false;
        }

        const inner = `
            <p>Hi ${escapeHtml(name)},</p>
            <p>Good news — your order is ready for pickup!</p>
            <p style="font-size:13px;color:#6b7280;">Order ID: <strong>${escapeHtml(order?.id || '')}</strong></p>
            <p style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;font-size:14px;">
                Please collect it from <strong>${PICKUP_LOCATION}</strong>.
            </p>`;

        const cc = ADMIN_EMAIL ? [ADMIN_EMAIL] : undefined;
        await resend.emails.send({
            from: RESEND_FROM,
            to: email,
            cc,
            subject: `Your Order is Ready for Pickup — HBTMC Gymkhana Emporium`,
            html: shell('Ready for Pickup', inner),
        });
        console.log('Pickup notification email sent.');
        return true;
    } catch (err) {
        console.error('Failed to send pickup notification email:', err);
        return false;
    }
}

/**
 * Order-completed thank-you email — to the customer, CC admin.
 */
export async function sendCompletionNotification(order: any): Promise<boolean> {
    try {
        if (!configured()) return false;
        const { email, name } = resolveRecipient(order);
        if (!email) {
            console.log('Completion notification skipped — no recipient email on order.');
            return false;
        }

        const inner = `
            <p>Hi ${escapeHtml(name)},</p>
            <p>Your order has been completed. Thank you for shopping with the HBTMC Gymkhana Emporium!</p>
            <p style="font-size:13px;color:#6b7280;">Order ID: <strong>${escapeHtml(order?.id || '')}</strong></p>
            <div style="text-align:right;font-size:16px;font-weight:700;color:#1a2e5a;margin-top:12px;">
                Total: ₹${escapeHtml(order?.total_amount)}
            </div>`;

        const cc = ADMIN_EMAIL ? [ADMIN_EMAIL] : undefined;
        await resend.emails.send({
            from: RESEND_FROM,
            to: email,
            cc,
            subject: `Order Completed — HBTMC Gymkhana Emporium`,
            html: shell('Order Completed', inner),
        });
        console.log('Completion notification email sent.');
        return true;
    } catch (err) {
        console.error('Failed to send completion notification email:', err);
        return false;
    }
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

/**
 * New-product announcement to all recipients, via Resend batch API.
 * Each recipient gets their own message (single-address `to`) so recipients
 * are never exposed to each other. Sent in chunks of <=100.
 */
export async function sendProductAnnouncement(product: any, recipients: string[]): Promise<boolean> {
    try {
        if (!configured()) return false;
        const emails = (recipients || []).filter((e) => !!e);
        if (emails.length === 0) {
            console.log('Product announcement skipped — no recipients.');
            return false;
        }

        const imageBlock = product?.image_url
            ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" style="width:100%;max-width:520px;border-radius:8px;margin:16px 0;" />`
            : '';

        const inner = `
            <p>A new product just dropped at the HBTMC Gymkhana Emporium!</p>
            ${imageBlock}
            <h3 style="margin:8px 0 4px;color:#111827;">${escapeHtml(product?.name)}</h3>
            <p style="font-size:20px;font-weight:700;color:#1a2e5a;margin:0 0 16px;">₹${escapeHtml(product?.price_inr)}</p>
            <a href="${escapeHtml(STORE_URL)}" style="display:inline-block;background:#1a2e5a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
                Shop Now
            </a>`;

        const subject = `New Drop: ${String(product?.name || 'New Product').replace(/[\r\n]/g, '')} — HBTMC Gymkhana Emporium`;
        const html = shell('New Product Available', inner);

        for (const group of chunk(emails, 100)) {
            const payload = group.map((to) => ({
                from: RESEND_FROM,
                to,
                subject,
                html,
            }));
            await resend.batch.send(payload);
        }
        console.log(`Product announcement sent to ${emails.length} recipient(s).`);
        return true;
    } catch (err) {
        console.error('Failed to send product announcement email:', err);
        return false;
    }
}
