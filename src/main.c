// Eren Türkoglu
// 2026
// Sqlite from scratch

// A small wrapper around the state we need to store to interact with getline().
typedef struct
{
  char *buffer; 
  size_t buffer_length;
  ssize_t input_length;
} InputBuffer;

InputBuffer *new_input_buffer(void)
{
  InputBuffer *input = (InputBuffer *)malloc(sizeof(InputBuffer));

  input->buffer = NULL;
  input->buffer_length = 0; 
  input->input_length = 0;

  return input_buffer;
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

int main(int argc, char *argv[])
{
  InputBuffer *input = new_input_buffer();

  while (true) {
    print_prompt();
    read_input(input);

    if (strcmp(input->buffer, ".exit") == 0) {
      close_input_buffer(input);
      exit(EXIT_SUCCESS);
    } else {
      printf("Unrecognized command '%s' .\n", input->buffer);
    }
  }
  return 0;
}
