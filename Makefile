CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wshadow -g -fsanitize=address,undefined
TARGET = db
DB ?= test.db

.PHONY: build run test clean anatomy anatomy-open visual

build: $(TARGET)

SRC = $(wildcard src/*.c)
HDR = $(wildcard src/*.h)

$(TARGET): $(SRC) $(HDR)
	$(CC) $(CFLAGS) -Isrc $(SRC) -o $(TARGET)

run: build
	./$(TARGET)

test: build
	bundle exec rspec test/*.rb

visual:
	python3 tools/visual.py $(DB)

anatomy:
	git submodule update --init anatomy
	node docs/anatomy/build.mjs

anatomy-open: anatomy
	open docs/anatomy/db-anatomy.html

clean:
	rm -f $(TARGET) a.out
