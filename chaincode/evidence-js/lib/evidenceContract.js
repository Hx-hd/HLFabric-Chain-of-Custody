'use strict';

const { Contract } = require('fabric-contract-api');
const { ClientIdentity } = require('fabric-shim');

class EvidenceContract extends Contract {

  async RegisterEvidence(ctx, evJson) {
    const ev = JSON.parse(evJson);
    const required = ['evId','caseId','hashAlgorithm','hashValue','uri','ownerId'];
    for (const k of required) {
      if (!ev[k]) throw new Error(`Missing field: ${k}`);
    }

    const key = ctx.stub.createCompositeKey('evidence', [ev.evId]);
    const exists = await ctx.stub.getState(key);
    if (exists && exists.length) throw new Error('Evidence ID already exists');

    ev.sealed = false;
    const caller = this._callerId(ctx);
    if (!ev.currentCustodianId) ev.currentCustodianId = caller;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(ev)));

    await ctx.stub.setEvent(
      'EvidenceRegistered',
      Buffer.from(JSON.stringify({ evId: ev.evId, caseId: ev.caseId }))
    );

    return ev.evId;
  }

  async TransferCustody(ctx, evId, toId, reason) {
    if (!evId || !toId) throw new Error('evId and toId required');

    const key = ctx.stub.createCompositeKey('evidence', [evId]);
    const ev = await this._get(ctx, key);
    if (ev.sealed) throw new Error('Evidence is sealed');

    const caller = this._callerId(ctx);
    if (ev.currentCustodianId !== caller) {
      throw new Error('Only the current custodian can transfer');
    }

    ev.currentCustodianId = toId;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(ev)));

    await ctx.stub.setEvent(
      'CustodyTransferred',
      Buffer.from(JSON.stringify({
        evId, fromId: caller, toId,
        reason: reason || '',
        at: new Date().toISOString()
      }))
    );

    return evId;
  }

  async SealEvidence(ctx, evId) {
    if (!evId) throw new Error('evId required');

    const key = ctx.stub.createCompositeKey('evidence', [evId]);
    const ev = await this._get(ctx, key);

    const caller = this._callerId(ctx);
    if (ev.ownerId !== caller) {
      throw new Error('Only the owner can seal this evidence');
    }

    ev.sealed = true;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(ev)));

    await ctx.stub.setEvent(
      'EvidenceSealed',
      Buffer.from(JSON.stringify({ evId, at: new Date().toISOString() }))
    );

    return evId;
  }

  // Helpers
  async _get(ctx, key) {
    const data = await ctx.stub.getState(key);
    if (!data || !data.length) throw new Error('Evidence not found');
    return JSON.parse(data.toString());
  }

  _callerId(ctx) {
    const cid = new ClientIdentity(ctx.stub);
    const uid = cid.getAttributeValue('uid');
    return uid || cid.getID();
  }
}

module.exports = EvidenceContract;

