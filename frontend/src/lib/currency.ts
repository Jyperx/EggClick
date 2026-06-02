export type CountryCode = 
  | 'US' | 'MX' | 'CO' | 'AR' | 'ES' | 'CL' | 'PE' 
  | 'VE' | 'EC' | 'GT' | 'CU' | 'BO' | 'DO' | 'HN' 
  | 'PY' | 'SV' | 'NI' | 'CR' | 'PA' | 'UY' | 'PR' 
  | 'BR' | 'GB' | 'CA' | 'OTHER';

// Tasas de cambio simuladas de USD a moneda local (Mock para demostrar la funcionalidad)
const MOCK_EXCHANGE_RATES: Record<CountryCode, number> = {
  US: 1,        // USD
  MX: 17.50,    // MXN
  CO: 3900.00,  // COP
  AR: 1000.00,  // ARS
  ES: 0.92,     // EUR
  CL: 950.00,   // CLP
  PE: 3.75,     // PEN
  VE: 36.50,    // VES
  EC: 1.00,     // USD
  GT: 7.80,     // GTQ
  CU: 24.00,    // CUP
  BO: 6.90,     // BOB
  DO: 59.00,    // DOP
  HN: 24.70,    // HNL
  PY: 7400.00,  // PYG
  SV: 1.00,     // USD
  NI: 36.80,    // NIO
  CR: 510.00,   // CRC
  PA: 1.00,     // USD / PAB
  UY: 38.50,    // UYU
  PR: 1.00,     // USD
  BR: 5.10,     // BRL
  GB: 0.79,     // GBP
  CA: 1.37,     // CAD
  OTHER: 1.00   // USD Fallback
};

export const getCurrencySymbol = (country: CountryCode): string => {
  switch (country) {
    case 'ES': return '€';
    case 'GB': return '£';
    case 'PE': return 'S/';
    case 'CR': return '₡';
    case 'PY': return 'Gs.';
    case 'BO': return 'Bs.';
    case 'VE': return 'Bs.';
    case 'NI': return 'C$';
    case 'GT': return 'Q';
    case 'HN': return 'L';
    case 'BR': return 'R$';
    default: return '$'; // Usado por US, MX, CO, AR, CL, EC, DO, SV, PA, UY, PR, CA, CU
  }
};

export const formatCurrency = (amountInUSD: number, userCountry: CountryCode): string => {
  const rate = MOCK_EXCHANGE_RATES[userCountry] || 1;
  const localAmount = amountInUSD * rate;
  const symbol = getCurrencySymbol(userCountry);
  
  const noDecimalCountries = ['CO', 'CL', 'AR', 'PY', 'CR'];
  const fractionDigits = noDecimalCountries.includes(userCountry) ? 0 : 2;
  
  return `${symbol}${localAmount.toLocaleString('en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
};
