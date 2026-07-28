export function getExternalBrowserUrl(href: string) {
  return new URL(href, window.location.origin).toString();
}

export function openExternalBrowser(
  href: string,
  preparedWindow?: Window | null,
) {
  try {
    const externalUrl = getExternalBrowserUrl(href);

    if (preparedWindow && !preparedWindow.closed) {
      preparedWindow.location.href = externalUrl;
      preparedWindow.opener = null;
      preparedWindow.focus();
      return true;
    }

    const externalWindow =
      window.open(externalUrl, "_system") ?? window.open(externalUrl, "_blank");

    if (externalWindow) {
      externalWindow.opener = null;
      externalWindow.focus();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
