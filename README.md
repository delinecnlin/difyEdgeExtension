# Edge Dify Workflow Extension Usage Guide

## Features
This extension lets you send the current web page information (title, URL, content, selected text, etc.) to a Dify server workflow with a single click for automated processing. It’s ideal for web content collection, automatic summarization, intelligent analysis, and similar use cases.

## Quick Start

1. **Install the Extension**  
   In Edge or Chrome, go to the Extensions page, enable **Developer mode**, and click **Load unpacked**. Select this extension’s folder.

2. **Configure Dify Workflows**  
   - Click the extension icon and select **Configure...**  
   - Add a new workflow and fill in:  
     - **Name** (customizable)  
     - **Server URL** (e.g., `https://your-dify-server.com`, no trailing slash)  
     - **API Key** (obtain from the Dify dashboard; needs permission to call workflows)  
   - **Note**: You must select a Dify **Workflow** (not a Chat Flow).

3. **Set the Input Parameter**  
   - Enter the workflow’s input parameter name (e.g., `webinfo`), matching the parameter in your Dify workflow node.  
   - Check which page information to collect (Title, URL, Selected Text, Content).

4. **Dify Workflow Requirements**  
   - The workflow must have one input parameter (e.g., `webinfo`) of type **string**.  
   - The entry node of the workflow must be of type **Workflow**, not **Chat Flow**.  
   - In the Dify dashboard, create or edit a workflow, add nodes as needed, and set the input parameter name to match this extension’s settings.

## Usage

1. Open any web page and click the extension icon.  
2. Choose the workflow you configured and click **Send Current Page to Dify**.  
3. The extension sends the page information in this format:

   ```
   Title: <page title>
   URL: <page URL>
   Selected Text: <user selected text>
   Content: <first 2000 characters of page content>
   ```

4. After processing, view the results in the Dify dashboard.

## FAQs

- **Q: Why does it say “Current page not supported for data collection”?**  
  A: The website’s security policies or technical limitations prevent script injection, so the extension can’t collect data.

- **Q: Why am I getting 401/403/404/500 errors from Dify?**  
  A: Verify your API Key, server URL, workflow configuration, and input parameter name.

- **Q: Why didn’t my workflow receive any data?**  
  A: Ensure your Dify workflow’s entry node is a **Workflow** type and the input parameter name matches what you set in this extension.

## Technical Details

The extension sends a POST request to the Dify API endpoint `/v1/workflows/run` with this JSON body:

```json
{
  "inputs": {
    "webinfo": "Title: ...\nURL: ...\nSelected Text: ...\nContent: ..."
  }
}
```

Inside your Dify workflow, you can reference the page content via `${inputs.webinfo}`.

## Recommendations

- Create separate workflows for different data-collection scenarios to keep them organized.  
- If you need additional fields, update the collection options and input parameter name on the **Options** page.

For more questions or feedback, please open an issue or contact the extension author.
