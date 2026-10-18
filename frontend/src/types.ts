export interface Book { id: number; title: string; author: string; isbn: string; description: string | null; }
export interface BookInput { title: string; author: string; isbn: string; description: string; }
export interface Session { authenticated: boolean; username: string; }
