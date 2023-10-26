# vsleet

VS Code extension for solving LeetCode problems directly from the editor.

https://marketplace.visualstudio.com/items?itemName=nikhilweee.vsleet

- **⚠️** This extension is under active development.
- **⚠️** This extension only supports `python3` for now.

## Features

- Search and load problems directly from VS Code.
- Test solution locally in your favourite editor.
- Start with boilerplate complete with default tests.
- Run and submit to leetcode directly from VS Code.
- See stats including memory and runtime percentile.

## Walkthrough

![vsleet Walkthrough](https://i.imgur.com/r4ErS0z.gif)

## Commands

- `vsleet: Load Problem`: Load a problem from LeetCode
- `vsleet: Local Solution`: Run Code Locally
- `vsleet: Run Solution`: Run solution on LeetCode
- `vsleet: Submit Solution`: Submit solution to LeetCode
- `vsleet: Paste Cookie`: Paste cookie to authenticate
- `vsleet: Update Template`: Update solution template

## Keyboard Shortcuts

- <kbd>shift</kbd>+<kbd>enter</kbd>: `vsleet: Local Solution`
- <kbd>cmd</kbd>+<kbd>enter</kbd>: `vsleet: Run Solution`
- <kbd>cmd</kbd>+<kbd>shift</kbd>+<kbd>enter</kbd>: `vsleet: Submit Solution`

## Requirements

The `vsleet: Local Solution` command internally triggers
`python.execInTerminal`, which relies on the official VS Code Python extension.
The other commands do not require any dependencies.

## Authentication

Although you can use the `vsleet: Load Problem` and `vsleet: Local Solution`
commands freely without authentication, you need to be authenticated to
leetcode.com to run `vsleet: Run Solution` and `vsleet: Submit Solution`.

1. Login to leetcode.com from any browser.
2. Copy all cookies for leetcode.com.
3. Run the `vsleet: Paste Cookie` command.
4. Paste the cookies copied from the browser.

If you are using Google Chrome, you can use our extension to copy cookies:
https://chromewebstore.google.com/detail/vsleet/ihgifhobfmjhcelknpbjhpabkcghjmfh?hl=en

If you are an advanced user, feel free to copy cookies using browser dev tools.

The `vsleet: Paste Cookie` command expectes a cookie string in the format:

```
csrftoken=ABCDEF1234567890;LEETCODE_SESSION=ABCDEF1234567890;
```

Specifically, the `csrftoken` and `LEETCODE_SESSION` cookies are required.

## Known Limitations

- The extension only supports `python3` for now.
