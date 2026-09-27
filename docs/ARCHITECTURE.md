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
