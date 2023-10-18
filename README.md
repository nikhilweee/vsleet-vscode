# vsleet

VS Code extension for solving LeetCode problems directly from the editor.

- **⚠️** This extension is under active development.
- **⚠️** This extension only supports `python3` for now.

## Walkthrough

![VS Leet Walkthrough](https://i.imgur.com/r4ErS0z.gif)

## Features

- Search and load problems directly from VS Code.
- Test solution locally in your favourite editor.
- Start with boilerplate complete with default tests.
- Run and submit to leetcode directly from VS Code.
- See stats including memory and runtime percentile.

## Commands

- `VS Leet: Load Problem`: Load a problem from LeetCode
- `VS Leet: Local Solution`: Run Code Locally
- `VS Leet: Run Solution`: Run solution on LeetCode
- `VS Leet: Submit Solution`: Submit solution to LeetCode
- `VS Leet: Paste Cookie`: Paste cookie to authenticate

## Keyboard Shortcuts

- <kbd>shift</kbd>+<kbd>enter</kbd>: `VS Leet: Local Solution`
- <kbd>cmd</kbd>+<kbd>enter</kbd>: `VS Leet: Run Solution`
- <kbd>cmd</kbd>+<kbd>shift</kbd>+<kbd>enter</kbd>: `VS Leet: Submit Solution`

## Requirements

The `VS Leet: Local Solution` command internally triggers
`python.execInTerminal`, which relies on the official VS Code Python extension.
The other commands do not require any dependencies.

## Logging in to LeetCode

1. Login to leetcode.com from any browser.
2. Copy all cookies for leetcode.com.
3. Run the `VS Leet: Paste Cookie` command.
4. Paste the cookies copied from the browser.

The cookie string should be in the format:

```
csrftoken=ABCDEF1234567890;LEETCODE_SESSION=ABCDEF1234567890;
```

Specifically, the `csrftoken` and `LEETCODE_SOLUTION` cookies are required.

## Known Limitations

- The extension only supports `python3` for now.
- The `VS Leet: Run Solution` command only works with the default test cases. It
  is not possible to add custom test cases as of now.
