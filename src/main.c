#include "sqliteInt.h"

sqlite3 *sqlite3_open(const char *zFilename) {
  Pager *pPager = sqlite3PagerOpen(zFilename);

  // Each full page ends with unused padding (SQLITE_DEFAULT_PAGE_SIZE % ROW_SIZE bytes),
  // so count full pages and the trailing partial page separately.
  u32 num_full_pages = pPager->szFile / SQLITE_DEFAULT_PAGE_SIZE;
  u32 remainder = pPager->szFile % SQLITE_DEFAULT_PAGE_SIZE;
  u32 nRow = num_full_pages * ROWS_PER_PAGE + remainder / ROW_SIZE;

  sqlite3 *db = malloc(sizeof(sqlite3));
  db->pPager = pPager;
  db->nRow = nRow;

  return db;
}

void sqlite3_close(sqlite3 *db)
{
  Pager *pPager = db->pPager;
  u32 num_full_pages = db->nRow / ROWS_PER_PAGE;

  for (u32 i = 0; i < num_full_pages; i++) {
    if (pPager->apPage[i] == NULL) {
      continue;
    }
    sqlite3PagerFlushPage(pPager, i, SQLITE_DEFAULT_PAGE_SIZE);
    free(pPager->apPage[i]);
    pPager->apPage[i] = NULL;
  }

  // There may be a partial page to write to the end of the file
  // This should not be needed after we switch to a B-tree
  u32 num_additional_rows = db->nRow % ROWS_PER_PAGE;
   if (num_additional_rows > 0) {
    Pgno pgno = num_full_pages;
    if (pPager->apPage[pgno] != NULL) {
      sqlite3PagerFlushPage(pPager, pgno, num_additional_rows * ROW_SIZE);
      free(pPager->apPage[pgno]);
      pPager->apPage[pgno] = NULL;
    }
  }

  int result = close(pPager->fd);
  if (result == -1) {
    printf("Error closing db file.\n");
    exit(EXIT_FAILURE);
  }
  for (u32 i = 0; i < SQLITE_MAX_PAGE_COUNT; i++) {
    void* page = pPager->apPage[i];
    if (page) {
      free(page);
      pPager->apPage[i] = NULL;
    }
  }
  free(pPager);
  free(db);
}
