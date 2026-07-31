import type { BridgePullResponse, BridgeStatusSnapshot, BridgeTxMessage } from "./types"

const BRIDGE_BASE = "/api/bridge"

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Bridge request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function sendBridgeTx(message: BridgeTxMessage): Promise<{ id: string; seq: number | null }> {
  const response = await fetch(`${BRIDGE_BASE}/tx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  })
  return parseJson<{ id: string; seq: number | null }>(response)
}

export async function pullBridgeRx(afterCursor: number): Promise<BridgePullResponse> {
  const response = await fetch(`${BRIDGE_BASE}/rx?after=${afterCursor}`)
  return parseJson<BridgePullResponse>(response)
}

export async function getBridgeStatus(): Promise<BridgeStatusSnapshot> {
  const response = await fetch(`${BRIDGE_BASE}/status`)
  return parseJson<BridgeStatusSnapshot>(response)
}

export async function injectBridgeRx(): Promise<{ seq: number }> {
  const response = await fetch(`${BRIDGE_BASE}/debug/inject`, {
    method: "POST",
  })
  return parseJson<{ seq: number }>(response)
}
