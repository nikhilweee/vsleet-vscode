# vsleet

VS Code extension for solving LeetCode problems right from the editor

## Commands

- `VS Leet: Load Problem`: Load a problem from LeetCode
- `VS Leet: Local Solution`: Run Code Locally
- `VS Leet: Run Solution`: Run solution on LeetCode
- `VS Leet: Submit Solution`: Submit solution to LeetCode
- `VS Leet: Paste Cookie`: Paste cookie to authenticate

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

## Limitations

- The `VS Leet: Run Solution` command only works with the default test cases.
  They cannot be changed as of now.
