import { InvoiceData, BankingInfo, ClientInfo, ClientRecord, StudioInfo, StudioRecord } from '../types';

// NocoDB Configuration (Vite env vars with fallback hardcoded for dev)
const NOCODB_BASE_URL = import.meta.env.VITE_NOCODB_BASE_URL;
const NOCODB_API_TOKEN = import.meta.env.VITE_NOCODB_API_TOKEN;
const NOCODB_BASE_ID = import.meta.env.VITE_NOCODB_BASE_ID;
const BANKS_TABLE_ID = import.meta.env.VITE_NOCODB_BANKS_TABLE_ID;
const INVOICES_TABLE_ID = import.meta.env.VITE_NOCODB_INVOICES_TABLE_ID;
const CLIENTS_TABLE_ID = import.meta.env.VITE_NOCODB_CLIENTS_TABLE_ID;
const STUDIOS_TABLE_ID = import.meta.env.VITE_NOCODB_STUDIOS_TABLE_ID;


const now = () => new Date().toISOString();

export interface SaveResponse {
    success: boolean;
    id: string;
    error?: string;
}

// ────────────────────────────────────────────────────────────────
// NocoDB API Helpers
// ────────────────────────────────────────────────────────────────

const apiHeaders = () => ({
    'Content-Type': 'application/json',
    'xc-token': NOCODB_API_TOKEN,
});

const apiUrl = (tableId: string, rowId?: string | number) =>
    `${NOCODB_BASE_URL}/api/v1/db/data/noco/${NOCODB_BASE_ID}/${tableId}${rowId != null ? `/${rowId}` : ''}`;

