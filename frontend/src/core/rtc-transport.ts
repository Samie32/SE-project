import { getSession, joinSession, pollSignals, sendSignal, updateConnection } from "@/api/operations";
import { apiFetch } from "./client";
import type { CallTransport } from "./webrtc";

export function validateIceConfiguration(value:unknown):RTCConfiguration {
  if (!value || typeof value !== "object") throw Error("Cấu hình kết nối cuộc gọi không hợp lệ.");
  const raw=value as {iceServers?:unknown; iceTransportPolicy?:unknown};
  if (!Array.isArray(raw.iceServers) || raw.iceServers.length>32) throw Error("Danh sách ICE server không hợp lệ.");
  const iceServers:RTCIceServer[]=raw.iceServers.map(item=>{
    if (!item || typeof item !== "object") throw Error("ICE server không hợp lệ.");
    const server=item as Record<string,unknown>;
    const urls=typeof server.urls === "string" ? [server.urls] : server.urls;
    if (!Array.isArray(urls) || urls.length<1 || urls.length>16 || !urls.every(url=>typeof url === "string" && /^(stun|stuns|turn|turns):[^\s]+$/.test(url))) throw Error("Địa chỉ ICE server không hợp lệ.");
    if (server.username !== undefined && typeof server.username !== "string" || server.credential !== undefined && typeof server.credential !== "string") throw Error("Thông tin ICE server không hợp lệ.");
    return {urls,username:server.username as string|undefined,credential:server.credential as string|undefined};
  });
  const policy=raw.iceTransportPolicy ?? "all";
  if (policy !== "all" && policy !== "relay") throw Error("Chính sách ICE không hợp lệ.");
  if (policy === "relay" && !iceServers.some(s=>(s.urls as string[]).some(u=>/^turns?:/.test(u)))) throw Error("Chế độ relay cần máy chủ TURN.");
  return {iceServers,iceTransportPolicy:policy,bundlePolicy:"max-bundle"};
}

export async function loadIceConfiguration(signal:AbortSignal):Promise<RTCConfiguration> {
  const location=import.meta.env.VITE_WEBRTC_ICE_CONFIG_URL || "/webrtc-config.json";
  const url=new URL(location,window.location.origin);
  if (url.origin !== window.location.origin && url.protocol !== "https:") throw Error("Cấu hình ICE ngoài ứng dụng phải dùng HTTPS.");
  if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
    return validateIceConfiguration(await apiFetch(url.pathname.slice(4)+url.search,{signal,cache:"no-store"}));
  }
  const response=await fetch(url.href,{signal,cache:"no-store",credentials:url.origin === window.location.origin ? "same-origin" : "omit"});
  if (!response.ok) throw Error("Không tải được cấu hình kết nối cuộc gọi.");
  return validateIceConfiguration(await response.json());
}

export const createCallTransport=(id:string, consent:boolean):CallTransport=>({
  ice:loadIceConfiguration,
  join:signal=>joinSession(id,consent,signal),
  session:signal=>getSession(id,signal),
  poll:(after,token,signal)=>pollSignals(id,token,after,signal),
  send:(kind,payload,token,signal)=>sendSignal(id,token,kind,payload,signal),
  connection:(state,version,token,signal)=>updateConnection(id,version,state,token,signal),
});
