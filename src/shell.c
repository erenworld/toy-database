#include "sqliteInt.h"

typedef enum {
  META_COMMAND_SUCCESS,
  META_UNRECOGNIZED_COMMAND,
} MetaCommandResult;

typedef struct {
  char *buffer;
  size_t buffer_length;
  ssize_t input_length;
} InputBuffer;

static InputBuffer *new_input_buffer() {
  InputBuffer *input = (InputBuffer *)malloc(sizeof(InputBuffer));
  input->buffer = NULL;
  input->buffer_length = 0;
  input->input_length = 0;

  return input;
}

static void print_prompt() { printf("sqlite > "); }

static bool one_input_line(InputBuffer *input_buffer) {
  ssize_t bytes_read =
      getline(&(input_buffer->buffer), &(input_buffer->buffer_length), stdin);

  if (bytes_read <= 0) {
    if (feof(stdin)) {
      return false;
    }
    printf("Error reading input\n");
    exit(EXIT_FAILURE);
  }

  // Ignore trailing newline
  input_buffer->input_length = bytes_read - 1;
  input_buffer->buffer[bytes_read - 1] = 0;
  return true;
}

static void close_input_buffer(InputBuffer *input_buffer) {
  free(input_buffer->buffer);
  free(input_buffer);
}

static MetaCommandResult do_meta_command(InputBuffer *input_buffer, sqlite3 *db) {
  if (strcmp(input_buffer->buffer, ".exit") == 0) {
    close_input_buffer(input_buffer);
    sqlite3_close(db);
    exit(EXIT_SUCCESS);
  } else {
    return META_UNRECOGNIZED_COMMAND;
  }
}

int main(int argc, char *argv[]) {
  if (argc < 2) {
    printf("Must give a database filename.\n");
    exit(EXIT_FAILURE);
  }
  const char *zFilename = argv[1];
  sqlite3 *db = sqlite3_open(zFilename);
  InputBuffer *input_buffer = new_input_buffer();

  while (true) {
    print_prompt();
    if (!one_input_line(input_buffer)) {
      printf("\n");
      close_input_buffer(input_buffer);
      sqlite3_close(db);
      exit(EXIT_SUCCESS);
    }

    if (input_buffer->buffer[0] == '.') {
      switch (do_meta_command(input_buffer, db)) {
      case (META_COMMAND_SUCCESS):
        continue;
      case (META_UNRECOGNIZED_COMMAND):
        printf("Unrecognized command '%s'\n", input_buffer->buffer);
        continue;
      }
    }

    Vdbe statement = {0};
    switch (sqlite3_prepare(input_buffer->buffer, &statement)) {
    case (PREPARE_SUCCESS):
      break;
    case (PREPARE_NEGATIVE_ID):
      printf("ID must be positive.\n");
      continue;
    case (PREPARE_STRING_TOO_LONG):
      printf("String is too long.\n");
      continue;
    case (PREPARE_UNRECOGNIZED_STATEMENT):
      printf("Unrecognized keyword at start of '%s'.\n", input_buffer->buffer);
      continue;
    case (PREPARE_SYNTAX_ERROR):
      printf("Syntax error. Could not parse statement.\n");
      continue;
    }
    switch (sqlite3VdbeExec(&statement, db)) {
    case (EXECUTE_SUCCESS):
      printf("Executed.\n");
      break;
    case (EXECUTE_TABLE_FULL):
      printf("Error: Table full.\n");
      break;
    }
  }
  return 0;
}
