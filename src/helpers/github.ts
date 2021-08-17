import {exec, ExecOptions} from '@actions/exec';

async function getExecOutput(command: string, args: string[], options?: ExecOptions): Promise<string> {
    let output = '';
    options = options || {};
    await exec(command, args, {
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            }
        },
        ...options
    });

    return output.trim();
}

export { getExecOutput }
