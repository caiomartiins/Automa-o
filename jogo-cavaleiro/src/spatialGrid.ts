/**
 * Grade espacial: divide o mapa em células para encontrar rapidamente os inimigos
 * perto de um ponto, sem precisar testar todos os inimigos do jogo.
 * É reconstruída a cada frame (barato) e reaproveita os arrays para não gerar lixo.
 */
export class SpatialGrid<T extends { x: number; y: number }> {
  private cells = new Map<number, T[]>();
  private used: T[][] = [];
  private spare: T[][] = [];

  constructor(private readonly size: number) {}

  private key(cx: number, cy: number) {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  clear() {
    for (const arr of this.used) {
      arr.length = 0;
      this.spare.push(arr);
    }
    this.used.length = 0;
    this.cells.clear();
  }

  insert(o: T) {
    const k = this.key(Math.floor(o.x / this.size), Math.floor(o.y / this.size));
    let arr = this.cells.get(k);
    if (!arr) {
      arr = this.spare.pop() ?? [];
      this.cells.set(k, arr);
      this.used.push(arr);
    }
    arr.push(o);
  }

  /** Objetos nas células que cobrem o retângulo (pode incluir alguns um pouco fora) */
  queryRect(minX: number, minY: number, maxX: number, maxY: number, out: T[]): T[] {
    out.length = 0;
    const x0 = Math.floor(minX / this.size);
    const x1 = Math.floor(maxX / this.size);
    const y0 = Math.floor(minY / this.size);
    const y1 = Math.floor(maxY / this.size);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }

  query(x: number, y: number, r: number, out: T[]): T[] {
    return this.queryRect(x - r, y - r, x + r, y + r, out);
  }
}
