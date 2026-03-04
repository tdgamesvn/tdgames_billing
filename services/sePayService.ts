import { InvoiceData } from '../types';

// ── Config ──────────────────────────────────────────────────────
const EDGE_FUNCTION_URL = import.meta.env.VITE_SEPAY_EDGE_FUNCTION_URL;
const API_KEY = import.meta.env.VITE_SEPAY_API_KEY || 'tdgames-sepay-2026';

// ── Helpers ─────────────────────────────────────────────────────

async function callProxy(action: string, payload: Record<string, unknown> = {}) {
    const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
        },
        body: JSON.stringify({ action, payload }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(data.error || data.message || `Proxy error (${res.status})`);
    }
    return data;
}

// ── Data mapping ────────────────────────────────────────────────

function mapInvoiceToSePay(invoice: InvoiceData) {
    // Determine buyer type
    const hasTaxCode = !!invoice.clientInfo.taxCode?.trim();

    // Build invoice items
    const sePayItems = invoice.items.map((item, idx) => ({
        line_number: idx + 1,
        line_type: 1, // normal product/service line
        item_name: item.description,
        unit_name: 'Dịch vụ',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        item_total_amount_without_tax: item.quantity * item.unitPrice,
        tax_rate: invoice.taxRate,
    }));

    // Handle discount (total level → add line_type: 3)
    if (invoice.discountValue > 0) {
        const subtotal = invoice.items.reduce(
            (sum, i) => sum + i.quantity * i.unitPrice,
            0
        );
        let discountAmount: number;
        if (invoice.discountType === 'percentage') {
            discountAmount = subtotal * (invoice.discountValue / 100);
        } else {
            discountAmount = invoice.discountValue;
        }

        sePayItems.push({
            line_number: sePayItems.length + 1,
            line_type: 3, // commercial discount line
            item_name: `Chiết khấu ${invoice.discountType === 'percentage' ? invoice.discountValue + '%' : ''}`,
            unit_name: '',
            quantity: 1,
            unit_price: discountAmount,
            item_total_amount_without_tax: discountAmount,
            tax_rate: invoice.taxRate,
        });
    }

    // Format date
    const issuedDate = invoice.issueDate
        ? `${invoice.issueDate} 00:00:00`
        : new Date().toISOString().slice(0, 19).replace('T', ' ');

    return {
        buyer: {
            type: hasTaxCode ? 'company' : 'personal',
            name: invoice.clientInfo.name,
            tax_code: invoice.clientInfo.taxCode || '',
            address: invoice.clientInfo.address,
            email: invoice.clientInfo.email || '',
        },
        items: sePayItems,
        currency: invoice.currency,
        issued_date: issuedDate,
        payment_method: invoice.payment_method || 'CK',
    };
}

// ── Public API ──────────────────────────────────────────────────

export interface CreateDraftResult {
    tracking_code: string;
}

export interface CheckStatusResult {
    status: string;
    message?: string;
    data?: {
        invoice?: {
            reference_code?: string;
            pdf_url?: string;
            invoice_number?: string;
        };
    };
}

/**
 * Create a draft eInvoice via the Edge Function proxy.
 * Returns tracking_code for polling.
 */
export async function createDraftEInvoice(invoice: InvoiceData): Promise<CreateDraftResult> {
    const sePayPayload = mapInvoiceToSePay(invoice);
    const result = await callProxy('create-draft', sePayPayload);
    // SePay returns tracking_code in data
    const trackingCode =
        result?.data?.tracking_code || result?.tracking_code || result?.data?.code;
    if (!trackingCode) {
        throw new Error('Không nhận được tracking_code từ SePay');
    }
    return { tracking_code: trackingCode };
}

/**
 * Poll the status of a draft eInvoice creation.
 */
export async function checkEInvoiceStatus(
    trackingCode: string
): Promise<CheckStatusResult> {
    return callProxy('check-status', { tracking_code: trackingCode });
}

/**
 * Full flow: create draft → poll until complete → return result.
 * Calls onProgress callback with status messages.
 */
export async function createAndPollDraft(
    invoice: InvoiceData,
    onProgress?: (msg: string) => void
): Promise<{
    reference_code: string;
    pdf_url: string;
    invoice_number?: string;
}> {
    onProgress?.('Đang gửi hóa đơn lên SePay...');
    const { tracking_code } = await createDraftEInvoice(invoice);
    onProgress?.(`Đã gửi. Tracking: ${tracking_code}`);

    // Poll max 30 times, 2s interval
    const MAX_POLLS = 30;
    const POLL_INTERVAL = 2000;

    for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        onProgress?.(`Đang kiểm tra kết quả... (${i + 1}/${MAX_POLLS})`);

        const result = await checkEInvoiceStatus(tracking_code);
        const status = (result?.status || result?.data?.invoice?.reference_code ? 'Success' : '').toLowerCase();

        if (status === 'success' || result?.data?.invoice?.reference_code) {
            const inv = result.data?.invoice;
            return {
                reference_code: inv?.reference_code || '',
                pdf_url: inv?.pdf_url || '',
                invoice_number: inv?.invoice_number,
            };
        }

        // Check for failure
        if (status === 'failed' || status === 'error') {
            throw new Error(result.message || 'SePay trả về lỗi khi tạo hóa đơn');
        }
    }

    throw new Error('Timeout: SePay không phản hồi sau 60 giây. Vui lòng thử lại.');
}
