const TARGET_CHARS_PER_PAGE = 2000;

export function createPages(text: string): string[] {
  const lines = text.split("\n");
  let pages: string[] = [];
  let currentPage: string = "";

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const currentPageLength = currentPage.length;

    if (currentPageLength + line.length + 1 > TARGET_CHARS_PER_PAGE) {
      pages.push(currentPage);
      currentPage = line;
    } else {
      currentPage += "\n" + line;
    }
  }

  if (currentPage) {
    pages.push(currentPage);
  }

  return pages.filter((page) => page.trim().length > 0);
}
