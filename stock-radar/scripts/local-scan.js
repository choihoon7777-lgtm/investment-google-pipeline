import { scanMarket } from "../src/scan.js";

const result = await scanMarket();
console.log(JSON.stringify(result, null, 2));
