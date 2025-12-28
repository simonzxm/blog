---
date: 2025-12-28
categories: [Studying]
slug: fix-semicolon-parsing-logic-within-comments-in-sicps-sqlite-shell-py
---

# Fix semicolon parsing logic within comments in SICP's `sqlite_shell.py`

SICP 的 `sqlite_shell.py` 非常神奇的无法处理 `/* */` 中的 `;`，会产生报错：

```bash
sqlite> /*;*/;
near "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax errornear "*": syntax error
```

<!-- more -->

阅读 `sqlite_shell.py` 会发现，`sql_commands` 不认为 `/*` 是一个 `delimeter`，因此出现问题：

??? plain "sqlite_shell.py"
    ```python linenums="96"
    def sql_commands(read_line):
        delims = ['"', "'", ';', '--']
        counter = 0
        in_string = None
        j = i = 0
        prev_line = None
        line = None
        concat = []
        while True:
            if line is None:
                while True:  # process preprocessor directives
                    counter += 1
                    not_in_the_middle_of_any_input = not in_string and i == j and all(map(lambda chunk_: len(chunk_) == 0, concat))
                    line = read_line(counter - 1, not_in_the_middle_of_any_input, prev_line)
                    empty_string = line[:0] if line is not None else line
                    prev_line = line
                    if not line:
                        break
                    if not_in_the_middle_of_any_input and line.startswith("."):
                        yield line
                        line = None
                    else:
                        break
                if not line:
                    break
                j = i = 0
            if j < len(line):
                (j, delim) = min(map(lambda pair: pair if pair[0] >= 0 else (len(line), pair[1]), map(lambda d: (line.find(d, j), d), in_string or delims if in_string != '--' else "\n")))
                if i < j: concat.append(line[i:j]); i = j
                if not in_string:
                    if j < len(line):
                        j += len(delim)
                        if delim == ';':
                            i = j
                            concat.append(line[j : j + len(delim)])    # ensure delimeter is the same type as the string (it may not be due to implicit conversion)
                            # Eat up any further spaces until a newline
                            while j < len(line):
                                delim = line[j:j+1]
                                if not delim.isspace(): break
                                j += 1
                                if delim == "\n": break
                            if i < j: concat.append(line[i:j]); i = j
                            yield empty_string.join(concat)
                            del concat[:]
                        else:
                            in_string = delim
                else:
                    if j < len(line):
                        ch = line[j:j+1]
                        assert ch == in_string or in_string == '--'
                        j += 1
                        i = j
                        concat.append(ch)
                        in_string = None
            else:
                if i < j: concat.append(line[i:j]); i = j
                line = None
    ```

稍微改一下就能修复，主要是把 `/*` 加到 `delimeters` 里，然后修改后续逻辑。

???+ plain "sqlite_shell.py"
	```python linenums="96" hl_lines="2 28-36 57-59"
	def sql_commands(read_line):
		delims = ['"', "'", ';', '--', '/*']
		counter = 0
		in_string = None
		j = i = 0
		prev_line = None
		line = None
		concat = []
		while True:
			if line is None:
				while True:  # process preprocessor directives
					counter += 1
					not_in_the_middle_of_any_input = not in_string and i == j and all(map(lambda chunk_: len(chunk_) == 0, concat))
					line = read_line(counter - 1, not_in_the_middle_of_any_input, prev_line)
					empty_string = line[:0] if line is not None else line
					prev_line = line
					if not line:
						break
					if not_in_the_middle_of_any_input and line.startswith("."):
						yield line
						line = None
					else:
						break
				if not line:
					break
				j = i = 0
			if j < len(line):
				if in_string is None:
					targets = delims
				elif in_string == '--':
					targets = ["\n"]
				elif in_string == '/*':
					targets = ["*/"]
				else:
					targets = [in_string]
				(j, delim) = min(map(lambda pair: pair if pair[0] >= 0 else (len(line), pair[1]), map(lambda d: (line.find(d, j), d), targets)))
				if i < j: concat.append(line[i:j]); i = j
				if not in_string:
					if j < len(line):
						j += len(delim)
						if delim == ';':
							i = j
							concat.append(line[j : j + len(delim)])    # ensure delimeter is the same type as the string (it may not be due to implicit conversion)
							# Eat up any further spaces until a newline
							while j < len(line):
								delim = line[j:j+1]
								if not delim.isspace(): break
								j += 1
								if delim == "\n": break
							if i < j: concat.append(line[i:j]); i = j
							yield empty_string.join(concat)
							del concat[:]
						else:
							in_string = delim
				else:
					if j < len(line):
						j += len(delim)
						i = j
						concat.append(line[j-len(delim):j])
						in_string = None
			else:
				if i < j: concat.append(line[i:j]); i = j
				line = None
	```

当然，我也不知道我改对了没有。。仅供参考。
