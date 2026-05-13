export const LINKED_ACCOUNT_KEY = 'crexus_linked_account';

export const parseRiotId = (value = '') => {
  const [name, tag] = value.split('#').map((part) => part?.trim());
  if (!name || !tag) return null;
  return { name, tag };
};

export const accountKey = (account) => account ? `${account.name}#${account.tag}:${account.region}` : '';

export const readLinkedAccount = () => {
  try {
    const value = localStorage.getItem(LINKED_ACCOUNT_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const writeLinkedAccount = (account) => {
  if (!account?.name || !account?.tag || !account?.region) return null;
  const cleaned = {
    name: account.name,
    tag: account.tag,
    region: account.region,
    iconId: account.iconId || null,
  };
  localStorage.setItem(LINKED_ACCOUNT_KEY, JSON.stringify(cleaned));
  window.dispatchEvent(new CustomEvent('crexus-linked-account-change', { detail: cleaned }));
  return cleaned;
};

export const clearLinkedAccount = () => {
  localStorage.removeItem(LINKED_ACCOUNT_KEY);
  window.dispatchEvent(new CustomEvent('crexus-linked-account-change', { detail: null }));
};
