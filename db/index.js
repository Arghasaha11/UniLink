import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { turso } from "./turso";

export const db = drizzle(turso, { schema });