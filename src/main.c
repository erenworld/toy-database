// Eren Türkoglu
// 2026
// Sqlite from scratch
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <sys/types.h>

// A small wrapper around the state we need to store to interact with getline().
typedef struct { char *buffer; size_t buffer_length; ssize_t input_length; } InputBuffer;

typedef enum 
{
  META_CMD_SUCCESS,
  META_CMD_UNRECOGNIZED
} MetaCommandResult;

typedef enum 
{
  PREPARE_SUCCESS,
  PREPARE_UNRECOGNIZED_STATEMENT
} PrepareResult;

typedef enum 
{
  STATEMENT_INSERT,
  STATEMENT_SELECT
} StatementType;

typedef struct 
{
  StatementType type;
  row_to_insert Row;
} Statement;

#define COLUMN_USERNAME_SIZE 32
#define COLUMN_EMAIL_SIZE 255

typedef struct {
  uint32_t id; 
  char username[COLUMN_USERNAME_SIZE];
  char email[COLUMN_EMAIL_SIZE];
} Row;

#define size_of_attribute(Struct, Attribute) sizeof(((Struct*)0)->Attribute); 

const uint32_t ID_SIZE = size_of_attribute(Row, id);
const uint32_t USERNAME_SIZE = size_of_attribute(Row, username);
const uint32_t EMAIL_SIZE = size_of_attribute(Row, email);
const uint32_t ID_OFFSET = 0;
const uint32_t USERNAME_OFFSET = ID_OFFSET + ID_SIZE;
const uint32_t EMAIL_OFFSET = USERNAME_OFFSET + USERNAME_SIZE;
const uint32_t ROW_SIZE = ID_SIZE + USERNAME_SIZE + EMAIL_SIZE;

InputBuffer *new_input_buffer(void)
{
  InputBuffer *input = (InputBuffer *)malloc(sizeof(InputBuffer));

  input->buffer = NULL;
  input->buffer_length = 0; 
  input->input_length = 0;

  return input;
}

static void print_prompt(void)
{
  printf("db > ");
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

MetaCommandResult do_meta_cmd(InputBuffer *input)
{
  if (strcmp(input->buffer, ".exit") == 0) {
    exit(EXIT_SUCCESS);
  } else {
    return META_CMD_UNRECOGNIZED;
  }
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

void execute_statement(Statement *statement)
{
  switch (statement->type) {
    case (STATEMENT_INSERT):
      printf("This is where we would do an insert.\n");
      break;
    case (STATEMENT_SELECT):
      printf("This is where we would do an select.\n");
      break;
  }
}

// REPL
int main(int argc, char *argv[])
{
  InputBuffer *input = new_input_buffer();

  while (true) {
    print_prompt();
    read_input(input);

    if (input->buffer[0] == '.') {
      switch (do_meta_cmd(input)) {
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
      case (PREPARE_UNRECOGNIZED_STATEMENT):
        printf("Unrecognized keyword at start of '%s'.\n",
          input->buffer);
        continue;
    }
    execute_statement(&statement);
    printf("Executed. \n");
  }
  return 0;
}

