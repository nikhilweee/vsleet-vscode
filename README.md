# vsleet

VS Code extension for solving LeetCode problems directly from the editor.

https://marketplace.visualstudio.com/items?itemName=nikhilweee.vsleet

- **⚠️** This extension is under active development.
- **⚠️** Backward compatibility is not guaranteed.
- **⚠️** This extension only supports `python3` for now.

## Features

- Search and load problems directly from VS Code.
- Load problem as a python file or jupyter notebook.
- Test solution locally in your favourite editor.
- Start with boilerplate complete with default tests.
- Run and submit to leetcode directly from VS Code.
- See stats including memory and runtime percentile.

## Walkthrough

![vsleet Walkthrough](https://i.imgur.com/jjc4z6h.gif)

In case the video doesn't load, here is the
[direct link](https://i.imgur.com/jjc4z6h.gif).

## Commands

- `vsleet: New Problem`: Load a problem from LeetCode
- `vsleet: New Notebook`: Load problem as Jupyter notebook
- `vsleet: Paste Cookie`: Paste cookie to authenticate
- `vsleet: Update Template`: Update solution template
- `vsleet: Local Solution`: Run Code Locally
- `vsleet: Run Solution`: Run solution on LeetCode
- `vsleet: Submit Solution`: Submit solution to LeetCode
- `vsleet: Open Description`: Open problem description

## Keyboard Shortcuts

- <kbd>shift</kbd>+<kbd>enter</kbd>: `vsleet: Local Solution`
- <kbd>ctrl/cmd</kbd>+<kbd>enter</kbd>: `vsleet: Run Solution`
- <kbd>ctrl/cmd</kbd>+<kbd>shift</kbd>+<kbd>enter</kbd>:
  `vsleet: Submit Solution`

Tip: If the <kbd>shift</kbd>+<kbd>enter</kbd> shortcut opens a Python REPL
instead, go to settings and set `python.REPL.sendToNativeREPL` to False.

## Requirements

The `vsleet: Local Solution` command internally triggers
`python.execInTerminal`, which relies on the official VS Code Python extension.
The other commands do not require any dependencies.

## Authentication

Although you can use the `vsleet: New Problem` and `vsleet: Local Solution`
commands freely without authentication, you need to be authenticated to
leetcode.com to run `vsleet: Run Solution` and `vsleet: Submit Solution`.

1. Login to leetcode.com from any browser.
2. Copy all cookies for leetcode.com.
3. Run the `vsleet: Paste Cookie` command.
4. Paste the cookies copied from the browser.

If you are using chromium based browsers such as Google Chrome or Microsoft
Edge, you can use our extension to copy cookies:
https://chromewebstore.google.com/detail/vsleet/ihgifhobfmjhcelknpbjhpabkcghjmfh?hl=en

If you are an advanced user, feel free to copy cookies using browser devtools.

The `vsleet: Paste Cookie` command expectes a cookie string in the format:

```
csrftoken=ABCDEF1234567890;LEETCODE_SESSION=ABCDEF1234567890;
```

Specifically, the `csrftoken` and `LEETCODE_SESSION` cookies are required.

## Known Limitations

- The extension only supports `python3` for now.
