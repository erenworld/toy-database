#include "sqliteInt.h"

void sqlite3PagerFlushPage(Pager *pPager, Pgno pgno, u32 nByte)
{
  if (pPager->apPage[pgno] == NULL) {
    printf("Tried to flush null page\n");
    exit(EXIT_FAILURE);
  }

  off_t offset = lseek(pPager->fd, pgno * SQLITE_DEFAULT_PAGE_SIZE, SEEK_SET);
  if (offset == -1) {
    printf("Error seeking: %d\n", errno);
    exit(EXIT_FAILURE);
  }

  ssize_t bytes_written = write(
    pPager->fd,
    pPager->apPage[pgno],
    nByte
  );

  if (bytes_written == -1 || (u32)bytes_written != nByte) {
    printf("Error writing: %d\n", errno);
    exit(EXIT_FAILURE);
  }
}

void *sqlite3PagerGet(Pager *pPager, Pgno pgno)
{
  if (pgno >= SQLITE_MAX_PAGE_COUNT) {
    printf("Tried to fetch page number out of bounds. %u >= %d\n", pgno, SQLITE_MAX_PAGE_COUNT);
    exit(EXIT_FAILURE);
  }

  if (pPager->apPage[pgno] == NULL) {
    // Cache miss. Allocate memory and load from file.
    void *page = calloc(1, SQLITE_DEFAULT_PAGE_SIZE);
    u32 num_pages = pPager->szFile / SQLITE_DEFAULT_PAGE_SIZE;

    // We might save a partial page at the end of the file
    if (pPager->szFile % SQLITE_DEFAULT_PAGE_SIZE) {
      num_pages += 1;
    }

    if (pgno < num_pages) {
      lseek(pPager->fd, pgno * SQLITE_DEFAULT_PAGE_SIZE, SEEK_SET);
      ssize_t bytes_read = read(pPager->fd, page, SQLITE_DEFAULT_PAGE_SIZE);
      if (bytes_read == -1) {
        printf("Error reading file: %d\n", errno);
        exit(EXIT_FAILURE);
      }
    }

    pPager->apPage[pgno] = page;
  }

  return pPager->apPage[pgno];
}

// Open the db file and keeps track of its size and also initializing the page cache to all NULLs.
Pager *sqlite3PagerOpen(const char *zFilename)
{
  int fd = open(zFilename, O_RDWR | O_CREAT, S_IWUSR | S_IRUSR);
  if (fd == -1) {
    printf("Unable to open the file\n");
    exit(EXIT_FAILURE);
  }

  off_t file_length = lseek(fd, 0, SEEK_END);

  Pager *pPager = malloc(sizeof(Pager));
  pPager->fd = fd;
  pPager->szFile = file_length;

  for (u32 i = 0; i < SQLITE_MAX_PAGE_COUNT; i++) {
    pPager->apPage[i] = NULL;
  }

  return pPager;
}
