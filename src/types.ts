export interface subtreeSplit {
    name: string,
    directory: string,
    target: string,
}

type subtreeSplits = subtreeSplit[];

export type configurationOptions = {
    'subtree-splits': subtreeSplits,
}
