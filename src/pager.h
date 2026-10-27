#ifndef SQLITE_PAGER_H
#define SQLITE_PAGER_H

/*
** The type used to represent a page number.
*/
typedef u32 Pgno;

typedef struct Pager Pager;
struct Pager {
  int fd;
  u32 szFile;
  void *apPage[SQLITE_MAX_PAGE_COUNT];
};

Pager *sqlite3PagerOpen(const char *zFilename);
void *sqlite3PagerGet(Pager *pPager, Pgno pgno);
void sqlite3PagerFlushPage(Pager *pPager, Pgno pgno, u32 nByte);

#endif /* SQLITE_PAGER_H */
