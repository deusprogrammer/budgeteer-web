export class ValidationError extends Error {}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isIsoDateTime = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isIsoDate = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function check(errors, condition, message) {
  if (!condition) errors.push(message);
}

function finish(errors, value) {
  if (errors.length) throw new ValidationError(errors.join('; '));
  return value;
}

export function validateTransaction(body = {}) {
  const errors = [];
  const category = body.category ?? 'Uncategorized';
  const timestamp = body.timestamp ?? new Date().toISOString();
  check(errors, isNumber(body.amount), 'amount must be a number');
  check(errors, isNonEmptyString(category), 'category must be a non-empty string');
  check(errors, isIsoDateTime(timestamp), 'timestamp must be an ISO 8601 date-time');
  return finish(errors, {
    amount: body.amount,
    category,
    timestamp: errors.length ? timestamp : new Date(timestamp).toISOString(),
  });
}

export function validateBill(body = {}) {
  const errors = [];
  check(errors, isNonEmptyString(body.name), 'name must be a non-empty string');
  check(errors, isNumber(body.amount), 'amount must be a number');
  check(errors, isNumber(body.leftToPay), 'leftToPay must be a number');
  check(
    errors,
    Number.isInteger(body.dayOfMonth) && body.dayOfMonth >= 1 && body.dayOfMonth <= 31,
    'dayOfMonth must be an integer between 1 and 31',
  );
  return finish(errors, {
    name: body.name?.trim(),
    amount: body.amount,
    leftToPay: body.leftToPay,
    dayOfMonth: body.dayOfMonth,
  });
}

export function validatePayday(body = {}) {
  const errors = [];
  check(errors, isNonEmptyString(body.name), 'name must be a non-empty string');
  check(errors, isNumber(body.amount), 'amount must be a number');
  check(errors, isIsoDate(body.exampleDate), 'exampleDate must be a date in YYYY-MM-DD format');
  return finish(errors, {
    name: body.name?.trim(),
    amount: body.amount,
    exampleDate: body.exampleDate,
  });
}
