
describe 'database' do
  def run_script(commands)
    raw_output = nil
    IO.popen("./sqlite", "r+") do |pipe|
      commands.each { |command| pipe.puts command }
      pipe.close_write
      raw_output = pipe.gets(nil)
    end
    raw_output.split("\n")
  end

  it 'insert and retrieves a row' do
    result = run_script([
      "insert 1 user1 user@email.com",
      "select",
      ".exit",
    ])

    expect(result).to eq([
      "sqlite > Executed.",
      "sqlite > (1, user1, user@email.com)",
      "sqlite > Executed.",
      "sqlite >",
    ])
  end

  it 'prints error message when table is full' do
    script = (1..1401).map do |i|
      "insert #{i} user#{i} user#{i}@email.com"
    end
    script << ".exit"

    result = run_script(script)

    expect(result).to include('sqlite > Error: table full.')
  end
end
