CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wshadow -g -fsanitize=address,undefined
TARGET = db

.PHONY: build run test clean anatomy anatomy-open

build: $(TARGET)

$(TARGET): main.c
	$(CC) $(CFLAGS) main.c -o $(TARGET)

run: build
	./$(TARGET)

test: build
	bundle exec rspec test/*.rb

anatomy:
	git submodule update --init anatomy
	node docs/anatomy/build.mjs

anatomy-open: anatomy
	open docs/anatomy/db-anatomy.html

clean:
	rm -f $(TARGET) a.out
