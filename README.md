# action-update-project

A GitHub Action for automatically setting project columns.

Currently only supports repository projects.

## Events

Supported
[events](https://docs.github.com/en/actions/reference/events-that-trigger-workflows)
are:

-   `pull_request`

## Inputs

Supported inputs are:

-   `project_url` (required): This is the URL of the project to use for cards.
    For example, `https://github.com/jonmeow/action-update-project/projects/1`.

-   `column_name` (required): This is the name of the column to put cards into.
    For example, `ToColumn`.

-   `allow_create_card` (optional): Set to `true` to allow card creation.
    Defaults to `false`, meaning cards will only ever be moved.

-   `github_token` (required): The `GITHUB_TOKEN` secret to use when
    authenticating. For example, `${{ secrets.GITHUB_TOKEN }}`.

## Example YAML

```yaml
name: Switch columns when ready for review

on:
  pull_request:
    types: [ready_for_review]

jobs:
  ready-for-review
    runs-on: ubuntu-latest
    steps:
      - name: Update project column
        uses: jonmeow/action-update-project@v1.0
        with:
          project_url: https://github.com/jonmeow/action-update-project/projects/1
          column_name: ToColumn
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
