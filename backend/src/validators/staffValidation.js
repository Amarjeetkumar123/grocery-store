import { normalizeIndianMobileNumber, readOptionalText, readRequiredText } from './commonValidation.js';

const staffRoles = ['owner', 'packer', 'rider'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// isNew: the email is only given when adding someone.
export function validateStaffInput(body, isNew) {
  const fieldErrors = {};
  const phoneInput = readOptionalText(body, 'phone', 'Phone', 20, fieldErrors);
  const member = {
    email: isNew ? readRequiredText(body, 'email', 'Email', 254, fieldErrors)?.toLowerCase() ?? null : null,
    name: readRequiredText(body, 'name', 'Name', 60, fieldErrors),
    phone: phoneInput ? normalizeIndianMobileNumber(phoneInput) : null,
    role: body.role,
    active: typeof body.active === 'boolean' ? body.active : true,
  };
  if (isNew && member.email && !emailPattern.test(member.email)) fieldErrors.email = 'Enter a valid email address.';
  if (phoneInput && !member.phone) fieldErrors.phone = 'Enter a valid 10-digit mobile number.';
  if (!staffRoles.includes(member.role)) fieldErrors.role = 'Choose owner, packer or rider.';
  return { member, fieldErrors };
}
