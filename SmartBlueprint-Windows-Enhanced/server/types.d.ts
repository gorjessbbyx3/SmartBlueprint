declare module 'node-arp' {
  export function getMAC(ip: string, callback: (err: any, mac: string) => void): void;
}

declare module 'ping' {
  export interface PingResult {
    alive: boolean;
    time: number | string;
    host: string;
  }
  
  export const promise: {
    probe(host: string, options?: { timeout?: number; min_reply?: number }): Promise<PingResult>;
  };
}

declare module 'node-wifi' {
  // Add basic type definitions for node-wifi if needed
  export function init(options: any): void;
  export function scan(callback: (error: any, networks: any[]) => void): void;
}