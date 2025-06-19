import Fastify from "fastify";
import cors from "@fastify/cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT) || 5432;
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "postgres";

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,

  connectionTimeoutMillis: 10000,
});


pool.on("connect", (client) => {
  console.log("Client connected to database");
});

pool.on("remove", (client) => {
  console.log("Client removed from database pool");
});

const buildServer = async () => {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors);

  fastify.get("/tasks", async (request, reply) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          "SELECT id, task FROM test_table ORDER BY id ASC"
        );
        return { success: true, tasks: result.rows };
      } finally {
        client.release();
      }
    } catch (err) {
      fastify.log.error(err);
      reply
        .code(500)
        .send({
          success: false,
          message: "Failed to fetch tasks",
          error: err instanceof Error ? err.message : String(err),
        });
    }
  });

  fastify.post("/tasks", async (request, reply) => {
    const { task } = request.body as { task?: string };

    if (!task) {
      reply.code(400).send({ success: false, message: "Task is required" });
      return;
    }

    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          "INSERT INTO test_table(task) VALUES($1) RETURNING id, task",
          [task]
        );
        return {
          success: true,
          message: "Task added successfully",
          task: result.rows[0],
        };
      } finally {
        client.release();
      }
    } catch (err) {
      fastify.log.error(err);
      reply
        .code(500)
        .send({
          success: false,
          message: "Failed to add task",
          error: err instanceof Error ? err.message : String(err),
        });
    }
  });

  fastify.get("/", async (req, reply) => {
    return { message: "Hello, world!" };
  });

  return fastify;
};

const start = async () => {
  const fastify = await buildServer();
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
      if (err) {
        console.error("Server startup error:", err);
        process.exit(1);
      }
      console.log(`Server is running on ${address}`);
    });
  } catch (err) {
    console.error("Server general error:", err);
    process.exit(1);
  }
};

start();
