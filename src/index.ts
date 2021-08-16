import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from '@actions/exec';
import { CreateEvent, DeleteEvent } from '@octokit/webhooks-types';
import { configurationOptions, subtreeSplit } from './types';
import { removeDir, dirExists, removeFile } from './helpers/fs';
import { ensureRemoteExists, tagExists, publishSubSplit } from './helpers/git';
import { getExecOutput } from './helpers/github';
import * as fs from 'fs';
import * as path from 'path';

const splitshPath = './splitsh'

async function downloadSplitsh() {
    let splitshDir = path.dirname(splitshPath);
    let downloadDir = '/tmp/splitsh/';

    dirExists(splitshDir);
    removeFile(splitshPath);
    removeDir(downloadDir);

    fs.mkdirSync(downloadDir);

    let downloadPath = `${downloadDir}split-lite.tar.gz`;
    let platform = process.platform === 'darwin' ? 'lite_darwin_amd64' : 'lite_linux_amd64';

    console.log(`Downloading splitsh for "${platform}"`);

    let url = `https://github.com/splitsh/lite/releases/download/v1.0.1/${platform}.tar.gz`;

    await exec(`wget -O ${downloadPath} ${url}`);
    await exec(`tar -zxpf ${downloadPath} --directory ${downloadDir}`);
    await exec(`chmod +x ${downloadDir}splitsh-lite`);
    await exec(`mv ${downloadDir}splitsh-lite ${splitshPath}`);

    removeDir(downloadDir);
}

(async () => {
    const context = github.context;
    const configPath = core.getInput('config-path');
    const branch = core.getInput('source-branch');

    console.log(configPath, branch);

    if (!fs.existsSync(splitshPath)) {
        await downloadSplitsh();
    }

    let configOptions = JSON.parse(fs.readFileSync(configPath).toString()) as configurationOptions;
    let subtreeSplits = configOptions['subtree-splits'];

    console.table(subtreeSplits);

    if (context.eventName === 'push') {
        // On push sync commits
        await Promise.all(subtreeSplits.map(async (split: subtreeSplit) => {
            await ensureRemoteExists(split.name, split.target);
            await publishSubSplit(splitshPath, 'origin', split.name, branch, split.name, split.directory);
        }));
    } else if (context.eventName === 'create') {
        // Tag created
        let event = context.payload as CreateEvent;
        let tag = event.ref;

        if (event.ref_type !== 'tag') {
            return;
        }

        await Promise.all(subtreeSplits.map(async (split: subtreeSplit) => {
            let hash = await getExecOutput(splitshPath, [`--prefix=${split.directory}`, `--origin=tags/${tag}`]);
            let clonePath = `./.repositories/${split.name}/`;

            fs.mkdirSync(clonePath, { recursive: true});

            await exec('git', ['clone', split.target, '.'], { cwd: clonePath});

            // TODO: smart tag skipping (skip patch releases where commit was previously tagged) minor and major releases should always get a tag
            await exec('git', ['tag', '-a', tag, hash, '-m', `"Tag ${tag}"`], { cwd: clonePath });
            await exec('git', ['push', '--tags'], { cwd: clonePath });
        }));
    } else if (context.eventName === 'delete') {
        // Tag removed
        let event = context.payload as DeleteEvent;
        let tag = event.ref;

        if (event.ref_type !== 'tag') {
            return;
        }

        await Promise.all(subtreeSplits.map(async (split: subtreeSplit) => {
            let clonePath = `./.repositories/${split.name}/`;
            fs.mkdirSync(clonePath, { recursive: true});

            await exec('git', ['clone', split.target, '.'], { cwd: clonePath});

            if (await tagExists(tag, clonePath)) {
                await exec('git', ['push', '--delete', tag], { cwd: clonePath});
            }
        }));
    }
})().catch(error => {
    core.setFailed(error);
});
