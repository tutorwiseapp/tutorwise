import { User } from '@/types';

// Using a simple, non-crypto hash for client-side consistency.
// In a real app with a backend, this might not be needed.
const simpleHash = (str: string = ''): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const getProfileImageUrl = (user: Partial<User>): string => {
  if (user.customPictureUrl) {
    return user.customPictureUrl;
  }
  if (user.email) {
    const emailHash = simpleHash(user.email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${emailHash}?d=mp&s=150`;
  }
  return `https://i.pravatar.cc/150?u=${user.agentId || 'default'}`;
};