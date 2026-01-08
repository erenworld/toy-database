// Eren Türkoglu
// 2026
// Sqlite from scratch
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <sys/types.h>
#include <stdint.h>

// A small wrapper around the state we need to store to interact with getline().
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
  PREPARE_SYNTAX_ERROR
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
  char username[COLUMN_USERNAME_SIZE];
  char email[COLUMN_EMAIL_SIZE];
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
// max memory 400KB
const uint32_t ROWS_PER_PAGE = PAGE_SIZE / ROW_SIZE;
const uint32_t TABLE_MAX_ROWS = ROWS_PER_PAGE * TABLE_MAX_PAGES;
// ROW_SIZE = 100 bytes
// 4096 / 100 ≈ 40 line per page

typedef struct {
    uint32_t num_rows;
    void *pages[TABLE_MAX_PAGES];  // each entry points to a page
} Table;

InputBuffer *new_input_buffer(void)
{
  InputBuffer *input = (InputBuffer *)malloc(sizeof(InputBuffer));

  input->buffer = NULL;
  input->buffer_length = 0; 
  input->input_length = 0;

  return input;
}

void serialize_row(Row *source, void *dest)
{
  memcpy(dest + ID_OFFSET, &(source->id), ID_SIZE);
  memcpy(dest + USERNAME_OFFSET, &(source->username), USERNAME_SIZE);
  memcpy(dest + EMAIL_OFFSET, &(source->email), EMAIL_SIZE);
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

static void close_input_buffer(InputBuffer *input)
{
  free(input->buffer);
  free(input);
}

void free_table(Table *table)
{
    for (int i = 0; table->pages[i]; i++) {
      free(table->pages[i]);
    }
    free(table);
}

MetaCommandResult do_meta_cmd(InputBuffer *input, Table *table)
{
  if (strcmp(input->buffer, ".exit") == 0) {
    close_input_buffer(input);
    free_table(table);
    exit(EXIT_SUCCESS);
  } else {
    return META_CMD_UNRECOGNIZED;
  }
}

static void print_row(Row *row)
{
    printf("%d %s %s\n", row->id, row->username, row->email);
}

// Helper to read/write address memory for a particular row 
void *row_slot(Table *table, uint32_t row_num)
{
    uint32_t page_num = row_num / ROWS_PER_PAGE;
    void *page = table->pages[page_num];
    if (page == NULL) {
        // Lazy allocation
        page = table->pages[page_num] = malloc(PAGE_SIZE);
    }
    uint32_t row_offset = row_num % ROWS_PER_PAGE;
    uint32_t byte_offset = row_offset * ROW_SIZE;
    return page + byte_offset; // memory pointer
}

// SQL compiler
PrepareResult prepare_statement(InputBuffer *input, Statement *statement)
{
  if (strncmp(input->buffer, "insert", 6) == 0) {
    statement->type = STATEMENT_INSERT;
    int args_assigned = sscanf(
      input->buffer, "insert %d %s %s", &(statement->row_to_insert.id),
      statement->row_to_insert.username, statement->row_to_insert.email);
    if (args_assigned < 3) {
      return PREPARE_SYNTAX_ERROR;
    }
    return PREPARE_SUCCESS;
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
    serialize_row(row_to_insert, row_slot(table, table->num_rows));
    table->num_rows += 1;
    
    return EXECUTE_SUCCESS;
}

ExecuteResult execute_select(Statement *statement, Table *table)
{
    Row row;
  
    for (uint32_t i = 0; i < table->num_rows; i++) {
        deserialize_row(row_slot(table, i), &row);
        print_row(&row);
    }
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

Table *new_table(void)
{
    Table *table = (Table*)malloc(sizeof(Table));
    table->num_rows = 0;
  
    for (uint32_t i = 0; i < TABLE_MAX_PAGES; i++) {
        table->pages[i] = NULL;
    }
    return table;
}

// REPL
int main(int argc, char *argv[])
{
  InputBuffer *input = new_input_buffer();
  Table *table = new_table();

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
      case (PREPARE_SYNTAX_ERROR):
        printf("Syntax error. Could not parse statement.\n");
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

