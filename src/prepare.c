#include "sqliteInt.h"

static PrepareResult prepareInsert(char *zSql, Vdbe *p)
{
  strtok(zSql, " "); // skip the "insert" keyword
  char* string_id = strtok(NULL, " ");
  char* username = strtok(NULL, " ");
  char* email = strtok(NULL, " ");

  if (string_id == NULL || username == NULL || email == NULL) {
    return PREPARE_SYNTAX_ERROR;
  }

  char *end;
  errno = 0;
  long id = strtol(string_id, &end, 10);
  if (*end != '\0' || errno == ERANGE) {
    return PREPARE_SYNTAX_ERROR;
  }
  if (id < 0) {
    return PREPARE_NEGATIVE_ID;
  }
  if (id > UINT32_MAX) {
    return PREPARE_SYNTAX_ERROR;
  }
  if (strlen(username) > COLUMN_USERNAME_SIZE) {
    return PREPARE_STRING_TOO_LONG;
  }
  if (strlen(email) > COLUMN_EMAIL_SIZE) {
    return PREPARE_STRING_TOO_LONG;
  }


  p->row_to_insert.id = (u32)id;
  strcpy(p->row_to_insert.username, username);
  strcpy(p->row_to_insert.email, email);
  p->type = STATEMENT_INSERT;
  return PREPARE_SUCCESS;
}

PrepareResult sqlite3_prepare(char *zSql, Vdbe *p) {
  if (strncmp(zSql, "insert ", 7) == 0 ||
      strcmp(zSql, "insert") == 0) {
    return prepareInsert(zSql, p);
  }
  if (strcmp(zSql, "select") == 0) {
    p->type = STATEMENT_SELECT;
    return PREPARE_SUCCESS;
  }

  return PREPARE_UNRECOGNIZED_STATEMENT;
}
