/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_NOCODB_BASE_URL: string;
    readonly VITE_NOCODB_API_TOKEN: string;
    readonly VITE_NOCODB_BANKS_TABLE_ID: string;
    readonly VITE_NOCODB_INVOICES_TABLE_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
