import { exec } from '@actions/exec';
import * as core from '@actions/core';
import { getExecOutput } from './github';

async function ensureRemoteExists(name: string, target: string): Promise<void> {
    try {
        await exec('git', ['remote', 'add', name, target]);
    } catch (e) {
        if ( ! e.message.match(/failed with exit code 3$/g)) {
            throw e;
        }
    }
}

async function tagExists(tag: string, directory: string): Promise<boolean> {
    try {
        let code = await exec('git', ['show-ref', '--tags', '--quiet', '--verify', '--', `refs/tags/${tag}`], { cwd: directory });

        return code === 0;
    } catch (err) {
        return false;
    }
}

async function publishSubSplit(binary: string, target: string, branch: string, name: string, directory: string): Promise<void> {
    let hash = await getExecOutput(binary, [`--prefix=${directory}`, `--origin=origin/${branch}`]);

    await exec('git', ['push', target, `${hash.trim()}:refs/heads/${branch}`, '-f']);
}

async function commitHashHasTag(hash: string, clonePath: string) {
    let output = await getExecOutput('git', ['tag', '--points-at', hash], { cwd: clonePath });

    core.info(`${hash} points-at ${output}`);

    return output !== '';
}

export { ensureRemoteExists, tagExists, publishSubSplit, commitHashHasTag }
