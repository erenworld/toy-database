describe 'database' do
    def run_script(commands)
        raw_output = nil
        IO.popen("./db", "r+") do |pipe|
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
end
