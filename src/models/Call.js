export class Call {
  constructor(operatorId, clientId, stars) {
    this.operatorId = String(operatorId).trim();
    this.clientId = String(clientId).trim();
    this.stars = Number(stars) || 0;
    if (this.stars < 0) this.stars = 0;
    if (this.stars > 5) this.stars = 5;
  }

  get classification() {
    if (this.stars >= 4) return 'Buena';
    if (this.stars >= 2) return 'Media';
    return 'Mala';
  }
}
