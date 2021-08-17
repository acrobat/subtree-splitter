# subtree-splitter action

This actions synchronizes a monolithic repository to standalone repositories by using [splitsh-lite](https://github.com/splitsh/lite).

## Usage

### Inputs

> Specify using `with` keyword

* `config-path` - **(Required)** Location of the subtree split mapping configuration
* `source-branch` - Source branch to execute the subtree split from

### Example workflow

#### Configuration

Create a configuration file with the mapping of the different subtree splits. Each subtree split item contains a name (must be unique), 
directory in the current repository and a target git repository.

```json
{
    "subtree-splits": [
        {
            "name": "core",
            "directory": "src/Core",
            "target": "git@github.com:example/core-package.git"
        }
    ]
}

```

#### Workflow

Example workflow to sync commits and tags.

```yaml
on:
    on:
    push:
        # Only trigger for specific branches or changes in specific paths.
        branches:
            - '*'
        paths:
            - src/**
        # Tag push events should be ignored, they will be handled with the create event below.
        tags-ignore:
            - '*'
    create:
        tags:
            - '*'
    delete:
        tags:
            - '*'

jobs:
    sync_commits:
        runs-on: ubuntu-latest
        name: Sync commits
        steps:
            -   uses: actions/checkout@v2
                with:
                    persist-credentials: false
                    fetch-depth: 0

            # Add a personal access token to the repository secrets. This will allow the splitter action to push the new commits
            -   uses: frankdejonge/use-github-token@1.0.1
                with:
                    authentication: 'username:${{ secrets.PERSONAL_GITHUB_TOKEN }}'
                    user_name: 'Committer name'
                    user_email: 'Committer email'

            # Cache the splitsh executable to speedup future runs
            -   name: Cache splitsh-lite
                uses: actions/cache@v2
                with:
                    path: './splitsh'
                    key: '${{ runner.os }}-splitsh-v101'

            # Retrieve the branch name of the branch that triggered the build.
            -   name: Extract branch name
                id: vars
                run: echo ::set-output name=branch_name::${GITHUB_REF#refs/*/}

            # Sync commits and tags for the configured subtree splits
            -   name: subtree split
                uses: acrobat/subtree-splitter@v1
                with:
                    config-path: .github/subtree-splitter-config.json # Reference the location where you saved your config file
                    source-branch: ${{ steps.vars.outputs.branch_name }} # The branch name is used when syncing commits, this is ignored when a tag is pushed/deleted
```
