# Architecture

We’re going to start small by putting a lot of limitations on our database. For now, it will:

- Support two operations: inserting a row and printing all rows
- Reside only in-memory 
- Support a single, hard-coded table

Our hard-coded table will look like this.

column <-> type
id <-> integer
username <-> varchar(32)
email <-> varchar(255)

Insert statements are going to look like this.

`insert 1 cstack foo@bar.com`

Now we need to copy that data into some data structure representing the table. We'll start with something simple. Arrays. Like a B-tree, it will group rows into pages, but instead of arranging those pages as a tree it will arrange them as an array.

Here’s my plan:

Store rows in blocks of memory called pages
Each page stores as many rows as it can fit
Rows are serialized into a compact representation with each page
Pages are only allocated as needed
Keep a fixed-size array of pointers to pages

## Rows

![row structure](/row_memory_layout.png)
