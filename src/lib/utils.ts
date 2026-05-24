import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function hashPin(pin: string) {
    const SALT = "ESTATE_MAGIC_PROD_SALT_8X9A2";
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let res = '';
    for(let i=0; i<6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
};

export const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const filterItemsByDate = (items: any[], dateField: string, filterType: string) => {
    if (filterType === 'all') return items;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return items.filter(item => {
        if (!item[dateField]) return false;
        const itemDate = item[dateField].toDate ? item[dateField].toDate() : new Date(item[dateField]);
        if (filterType === 'today') return itemDate >= startOfDay;
        if (filterType === 'week') return itemDate >= startOfWeek;
        if (filterType === 'month') return itemDate >= startOfMonth;
        if (filterType === 'year') return itemDate >= startOfYear;
        return true;
    });
};

export const HOUSES = Array.from({ length: 100 }, (_, i) => `House ${i + 1}`);
export const SUB_OPTIONS = ["Main House", "First Floor", "Ground Floor", "BQ"];
