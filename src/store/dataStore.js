import { Operator } from '../models/Operator.js';
import { Client } from '../models/Client.js';
import { Call } from '../models/Call.js';

class DataStore {
  constructor() {
    this.operators = new Map(); // id -> Operator
    this.clients = new Map();   // id -> Client
    this.calls = [];            // Call[]
  }

  upsertOperator(id, name) {
    const key = String(id).trim();
    if (!this.operators.has(key)) {
      this.operators.set(key, new Operator(key, name));
    } else {
      // If name differs, keep the first non-empty name.
      const op = this.operators.get(key);
      if (!op.name && name) op.name = name;
    }
  }

  upsertClient(id, name) {
    const key = String(id).trim();
    if (!this.clients.has(key)) {
      this.clients.set(key, new Client(key, name));
    } else {
      const cl = this.clients.get(key);
      if (!cl.name && name) cl.name = name;
    }
  }

  addCall(operatorId, clientId, stars) {
    const call = new Call(operatorId, clientId, stars);
    this.calls.push(call);
  }

  getOperatorsArray() {
    return Array.from(this.operators.values()).sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric:true}));
  }

  getClientsArray() {
    return Array.from(this.clients.values()).sort((a,b) => a.id.localeCompare(b.id, undefined, {numeric:true}));
  }

  getTotalCalls() {
    return this.calls.length;
  }

  clearAll() {
    this.operators.clear();
    this.clients.clear();
    this.calls = [];
  }
}

export const store = new DataStore();
