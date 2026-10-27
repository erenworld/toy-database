#ifndef SQLITE3_H
#define SQLITE3_H

typedef struct sqlite3 sqlite3;

typedef enum {
  PREPARE_SUCCESS,
  PREPARE_NEGATIVE_ID,
  PREPARE_UNRECOGNIZED_STATEMENT,
  PREPARE_SYNTAX_ERROR,
  PREPARE_STRING_TOO_LONG
} PrepareResult;

typedef enum { EXECUTE_SUCCESS, EXECUTE_TABLE_FULL } ExecuteResult;

sqlite3 *sqlite3_open(const char *zFilename);
void sqlite3_close(sqlite3 *db);

#endif /* SQLITE3_H */
