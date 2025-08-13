import "./style.css";
import { canvas } from "./graphics";
import { start } from "./game";

const resize = (): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

window.addEventListener("resize", resize, false);
resize();

start();