async function apiPost(tableId: string, data: Record<string, unknown>) {
    const res = await fetch(apiUrl(tableId), {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`NocoDB POST failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function apiGet(tableId: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams({ limit: '200', ...params });
    const res = await fetch(`${apiUrl(tableId)}?${query}`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`NocoDB GET failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function apiPatch(tableId: string, rowId: string | number, data: Record<string, unknown>) {
    const res = await fetch(apiUrl(tableId, rowId), {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`NocoDB PATCH failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function apiDelete(tableId: string, rowId: string | number) {
    const res = await fetch(apiUrl(tableId, rowId), {
        method: 'DELETE',
        headers: apiHeaders(),
    });
    if (!res.ok) throw new Error(`NocoDB DELETE failed: ${res.status} ${await res.text()}`);
    return res.json();
}

// ────────────────────────────────────────────────────────────────
// CLIENT METHODS
// ────────────────────────────────────────────────────────────────

export const fetchClientsFromCloud = async (): Promise<ClientRecord[]> => {
    const res = await apiGet(CLIENTS_TABLE_ID, { sort: 'name' });
    return (res.list || []).map((c: any) => ({
        id: String(c.Id),
        name: c.name || '',
        contactPerson: c.contactPerson || '',
        email: c.email || '',
        address: c.address || '',
        taxCode: c.taxCode || '',
    }));
};

export const saveClientToCloud = async (client: ClientInfo): Promise<ClientRecord> => {
    const created = await apiPost(CLIENTS_TABLE_ID, {
        name: client.name,
        contactPerson: client.contactPerson,
        email: client.email,
        address: client.address,
        taxCode: client.taxCode || '',
    });
    return { ...client, id: String(created.Id) };
};

export const updateClientInCloud = async (id: string, client: ClientInfo): Promise<void> => {
    await apiPatch(CLIENTS_TABLE_ID, id, {
        name: client.name,
        contactPerson: client.contactPerson,
        email: client.email,
        address: client.address,
        taxCode: client.taxCode || '',
    });
};

// ────────────────────────────────────────────────────────────────
// INVOICE METHODS
// ────────────────────────────────────────────────────────────────

export const saveInvoiceToCloud = async (data: InvoiceData): Promise<SaveResponse> => {
    const { id, ...rest } = data;
    const record = {
        ...rest,
        clientInfo: JSON.stringify(rest.clientInfo),
        studioInfo: JSON.stringify(rest.studioInfo),
        bankingInfo: JSON.stringify(rest.bankingInfo),
        items: JSON.stringify(rest.items),
        // Flat client fields for easy querying in dashboard
        clientName: rest.clientInfo.name,
        createdAt: now(),
    };
    const created = await apiPost(INVOICES_TABLE_ID, record);
    return { success: true, id: String(created.Id) };
};

const parseInvoice = (row: any): InvoiceData => ({
    ...row,
    id: String(row.Id),
    clientInfo: typeof row.clientInfo === 'string' ? JSON.parse(row.clientInfo || '{}') : row.clientInfo,
    studioInfo: typeof row.studioInfo === 'string' ? JSON.parse(row.studioInfo || '{}') : row.studioInfo,
    bankingInfo: typeof row.bankingInfo === 'string' ? JSON.parse(row.bankingInfo || '{}') : row.bankingInfo,
    items: typeof row.items === 'string' ? JSON.parse(row.items || '[]') : row.items,
    paidDate: row.paidDate || undefined,
});

export const fetchInvoicesFromCloud = async (): Promise<InvoiceData[]> => {
    const res = await apiGet(INVOICES_TABLE_ID, { sort: '-createdAt' });
    return (res.list || []).map(parseInvoice);
};

export const updateInvoiceStatusInCloud = async (
    id: string,
    status: InvoiceData['status'],
    paidDate?: string
) => {
    const payload: Record<string, unknown> = { status };
    if (status === 'paid' && paidDate) payload.paidDate = paidDate;
    if (status === 'pending') payload.paidDate = null;
    await apiPatch(INVOICES_TABLE_ID, id, payload);
};

// ────────────────────────────────────────────────────────────────
// BANK METHODS
// ────────────────────────────────────────────────────────────────

export const saveBankToCloud = async (bank: BankingInfo): Promise<SaveResponse> => {
    const created = await apiPost(BANKS_TABLE_ID, { ...bank, isDefault: false });
    return { success: true, id: String(created.Id) };
};

export const fetchBanksFromCloud = async (): Promise<(BankingInfo & { id: string; isDefault: boolean })[]> => {
    const res = await apiGet(BANKS_TABLE_ID);
    return (res.list || []).map((b: any) => ({
        ...b,
        id: String(b.Id),
        isDefault: b.isDefault === true || b.isDefault === 1,
    }));
};

export const updateBankInCloud = async (id: string, bank: BankingInfo): Promise<void> => {
    await apiPatch(BANKS_TABLE_ID, id, {
        alias: bank.alias || '',
        accountName: bank.accountName,
        accountNumber: bank.accountNumber,
        bankName: bank.bankName,
        branchName: bank.branchName,
        bankAddress: bank.bankAddress,
        citadCode: bank.citadCode,
        swiftCode: bank.swiftCode,
    });
};

export const setDefaultBankInCloud = async (
    targetId: string,
    allBanks: (BankingInfo & { id: string; isDefault: boolean })[]
): Promise<void> => {
    const clearOps = allBanks
        .filter(b => b.isDefault && b.id !== targetId)
        .map(b => apiPatch(BANKS_TABLE_ID, b.id, { isDefault: false }));
    await Promise.all(clearOps);
    await apiPatch(BANKS_TABLE_ID, targetId, { isDefault: true });
};

export const deleteBankFromCloud = async (id: string) => {
    await apiDelete(BANKS_TABLE_ID, id);
};

// ────────────────────────────────────────────────────────────────
// STUDIO METHODS
// ────────────────────────────────────────────────────────────────

export const fetchStudiosFromCloud = async (): Promise<StudioRecord[]> => {
    const res = await apiGet(STUDIOS_TABLE_ID, { sort: 'name' });
    return (res.list || []).map((s: any) => ({
        id: String(s.Id),
        name: s.name || '',
        address: s.address || '',
        email: s.email || '',
        taxCode: s.taxCode || '',
        isDefault: s.isDefault === true || s.isDefault === 1,
    }));
};

export const saveStudioToCloud = async (studio: StudioInfo): Promise<StudioRecord> => {
    const created = await apiPost(STUDIOS_TABLE_ID, { ...studio, isDefault: false });
    return { ...studio, id: String(created.Id), isDefault: false };
};

export const updateStudioInCloud = async (id: string, studio: StudioInfo): Promise<void> => {
    await apiPatch(STUDIOS_TABLE_ID, id, {
        name: studio.name,
        address: studio.address,
        email: studio.email,
        taxCode: studio.taxCode,
    });
};

export const setDefaultStudioInCloud = async (
    targetId: string,
    allStudios: StudioRecord[]
): Promise<void> => {
    const clearOps = allStudios
        .filter(s => s.isDefault && s.id !== targetId)
        .map(s => apiPatch(STUDIOS_TABLE_ID, s.id, { isDefault: false }));
    await Promise.all(clearOps);
    await apiPatch(STUDIOS_TABLE_ID, targetId, { isDefault: true });
};

export const deleteStudioFromCloud = async (id: string) => {
    await apiDelete(STUDIOS_TABLE_ID, id);
};
