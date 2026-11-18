import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { isIPv4 } from "node:net";

const { TURN_SHARED_SECRET, TURN_PUBLIC_IP, ICE_POLICY = "all" } = process.env;
if (!TURN_SHARED_SECRET || !isIPv4(TURN_PUBLIC_IP) || !["all", "relay"].includes(ICE_POLICY)) {
  throw new Error("Invalid TURN settings");
}

createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url !== "/api/webrtc/ice") return res.writeHead(404).end();
  if (req.method !== "GET") return res.writeHead(405, { Allow: "GET" }).end();
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return res.writeHead(401).end();

  try {
    const response = await fetch("http://backend:8080/api/me/profile", {
      headers: { authorization },
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    if (response.status === 401 || response.status === 403) {
      return res.writeHead(response.status).end();
    }
    if (!response.ok) return res.writeHead(503).end();
    const { id, roles } = await response.json();
    if (typeof id !== "string" || !Array.isArray(roles) ||
        !roles.some(role => role === "DOCTOR" || role === "PATIENT")) {
      return res.writeHead(403).end();
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const username = `${expiresAt}:${id}`;
    const credential = createHmac("sha1", TURN_SHARED_SECRET).update(username).digest("base64");
    const address = `${TURN_PUBLIC_IP}:3478`;
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({
      iceTransportPolicy: ICE_POLICY,
      iceServers: [
        { urls: `stun:${address}` },
        { urls: [`turn:${address}?transport=udp`, `turn:${address}?transport=tcp`], username, credential },
      ],
    }));
  } catch {
    res.writeHead(503).end();
  }
}).listen(8090, "0.0.0.0");
