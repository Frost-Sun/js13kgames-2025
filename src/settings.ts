export enum Difficulty {
    Easy = "Easy",
    Normal = "Normal",
}

let currentDifficulty: Difficulty = Difficulty.Normal;

export const setDifficulty = (d: Difficulty): void => {
    currentDifficulty = d;
    console.log("Difficulty set to:", d);
};

export const getDifficulty = (): Difficulty => currentDifficulty;
