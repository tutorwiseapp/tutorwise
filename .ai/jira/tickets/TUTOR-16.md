# TUTOR-16: Set up Claude Code using the Pay as you go plan

**Status**: Done
**Assignee**: Michael Quan
**Priority**: Medium
**Type**: Task

**Created**: 9/19/2025
**Updated**: 9/24/2025



## Description
Subscribe to the $5 pay as you go plan and if it added values then subscribe to the Pro plan at $20pm.

Add claude code to the app by creating 2 files:

* Filename: .claude/CLAUDE.md 
* Filename: .claude/settings.json 

!image-20250919-092213.png|width=694%,alt="image-20250919-092213.png"!

!image-20250919-092242.png|width=694%,alt="image-20250919-092242.png"!

!image-20250919-092417.png|width=694%,alt="image-20250919-092417.png"!

Here are the commands to start and exit the Claude process in the Visual Studio Code terminal:

* *To start:* It appears you are using a command-line interface (CLI) for Claude. The command to start the process is claude followed by your prompt in quotes. For example:
{noformat}    claude "Your prompt here"{noformat}
* *To exit:* The output in the terminal shows "Interrupted by user". This indicates that the standard command to stop a running process in the terminal was used, which is:
*Ctrl+C*



Based on how command-line interface (CLI) tools for AI models are typically designed, here are some popular commands and patterns you would likely find for a claude tool, in addition to the basic claude "prompt" command.

While the specific commands would depend on the tool's official documentation, here are common examples:

h3. 1. Getting Help and Information

These are almost universal in any CLI tool.

* *claude --help or claude -h*
** This would be the most important command. It would display a list of all available commands, options (flags), and how to use them.
* *claude --version*
** Shows the installed version of the claude CLI tool.

h3. 2. Handling Input and Output

This is crucial for using the tool in automated scripts.

* *Piping input from another command:* This is a powerful feature of terminals.
 code Bash

* IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{noformat}    # Asks Claude to explain the content of a file
cat my_code.py | claude "Explain this python code"
  {noformat}
* *Saving output to a file:*
 code Bash

* IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{noformat}    # Runs the prompt and saves the response directly to a file
claude "Write a README for my project" > README.md
  {noformat}

h3. 3. Interactive Chat Mode

Instead of a single prompt and response, this would start a continuous conversation.

* *claude chat or claude -i (for interactive)*
 code Bash

* IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{noformat}    claude chat
> Hello, Claude.
> How do I set up a Next.js project?
> ... (you can continue the conversation)
> exit
  {noformat}

h3. 4. Configuration

To avoid entering settings every time, you would configure the tool.

* *claude config set api_key <your_key_here>*
** A command to set up your API key so you don't have to provide it every time.
* *claude config set model <model_name>*
** A command to set a default model to use, for example, claude-3-opus-20240229 or claude-3-sonnet-20240229.

h3. 5. Advanced Options and Flags

These commands would modify the behavior of the AI's response.

* *--model or -m*: To specify which Claude model to use for a single request.
 code Bash

* IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{noformat}    claude "Why is the sky blue?" --model claude-3-haiku-20240307
  {noformat}
* *--temperature or -t*: To control the creativity of the response (e.g., 0.2 for factual, 1.0 for creative).
 code Bash

* IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
{noformat}    claude "Write a short story about a robot" -t 0.9
  {noformat}
* *--multiline*: To allow you to paste multiple lines of code or text after hitting enter, and then submit it all at once.

To find the actual commands for the tool you're using, the very first thing to try in your terminal would be claude --help.

## Links
- [View in Jira](https://tutorwise.atlassian.net/browse/TUTOR-16)

---
*Auto-generated from Jira on 2025-09-26T05:45:54.824Z*
