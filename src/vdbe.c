#include "sqliteInt.h"

static void *rowSlot(sqlite3 *db, u32 iRow) {
  Pgno pgno = iRow / ROWS_PER_PAGE;
  void *page = sqlite3PagerGet(db->pPager, pgno);
  u32 row_offset = iRow % ROWS_PER_PAGE; // which row on that page
  u32 byte_offset = row_offset * ROW_SIZE;  // byte position of that row in the page
  return page + byte_offset;
}

static void print_row(Row *row) {
  printf("(%d, %s, %s)\n", row->id, row->username, row->email);
}

static ExecuteResult vdbeExecInsert(Vdbe *p, sqlite3 *db) {
  if (db->nRow >= TABLE_MAX_ROWS) {
    return EXECUTE_TABLE_FULL;
  }
  Row *row_to_insert = &(p->row_to_insert);
  sqlite3VdbeSerialPut(row_to_insert, rowSlot(db, db->nRow));
  db->nRow += 1;

  return EXECUTE_SUCCESS;
}

static ExecuteResult vdbeExecSelect(Vdbe *p, sqlite3 *db) {
  (void)p;
  Row row;

  for (u32 i = 0; i < db->nRow; i++) {
    sqlite3VdbeSerialGet(rowSlot(db, i), &row);
    print_row(&row);
  }

  return EXECUTE_SUCCESS;
}

ExecuteResult sqlite3VdbeExec(Vdbe *p, sqlite3 *db) {
  switch (p->type) {
  case (STATEMENT_INSERT):
    return vdbeExecInsert(p, db);
  case (STATEMENT_SELECT):
    return vdbeExecSelect(p, db);
  }
  return EXECUTE_SUCCESS;
}
