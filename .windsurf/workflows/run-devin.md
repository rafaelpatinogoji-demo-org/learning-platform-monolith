---
description: Launch devin instances
auto_execution_mode: 3
---

In this workflow you are supposed to summon using the terminal, new devin sessions for the markdown files promts we created already

Use the terminal to run one task at the time until we finish all of the ones we have saved on the folder.

To create new devin sessions using the md files that we have created

and spin up devin tasks for each one of them

curl -X POST "https://api.devin.ai/v1/sessions" \
     -H "Authorization: Bearer $DEVIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "prompt": "Your task description here"
}'

EXCECUTE THE CURL REQUESTS ON THE TERMINAL adding the value of the md file as the prompt
