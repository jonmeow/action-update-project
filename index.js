const core = require('@actions/core');
const github = require('@actions/github');

// Returns the PR's card in the given project. Returns null if there's no card.
async function getPrCard(octokit, org, repo, prNum, projectUrl) {
  const result = await octokit.graphql(
    `query ($org:String!, $repo:String!, $prNum:Int!) {
        repository(owner: $org, name: $repo) {
          pullRequest(number: $prNum) {
            projectCards(first: 50) {
              nodes {
                column { name }
                databaseId
                project { url }
              }
            }
          }
        }
      }`,
    { org: org, repo: repo, prNum: prNum }
  );
  const cards = result.repository.pullRequest.projectCards.nodes;
  for (var i = 0; i < cards.length; ++i) {
    const card = cards[i];
    if (card.project.url == projectUrl) {
      return card;
    }
  }
  return null;
}

// Returns the ID of the column. Errors if not found.
async function getColumnId(octokit, projectUrl, columnName) {
  const repoProject = /https:\/\/github.com\/([^\/]+)\/([^\/]+)\/projects\/(\d+)/.exec(
    projectUrl
  );
  if (!repoProject) {
    throw new Error(`Unsupported project_url: ${projectUrl}`);
  }
  const org = repoProject[1];
  const repo = repoProject[2];
  const projectNum = parseInt(repoProject[3]);

  const result = await octokit.graphql(
    `query ($org:String!, $repo:String!, $projectNum:Int!) {
        repository(owner: $org, name: $repo) {
          project(number: $projectNum) {
            columns(first: 50) {
              nodes {
                name
                databaseId
              }
            }
            databaseId
          }
        }
      }`,
    { org: org, repo: repo, projectNum: projectNum }
  );
  const columns = result.repository.project.columns.nodes;
  for (var i = 0; i < columns.length; ++i) {
    const col = columns[i];
    if (col.name == columnName) {
      return col.databaseId;
    }
  }
  throw new Error(
    `column_name ${columnName} not found in project ${projectUrl}`
  );
}

// Moves the card to the target column.
async function moveCard(octokit, cardId, columnId) {
  console.log(`Moving card ${cardId} to column ${columnId}.`);
  await octokit.projects.moveCard({
    card_id: cardId,
    position: 'top',
    column_id: columnId,
  });
}

// Creates a card for the PR in the target column.
async function createCard(octokit, prId, columnId) {
  console.log(`Creating card for ${prId} in column ${columnId}.`);
  await octokit.projects.createCard({
    content_id: prId,
    content_type: 'pull_request',
    column_id: columnId,
  });
}

// Core execution.
async function run() {
  try {
    // Load action configuration.
    const projectUrl = core.getInput('project_url');
    const columnName = core.getInput('column_name');
    const githubToken = core.getInput('github_token');
    const allowCreateCardStr = core.getInput('allow_create_card');
    if (allowCreateCardStr != 'true' && allowCreateCardStr != 'false') {
      throw new Error(
        `allow_create_card is ${allowCreateCardStr}, must be true or false.`
      );
    }
    const allowCreateCard = allowCreateCardStr == 'true';

    // Load event payload.
    const payload = github.context.payload;
    var pr = null;
    if (payload.pull_request) {
      pr = payload.pull_request;
    } else {
      throw new Error(`Can't handle ${github.context.eventName}`);
    }
    const org = payload.repository.owner.login;
    const repo = payload.repository.name;

    // Prepare to call GitHub.
    const octokit = github.getOctokit(githubToken);

    // Fetch the PR's card.
    var card = await getPrCard(octokit, org, repo, pr.number, projectUrl);
    if (card) {
      console.log(`Found card ${card.databaseId}.`);
      if (card.column.name == columnName) {
        console.log(`Already in column ${columnName}!`);
        return;
      }
    }

    // Fetch the column ID to move to.
    var columnId = await getColumnId(octokit, projectUrl, columnName);
    console.log(`Found column ${columnId}.`);

    // Do the actual move.
    if (card) {
      await moveCard(octokit, card.databaseId, columnId);
    } else if (allowCreateCard) {
      console.log('No card found, allow_create_card is false.');
    } else {
      await createCard(octokit, pr.number, columnId);
    }
    console.log('Done!');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
