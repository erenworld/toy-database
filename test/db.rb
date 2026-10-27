describe 'database' do
    before do
        File.delete("test.db") if File.exist?("test.db")
    end

    def run_script(commands)
        raw_output = nil
        IO.popen("./db test.db", "r+") do |pipe|
            commands.each do |command|
                pipe.puts command
            end

            pipe.close_write

            # Read entire outpu
            raw_output = pipe.gets(nil)
        end
        raw_output.split("\n")
    end

    it 'insert and retrieve a row' do
        result = run_script([
            "insert 1 user1 person1@example.com",
            "select",
            ".exit",
        ])
        expect(result).to match_array([
            "sqlite > Executed.",
            "sqlite > (1, user1, person1@example.com)",
            "Executed.",
            "sqlite > ",
        ])
    end

    it 'prints error message when table is full' do
        script = (1..1401).map do |i|
            "insert #{i} user#{i} person#{i}@example.com"
        end
        script << ".exit"
        result = run_script(script)
        expect(result[-2]).to eq('sqlite > Error: Table full.')
    end

    it 'allows inserting strings that are the maximum length' do
        long_username = "a"*32
        long_email = "a"*255
        script = [
            "insert 1 #{long_username} #{long_email}",
            "select",
            ".exit",
        ]
        result = run_script(script)
        expect(result).to match_array([
            "sqlite > Executed.",
            "sqlite > (1, #{long_username}, #{long_email})",
            "Executed.",
            "sqlite > ",
        ])
    end

    it 'prints error message if strings are too long' do
        long_username = "a"*33
        long_email = "a"*256
        script = [
            "insert 1 #{long_username} #{long_email}",
            "select",
            ".exit",
        ]
        result = run_script(script)
        expect(result).to match_array([
            "sqlite > String is too long.",
            "sqlite > Executed.",
            "sqlite > ",
        ])
    end

    it 'prints an error message if id is negative' do 
        script = [
            "insert -1 erenturkoglu eren@turkoglu.com",
            "select",
            ".exit",
        ]
        result = run_script(script)
        expect(result).to match_array([
            "sqlite > ID must be positive.",
            "sqlite > Executed.",
            "sqlite > ",
        ])
    end

    it 'keeps the right row count across full pages' do
        script = (1..196).map do |i|
            "insert #{i} user#{i} person#{i}@example.com"
        end
        script << ".exit"
        run_script(script)
        result = run_script([
            "select",
            ".exit",
        ])
        # 196 rows + "Executed." + final prompt
        expect(result.size).to eq(198)
        expect(result[-3]).to eq("(196, user196, person196@example.com)")
    end

    it 'rejects a non-numeric id' do
        result = run_script([
            "insert abc user1 person1@example.com",
            ".exit",
        ])
        expect(result).to match_array([
            "sqlite > Syntax error. Could not parse statement.",
            "sqlite > ",
        ])
    end

    it 'rejects keywords that only start with insert' do
        result = run_script([
            "insertfoo 1 user1 person1@example.com",
            ".exit",
        ])
        expect(result).to match_array([
            "sqlite > Unrecognized keyword at start of 'insertfoo 1 user1 person1@example.com'.",
            "sqlite > ",
        ])
    end

    it 'keeps data after end of input (Ctrl-D)' do
        run_script([
            "insert 1 user1 person1@example.com",
        ])
        result = run_script([
            "select",
            ".exit",
        ])
        expect(result).to match_array([
            "sqlite > (1, user1, person1@example.com)",
            "Executed.",
            "sqlite > ",
        ])
    end

    it 'keeps data after closing connection' do 
        result1 = run_script([
            "insert 1 user1 person1@example.com",
            ".exit",
        ])
        expect(result1).to match_array([
            "sqlite > Executed.",
            "sqlite > ",
        ])
        result2 = run_script([
            "select",
            ".exit"
        ])
        expect(result2).to match_array([
            "sqlite > (1, user1, person1@example.com)",
            "Executed.",
            "sqlite > ",
        ])
    end
end
