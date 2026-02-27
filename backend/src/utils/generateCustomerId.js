import { v4 as uuidv4 } from "uuid";

export const generateCustomerId = () => {
  const unique = uuidv4().split("-")[0].toUpperCase();
  return `BG-${unique}`;
};