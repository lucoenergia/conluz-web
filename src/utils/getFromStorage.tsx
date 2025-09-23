// Function to search a key both in local and session storage. Local storage takes precedence
export function getFromStorage(key: string): string | null {
  const value = window.localStorage.getItem(key);
  return value ?? window.sessionStorage.getItem(key);
}
