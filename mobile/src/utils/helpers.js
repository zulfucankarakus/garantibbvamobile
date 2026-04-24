export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0,00 ₺';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const maskIBAN = (iban) => {
  if (!iban || iban.length < 8) return iban;
  const visible = iban.slice(0, 4) + iban.slice(-4);
  const masked = '*'.repeat(iban.length - 8);
  return visible.slice(0, 4) + masked + visible.slice(-4);
};

export const maskCardNumber = (cardNo) => {
  if (!cardNo || cardNo.length < 8) return cardNo;
  const cleaned = cardNo.replace(/\s/g, '');
  const masked = cleaned.slice(0, 4) + ' **** **** ' + cleaned.slice(-4);
  return masked;
};

export const validateTCKN = (tckn) => {
  if (!tckn || tckn.length !== 11) return false;
  
  const digits = tckn.split('').map(Number);
  if (digits[0] === 0) return false;
  
  const sum10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  if (sum10 % 10 !== digits[10]) return false;
  
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const even = digits[1] + digits[3] + digits[5] + digits[7];
  if (((odd * 7) - even) % 10 !== digits[9]) return false;
  
  return true;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};
