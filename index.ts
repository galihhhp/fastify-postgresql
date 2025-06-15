import Fastify from "fastify";
import cors from "@fastify/cors";

const buildServer = async () => {
  const fastify = Fastify();
  await fastify.register(cors);
  fastify.get("/", async (req, reply) => {
    return { message: "Hello, world!" };
  });
  return fastify;
};

const start = async () => {
  const fastify = await buildServer();
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    process.exit(1);
  }
};

start();
