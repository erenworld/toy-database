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
