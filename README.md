## Toy database in C

The entire database is stored in a single file!

## Features

- [x] Interactive REPL
- [x] `insert <id> <username> <email>` and `select` statements
- [x] Fixed-schema rows (`id`, `username` ≤ 32 chars, `email` ≤ 255 chars)
- [x] Compact row serialization / deserialization into 4 KB pages
- [x] In-memory table of up to 100 pages
- [x] Input validation: syntax errors, negative IDs, strings too long, table full
- [x] RSpec integration tests (`make test`)
- [ ] Persistence to disk
- [ ] WAL: write changes to a log before applying them, for crash recovery and durability
- [ ] MVCC: keep several versions of each row so readers never block writers
- [ ] Cloud: store the database in the cloud (e.g. object storage) and access it remotely


## Questions

- What format is data saved in? (in memory and on disk)
- When does it move from memory to disk?
- Why can there only be one primary key per table?
- How does rolling back a transaction work?
- How are indexes formatted?
- When and how does a full table scan happen?
- What format is a prepared statement saved in?
- vim mydb.db + :%!xxd