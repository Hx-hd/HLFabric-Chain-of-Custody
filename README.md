# Digital Evidence Chain of Custody on Hyperledger Fabric

This project implements a simple **chain-of-custody ledger** for digital evidence using **Hyperledger Fabric**.

Right now the focus is on the **chaincode (smart contract)**. It runs on the Fabric **test-network** and defines how evidence is:

- Registered
- Transferred between custodians
- Sealed so it cannot be changed

A small Node.js client is in progress.

---

## What the chaincode does (current state)

Chaincode name: **`evidence`**  
Language: **Node.js (JavaScript)**  
Location: `chaincode/evidence-js/`

Implemented functions:

- **`RegisterEvidence(evJson)`**
  - Creates a new evidence record.
  - Required fields in `evJson`:
    - `evId`, `caseId`, `hashAlgorithm`, `hashValue`, `uri`, `ownerId`
  - Sets `sealed = false`.
  - If `currentCustodianId` is missing, it is set to the caller.
  - Fails if `evId` already exists.
  - Emits `EvidenceRegistered` event.

- **`TransferCustody(evId, toId, reason)`**
  - Changes `currentCustodianId` to `toId`.
  - Only the current custodian can call this.
  - Fails if the evidence is sealed.
  - Emits `CustodyTransferred` event.

- **`SealEvidence(evId)`**
  - Marks evidence as sealed (`sealed = true`).
  - Only the owner (`ownerId`) can seal.
  - After sealing, further transfers are blocked.
  - Emits `EvidenceSealed` event.

---

