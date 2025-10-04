export enum Difficulty {
    Easy = "Easy",
    Hard = "Hard",
}

let currentDifficulty: Difficulty = Difficulty.Hard;

export const setDifficulty = (d: Difficulty): void => {
    currentDifficulty = d;
};

export const getDifficulty = (): Difficulty => currentDifficulty;
