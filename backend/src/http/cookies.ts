export function getCookieValue(
  cookieHeader: string | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const separatorPosition = cookie.indexOf('=');

    if (separatorPosition === -1) {
      continue;
    }

    const name = cookie
      .slice(0, separatorPosition)
      .trim();

    if (name !== cookieName) {
      continue;
    }

    const value = cookie
      .slice(separatorPosition + 1)
      .trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}