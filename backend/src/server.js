const app = require("./app");
const { env } = require("./config/env");

app.listen(env.port, () => {
  console.log(`API escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});
