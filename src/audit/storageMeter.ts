export const AUDIT_BYTES_CAP = 50 * 1024 * 1024; // 50 MB

export interface StorageMeterIO {
  load: () => number;
  save: (bytes: number) => void;
}

export class StorageMeter {
  private current: number;
  constructor(private io: StorageMeterIO) {
    this.current = io.load();
  }
  bytes(): number {
    return this.current;
  }
  add(n: number): void {
    this.current += n;
    this.io.save(this.current);
  }
  subtract(n: number): void {
    this.current = Math.max(0, this.current - n);
    this.io.save(this.current);
  }
  isOver(): boolean {
    return this.current > AUDIT_BYTES_CAP;
  }
  static estimate(record: unknown): number {
    return JSON.stringify(record).length;
  }
}
