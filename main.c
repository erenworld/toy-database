/*
** EREN TURKOGLU, 2026
** toy-database
** File description:
** main
*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <sys/types.h>
#include <stdint.h>
#include <sys/stat.h>
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>


// A small wrapper around the state we need to store to interact with getline()
typedef struct { char *buffer; size_t buffer_length; ssize_t input_length; } InputBuffer;

typedef enum { EXECUTE_SUCCESS, EXECUTE_TABLE_FULL } ExecuteResult;

typedef enum 
{
  META_CMD_SUCCESS,
  META_CMD_UNRECOGNIZED
} MetaCommandResult;

typedef enum 
{
  PREPARE_SUCCESS,
  PREPARE_UNRECOGNIZED_STATEMENT,
  PREPARE_SYNTAX_ERROR,
  PREPARE_STRING_TOO_LONG,
  PREPARE_NEGATIVE_ID
} PrepareResult;

typedef enum 
{
  STATEMENT_INSERT,
  STATEMENT_SELECT
} StatementType;

#define COLUMN_USERNAME_SIZE 32
#define COLUMN_EMAIL_SIZE 255

typedef struct {
  uint32_t id; 
  char username[COLUMN_USERNAME_SIZE + 1];
  char email[COLUMN_EMAIL_SIZE + 1];
} Row;

typedef struct 
{
  StatementType type;
  Row row_to_insert;
} Statement;

#define size_of_attribute(Struct, Attribute) sizeof(((Struct*)0)->Attribute); 

const uint32_t ID_SIZE = size_of_attribute(Row, id);
const uint32_t USERNAME_SIZE = size_of_attribute(Row, username);
const uint32_t EMAIL_SIZE = size_of_attribute(Row, email);
const uint32_t ID_OFFSET = 0;
const uint32_t USERNAME_OFFSET = ID_OFFSET + ID_SIZE;
const uint32_t EMAIL_OFFSET = USERNAME_OFFSET + USERNAME_SIZE;
const uint32_t ROW_SIZE = ID_SIZE + USERNAME_SIZE + EMAIL_SIZE;

const uint32_t PAGE_SIZE = 4096;
#define TABLE_MAX_PAGES 100


// BTREE
typedef enum { NODE_INTERNAL, NODE_LEAF } NodeType;

// Node header layout
const uint32_t NODE_TYPE_SIZE = sizeof(uint8_t); // 1
const uint32_t NODE_TYPE_OFFSET = 0;
const uint32_t IS_ROOT_SIZE = sizeof(uint8_t);
const uint32_t IS_ROOT_OFFSET = NODE_TYPE_SIZE;
const uint32_t PARENT_POINTER_SIZE = sizeof(uint32_t); // 4
const uint32_t PARENT_POINTER_OFFSET = IS_ROOT_OFFSET + IS_ROOT_SIZE;
const uint8_t COMMON_NODE_HEADER_SIZE =
    NODE_TYPE_SIZE + IS_ROOT_SIZE + PARENT_POINTER_SIZE; // 6


// Leaf Node header layout
const uint32_t LEAF_NODE_NUM_CELLS_SIZE = sizeof(uint32_t);
const uint32_t LEAF_NODE_NUM_CELLS_OFFSET = COMMON_NODE_HEADER_SIZE;
const uint32_t LEAF_NODE_HEADER_SIZE =
    COMMON_NODE_HEADER_SIZE + LEAF_NODE_NUM_CELLS_SIZE; // 10

// Leaf Node body layout
// An array of cells. Each cell is a key followed by a value (a serialized row)
const uint32_t LEAF_NODE_KEY_SIZE = sizeof(uint32_t);
const uint32_t LEAF_NODE_KEY_OFFSET = 0;
const uint32_t LEAF_NODE_VALUE_SIZE = ROW_SIZE;
const uint32_t LEAF_NODE_VALUE_OFFSET =
    LEAF_NODE_KEY_OFFSET + LEAF_NODE_KEY_SIZE;
const uint32_t LEAF_NODE_CELL_SIZE = LEAF_NODE_KEY_SIZE + LEAF_NODE_VALUE_SIZE;

const uint32_t LEAF_NODE_SPACE_FOR_CELLS = PAGE_SIZE - LEAF_NODE_HEADER_SIZE;
const uint32_t LEAF_NODE_MAX_CELLS =
    LEAF_NODE_SPACE_FOR_CELLS / LEAF_NODE_CELL_SIZE;


// access keys, values and metadata

uint32_t *leaf_node_num_cells(void *node)
{
  return node + LEAF_NODE_NUM_CELLS_OFFSET;
}

void *leaf_node_cell(void *node, uint32_t cell_num)
{
  return node + LEAF_NODE_HEADER_SIZE + cell_num * LEAF_NODE_CELL_SIZE;
}

uint32_t *leaf_node_key(void *node, uint32_t cell_num)
{
  return leaf_node_cell(node, cell_num);
}

void *leaf_node_value(void *node, uint32_t cell_num)
{
  return leaf_node_cell(node, cell_num) + LEAF_NODE_KEY_SIZE;
}

void initialize_leaf_node(void *node) 
{
  *leaf_node_num_cells(node) = 0;
}


typedef struct {
  int fd;
  uint32_t file_length;
  uint32_t num_pages;
  void *pages[TABLE_MAX_PAGES];
} Pager;

typedef struct {
    Pager *pager;
    uint32_t root_page_num;
} Table;

typedef struct {
    Table *table;
    uint32_t page_num;
    uint32_t cell_num;
    bool end_of_table;  // Indicates a position one past the last element
} Cursor;


InputBuffer *new_input_buffer(void)
{
  InputBuffer *input = (InputBuffer *)malloc(sizeof(InputBuffer));

  input->buffer = NULL;
  input->buffer_length = 0; 
  input->input_length = 0;

  return input;
}

// we wanted to ensure that all bytes are initialized, we use strncpy instead of memcpy
void serialize_row(Row *source, void *dest)
{
  memcpy(dest + ID_OFFSET, &(source->id), ID_SIZE);
  strncpy(dest + USERNAME_OFFSET, source->username, USERNAME_SIZE);
  strncpy(dest + EMAIL_OFFSET, source->email, EMAIL_SIZE);
}

void deserialize_row(void *source, Row *dest)
{
  memcpy(&(dest->id), source + ID_OFFSET, ID_SIZE);
  memcpy(&(dest->username), source + USERNAME_OFFSET, USERNAME_SIZE);
  memcpy(&(dest->email), source + EMAIL_OFFSET, EMAIL_SIZE);
}

static void print_prompt(void)
{
  printf("sqlite > ");
}

// getline to store the read line in input_buffer->buffer and the size of the allocated buffer in input_buffer->buffer_length. 
// We store the return value in input_buffer->input_length.
static void read_input(InputBuffer *input)
{
  ssize_t bytes_read =
    getline(&(input->buffer), &(input->buffer_length), stdin);

  if (bytes_read <= 0) {
    printf("Error reading stdin. \n");
    exit(EXIT_FAILURE);
  }

  // ignore trailing newline
  input->input_length = bytes_read - 1;
  input->buffer[bytes_read - 1] = 0;
}

void pager_flush(Pager *pager, uint32_t page_num)
{
  if (pager->pages[page_num] == NULL) {
    printf("Tried to flush null page\n");
    exit(EXIT_FAILURE);
  }

  off_t offset = lseek(pager->fd, page_num * PAGE_SIZE, SEEK_SET);
  if (offset == -1) {
    printf("Error seeking: %d\n", errno);
    exit(EXIT_FAILURE);
  }

  ssize_t bytes_written =
    write(pager->fd, pager->pages[page_num], PAGE_SIZE);
  if (bytes_written == -1) {
    printf("Error writing: %d\n", errno);
    exit(EXIT_FAILURE);
  }
}

void db_close(Table *table)
{
  Pager *pager = table->pager;

  for (uint32_t i = 0; i < pager->num_pages; i++) {
    if (pager->pages[i] == NULL) {
      continue;
    }
    pager_flush(pager, i);
    free(pager->pages[i]);
    pager->pages[i] = NULL;
  }

  int result = close(pager->fd);
  if (result == -1) {
    printf("Error closing db file.\n");
    exit(EXIT_FAILURE);
  }

  for (uint32_t i = 0; i < TABLE_MAX_PAGES; i++) {
    void *page = pager->pages[i];
    if (page) {
      free(page);
      pager->pages[i] = NULL;
    }
  }
  free(pager);
  free(table);
}

MetaCommandResult do_meta_cmd(InputBuffer *input, Table* table)
{
  if (strcmp(input->buffer, ".exit") == 0) {
    db_close(table);
    exit(EXIT_SUCCESS);
  } else {
    return META_CMD_UNRECOGNIZED;
  }
}

static void print_row(Row *row)
{
    printf("(%d, %s, %s)\n", row->id, row->username, row->email);
}

// The logic for handling a cache miss
// Page 0 at offset 0, page 1 at offset 4096, page 2 at offset 8192, etc
void *get_page(Pager *pager, uint32_t page_num)
{
  if (page_num > TABLE_MAX_PAGES) {
    printf("Tried to fetch page number out of bounds. %d > %d\n", page_num,
        TABLE_MAX_PAGES);
    exit(EXIT_FAILURE);
  }
  if (pager->pages[page_num] == NULL) {
    // cache miss. allocate memory and load from file.
    void *page = malloc(PAGE_SIZE);
    if (page == NULL) exit(EXIT_FAILURE);
    uint32_t num_pages = pager->file_length / PAGE_SIZE;

    // I might save a partial page at the end of the file
    if (pager->file_length % PAGE_SIZE) {
      num_pages += 1;
    }

    if (page_num <= num_pages) {
      lseek(pager->fd, page_num * PAGE_SIZE, SEEK_SET);
      ssize_t bytes_read = read(pager->fd, page, PAGE_SIZE);
      if (bytes_read == -1) {
        printf("Error reading file: %d\n", errno);
        exit(EXIT_FAILURE);
      }
    }
    pager->pages[page_num] = page;

    if (page_num >= pager->num_pages) {
      pager->num_pages = page_num + 1;
    }
  }
  return pager->pages[page_num];
}

Cursor *table_start(Table *table)
{
    Cursor *cursor = malloc(sizeof(Cursor));

    if (cursor == NULL) {
        printf("malloc error");
        exit(EXIT_FAILURE);
    }

    cursor->table = table;
    cursor->page_num = table->root_page_num;
    cursor->cell_num = 0;

    void *root_node = get_page(table->pager, table->root_page_num);
    uint32_t num_cells = *leaf_node_num_cells(root_node);
    cursor->end_of_table = (num_cells == 0);

    return cursor;
}

Cursor *table_end(Table *table)
{
    Cursor *cursor = malloc(sizeof(Cursor));

    if (cursor == NULL) {
        printf("malloc error");
        exit(EXIT_FAILURE);
    }

    cursor->table = table; 
    cursor->page_num = table->root_page_num;
    
    void *root_node = get_page(table->pager, table->root_page_num);
    uint32_t num_cells = *leaf_node_num_cells(root_node);
    cursor->cell_num = num_cells;
    cursor->end_of_table = true;

    return cursor;
}

// Helper to read/write address memory for a particular row 
void *cursor_value(Cursor *cursor)
{
    uint32_t page_num = cursor->page_num;
      void* page = get_page(cursor->table->pager, page_num);

    return leaf_node_value(page, cursor->cell_num);
}

void cursor_advance(Cursor *cursor)
{
  uint32_t page_num = cursor->page_num;
  void *node = get_page(cursor->table->pager, page_num);

  cursor->cell_num += 1;
  if (cursor->cell_num >= (*leaf_node_num_cells(node))) {
    cursor->end_of_table = true;
  }
}

PrepareResult prepare_insert(InputBuffer *input, Statement *statement)
{
  statement->type = STATEMENT_INSERT;

  char *keyword = strtok(input->buffer, " ");
  char *id_string = strtok(NULL, " ");
  char *username = strtok(NULL, " ");
  char *email = strtok(NULL, " ");

  if (id_string == NULL || username == NULL || email == NULL) {
    return PREPARE_SYNTAX_ERROR;
  }

  int id = atoi(id_string);
  if (id < 0) {
    return PREPARE_NEGATIVE_ID;
  }

  if (strlen(username) > COLUMN_USERNAME_SIZE) {
    return PREPARE_STRING_TOO_LONG;
  }
  if (strlen(email) > COLUMN_EMAIL_SIZE) {
   return PREPARE_STRING_TOO_LONG;
  }

  statement->row_to_insert.id = id;
  strcpy(statement->row_to_insert.username, username); 
  strcpy(statement->row_to_insert.email, email);

  return PREPARE_SUCCESS;
}

// SQL compiler
PrepareResult prepare_statement(InputBuffer *input, Statement *statement)
{
  if (strncmp(input->buffer, "insert", 6) == 0) {
    return prepare_insert(input, statement);
  }
  if (strcmp(input->buffer, "select") == 0) {
    statement->type = STATEMENT_SELECT;
    return PREPARE_SUCCESS;
  }
  
  return PREPARE_UNRECOGNIZED_STATEMENT;
}

ExecuteResult execute_insert(Statement *statement, Table *table)
{
    if (table->num_rows >= TABLE_MAX_ROWS) {
        return EXECUTE_TABLE_FULL;
    }
    Row *row_to_insert = &(statement->row_to_insert);
    Cursor *cursor = table_end(table);

    serialize_row(row_to_insert, cursor_value(cursor));
    table->num_rows += 1;
    free(cursor);
    
    return EXECUTE_SUCCESS;
}

ExecuteResult execute_select(Statement *statement, Table *table)
{
    Cursor *cursor = table_start(table);
    Row row;
  
    while (!(cursor->end_of_table)) {
        deserialize_row(cursor_value(cursor), &row);
        print_row(&row);
        cursor_advance(cursor);
    }
    free(cursor);
    return EXECUTE_SUCCESS;
}

ExecuteResult execute_statement(Statement *statement, Table *table)
{
  switch (statement->type) {
    case (STATEMENT_INSERT):
      return execute_insert(statement, table);
    case (STATEMENT_SELECT):
      return execute_select(statement, table);
  }
}

// Opens the database file and keeps track of its size. It also initializes the page cache to all NULLs
Pager *pager_open(const char *filename)
{
  int fd = open(filename, O_RDWR | O_CREAT, S_IWUSR | S_IRUSR);
  if (fd == -1) {
    printf("unable to open file\n");
    exit(EXIT_FAILURE);
  }

  off_t file_length = lseek(fd, 0, SEEK_END);
  Pager *pager = malloc(sizeof(Pager));
  if (pager == NULL) {
    printf("286 - malloc error");
    exit(EXIT_FAILURE);
  }
  pager->fd = fd;
  pager->file_length = file_length;
  pager->num_pages = (file_length / PAGE_SIZE);

  if (file_length % PAGE_SIZE != 0) {
    printf("Db file is not a whole number of pages. Corrupt file.\n");
    exit(EXIT_FAILURE);
  }

  for (uint32_t i = 0; i < TABLE_MAX_PAGES; i++) {
    pager->pages[i] = NULL;
  }
  return pager;
}

Table *db_open(const char *filename)
{
    Pager *pager = pager_open(filename);
    uint32_t num_rows = pager->file_length / ROW_SIZE;

    Table *table = malloc(sizeof(Table));
    table->pager = pager;
    // table->num_rows = num_rows;  
  
    return table;
}

// REPL
int main(int argc, char *argv[])
{
  if (argc < 2) {
    printf("Must supply a database filename.\n");
    exit(EXIT_FAILURE);
  }

  char *filename = argv[1];
  Table *table = db_open(filename);
  InputBuffer *input = new_input_buffer();

  while (true) {
    print_prompt();
    read_input(input);

    if (input->buffer[0] == '.') {
      switch (do_meta_cmd(input, table)) {
        case (META_CMD_SUCCESS):
          continue;
        case (META_CMD_UNRECOGNIZED):
          printf("Unrecognized command '%s'\n", input->buffer);
          continue;
      }
    }
    
    Statement statement;
    switch (prepare_statement(input, &statement)) {
      case (PREPARE_SUCCESS):
        break;
      case (PREPARE_STRING_TOO_LONG):
        printf("String is too long.\n");
        continue;
      case (PREPARE_SYNTAX_ERROR):
        printf("Syntax error. Could not parse statement.\n");
        continue;
      case (PREPARE_NEGATIVE_ID):
        printf("ID must be positive.\n");
        continue;
      case (PREPARE_UNRECOGNIZED_STATEMENT):
        printf("Unrecognized keyword at start of '%s'.\n",
          input->buffer);
        continue;
    }
    switch (execute_statement(&statement, table)) {
      case (EXECUTE_SUCCESS):
        printf("Executed.\n");
        break;
      case (EXECUTE_TABLE_FULL):
        printf("Error: table full.\n");
        break;
    }
  }
  return 0;
}
