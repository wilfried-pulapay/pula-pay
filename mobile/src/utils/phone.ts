export function sanitizePhoneNumber(phone: string): string {
    return phone.replace(/\s+/g, '');
}