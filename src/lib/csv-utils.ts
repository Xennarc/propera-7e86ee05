// CSV parsing utilities for guest import

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rawRows: string[][];
}

export function parseCSV(content: string): ParsedCSV {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  if (headers.length === 0) {
    throw new Error('No headers found in CSV');
  }

  // Parse data rows
  const rawRows: string[][] = [];
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue;
    
    rawRows.push(values);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return { headers, rows, rawRows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  result.push(current.trim());
  return result;
}

// Date parsing with multiple format support
const DATE_FORMATS = [
  { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parse: (m: string[]) => `${m[1]}-${m[2]}-${m[3]}` }, // YYYY-MM-DD
  { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, parse: (m: string[]) => `${m[3]}-${m[2]}-${m[1]}` }, // DD/MM/YYYY
  { regex: /^(\d{2})-(\d{2})-(\d{4})$/, parse: (m: string[]) => `${m[3]}-${m[2]}-${m[1]}` }, // DD-MM-YYYY
  { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m: string[]) => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` }, // M/D/YYYY (US)
  { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, parse: (m: string[]) => `${m[1]}-${m[2]}-${m[3]}` }, // YYYY/MM/DD
];

export function parseDate(value: string): { date: string | null; error?: string } {
  if (!value || !value.trim()) {
    return { date: null };
  }
  
  const trimmed = value.trim();
  
  for (const format of DATE_FORMATS) {
    const match = trimmed.match(format.regex);
    if (match) {
      const parsed = format.parse(match);
      // Validate the parsed date
      const dateObj = new Date(parsed);
      if (!isNaN(dateObj.getTime())) {
        return { date: parsed };
      }
    }
  }
  
  // Try native Date parsing as fallback
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) {
    return { date: fallback.toISOString().split('T')[0] };
  }
  
  return { date: null, error: `Invalid date format: "${value}"` };
}

// Generate sample CSV template
export function generateSampleCSV(): string {
  const headers = [
    'full_name',
    'room_number',
    'check_in_date',
    'check_out_date',
    'nationality',
    'email',
    'phone',
    'booking_reference',
    'channel',
    'notes'
  ];
  
  const sampleRows = [
    ['John Smith', '101', '2024-01-15', '2024-01-22', 'US', 'john@email.com', '+1234567890', 'BK001', 'Direct', 'VIP guest'],
    ['Jane Doe', '205', '2024-01-16', '2024-01-20', 'UK', 'jane@email.com', '+4412345678', 'BK002', 'Booking.com', ''],
  ];
  
  return [headers.join(','), ...sampleRows.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
}

// Smart column matching
const COLUMN_ALIASES: Record<string, string[]> = {
  full_name: ['name', 'full_name', 'fullname', 'guest name', 'guest_name', 'guestname', 'customer', 'customer name'],
  room_number: ['room', 'room_number', 'roomnumber', 'room no', 'room_no', 'roomno', 'villa', 'villa_number', 'unit'],
  check_in_date: ['check_in', 'checkin', 'check-in', 'check_in_date', 'checkindate', 'arrival', 'arrival_date', 'arrivaldate', 'start_date'],
  check_out_date: ['check_out', 'checkout', 'check-out', 'check_out_date', 'checkoutdate', 'departure', 'departure_date', 'departuredate', 'end_date'],
  nationality: ['nationality', 'country', 'nation', 'country_code', 'nat'],
  email: ['email', 'e-mail', 'email_address', 'emailaddress', 'mail'],
  phone: ['phone', 'telephone', 'tel', 'mobile', 'phone_number', 'phonenumber', 'contact'],
  booking_reference: ['booking_reference', 'bookingreference', 'booking_ref', 'bookingref', 'reference', 'ref', 'confirmation', 'confirmation_number', 'pms_id'],
  channel: ['channel', 'source', 'booking_channel', 'bookingchannel', 'ota'],
  notes: ['notes', 'note', 'comments', 'comment', 'remarks', 'remark', 'special_requests'],
};

export function suggestColumnMapping(csvHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = csvHeaders.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < csvHeaders.length; i++) {
      const normalized = normalizedHeaders[i];
      const normalizedAliases = aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      if (normalizedAliases.includes(normalized)) {
        mapping[field] = csvHeaders[i];
        break;
      }
    }
  }
  
  return mapping;
}

export interface GuestField {
  key: string;
  label: string;
  required: boolean;
  recommended?: boolean;
}

export const GUEST_FIELDS: GuestField[] = [
  { key: 'full_name', label: 'Full Name', required: true },
  { key: 'room_number', label: 'Room Number', required: true },
  { key: 'check_in_date', label: 'Check-in Date', required: false, recommended: true },
  { key: 'check_out_date', label: 'Check-out Date', required: false, recommended: true },
  { key: 'nationality', label: 'Nationality', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'booking_reference', label: 'Booking Reference', required: false },
  { key: 'channel', label: 'Channel', required: false },
  { key: 'notes', label: 'Notes', required: false },
];
