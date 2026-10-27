#ifndef SQLITEINT_H
#define SQLITEINT_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>

#include "sqlite3.h"

typedef uint32_t u32;

#define SQLITE_DEFAULT_PAGE_SIZE 4096
#define SQLITE_MAX_PAGE_COUNT 100

#include "pager.h"

typedef enum { STATEMENT_INSERT, STATEMENT_SELECT } StatementType;

#define COLUMN_EMAIL_SIZE 255
#define COLUMN_USERNAME_SIZE 32

typedef struct {
  u32 id;
  char username[COLUMN_USERNAME_SIZE + 1];
  char email[COLUMN_EMAIL_SIZE + 1];
} Row;

// Compact representation of a row
#define size_of_attribute(Struct, Attribute) sizeof(((Struct *)0)->Attribute)

static const u32 ID_SIZE = size_of_attribute(Row, id);
static const u32 USERNAME_SIZE = size_of_attribute(Row, username);
static const u32 EMAIL_SIZE = size_of_attribute(Row, email);
static const u32 ID_OFFSET = 0;
static const u32 USERNAME_OFFSET = ID_OFFSET + ID_SIZE;
static const u32 EMAIL_OFFSET = USERNAME_OFFSET + USERNAME_SIZE;
static const u32 ROW_SIZE = ID_SIZE + USERNAME_SIZE + EMAIL_SIZE;

static const u32 ROWS_PER_PAGE = SQLITE_DEFAULT_PAGE_SIZE / ROW_SIZE;
static const u32 TABLE_MAX_ROWS = ROWS_PER_PAGE * SQLITE_MAX_PAGE_COUNT;

struct sqlite3 {
  Pager *pPager;
  u32 nRow;
};

typedef struct Vdbe Vdbe;
struct Vdbe {
  StatementType type;
  Row row_to_insert; // Only used by insert
};

#include "vdbe.h"

/*
** prepare.c
*/
PrepareResult sqlite3_prepare(char *zSql, Vdbe *p);

#endif /* SQLITEINT_H */
