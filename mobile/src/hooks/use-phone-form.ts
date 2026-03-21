import { useState } from "react";
import type { ICountry } from "@/src/components/ui/phone-input";
import { sanitizePhoneNumber } from "../utils/phone";

export function usePhoneForm() {
    const [phone, setPhone] = useState("");
    const [countryCode, setCountryCode] = useState<null | ICountry>(null);

    const formatPhone = (): string | null => {
        if (!countryCode?.idd?.root) return null;
        return countryCode.idd.root + sanitizePhoneNumber(phone);
    };

    return { phone, setPhone, countryCode, setCountryCode, formatPhone };
}
