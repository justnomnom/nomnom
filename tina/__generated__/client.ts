import path from "node:path";
import { createClient } from "tinacms/dist/client";
import { queries } from "./types";

const graphqlUrl =
  process.env.NEXT_PUBLIC_TINA_GRAPHQL_URL ||
  process.env.TINA_GRAPHQL_URL ||
  "http://127.0.0.1:4001/graphql";

const token = process.env.TINA_TOKEN ?? "";
const cacheDir = path.join(process.cwd(), "tina", "__generated__", ".cache");

export const client = createClient({
  url: graphqlUrl,
  token,
  cacheDir,
  queries,
});
export default client;
  