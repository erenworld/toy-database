CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wshadow -g -fsanitize=address,undefined
TARGET = db

.PHONY: build run test clean

build: $(TARGET)

$(TARGET): main.c
	$(CC) $(CFLAGS) main.c -o $(TARGET)

run: build
	./$(TARGET)

test: build
	bundle exec rspec test/*.rb

clean:
	rm -f $(TARGET) a.out
