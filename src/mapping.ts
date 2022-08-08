import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  LoanCreated,
  LoanCancelled,
  MakeOffer,
  WithdrawFund,
  LoanRepaid,
  PeerLoan as PeerLoanContract,
  RevokeOffer,
  LenderClaimed,
  Liquidated,
} from "../generated/PeerLoan/PeerLoan";
import { Activity, CollateralizedAsset, Lender, NamaLoan } from "../generated/schema";

export function handleLoanCreated(event: LoanCreated): void {
  const loanId = event.params.loanId;
  let data = NamaLoan.load(loanId);

  if (data == null) {
    data = new NamaLoan(loanId);
    data.loanAmount = event.params.amount;
    data.borrower = event.params.borrower.toHexString();
    data.status = BigInt.fromI32(0);
    const contract = PeerLoanContract.bind(event.address);
    const loanResult = contract.try_getLoanData(data.id);
    if (!loanResult.reverted) {
      const metadata = loanResult.value;
      
      data.fundType = metadata.value0.term.fundType;
      data.loanAmount = metadata.value0.term.loanAmount;
      data.targetAmount = metadata.value0.term.targetAmount;
      data.duration = metadata.value0.term.duration;
      data.interestRate = metadata.value0.term.interestRate;
      data.appliedAt = metadata.value0.appliedAt;
      data.withdrawAt = metadata.value0.withdrawAt;
      data.fundRaised = metadata.value0.fundRaised;
      data.amountRepaid = metadata.value0.amountRepaid;
      data.loanType = BigInt.fromI32(metadata.value0.loanType);
      data.createdOnChain = metadata.value0.createdOnChain;
      data.destRecvChain = metadata.value0.destRecvChain;
      data.recverAddress = Address.fromString(metadata.value0.recverAddress);
      data.txHash = event.transaction.hash;
      
      const assets = metadata.value1;
      const securedAssets = new Array<string>(0);
      for (let i = 0; i < assets.length; i++) {
        const asset = new CollateralizedAsset(assets[i].assetIds.toString());
        securedAssets.push(asset.id);
        asset.assetAddress = assets[i].assetAddress;
        asset.assetIds = assets[i].assetIds;
        asset.loan = loanId;
        asset.save();
      }

      data.securedAssets = securedAssets;
    }
  }

  const activityId = event.transaction.hash;
  saveActivity(activityId, data.id, 'Create Loan', event.block.timestamp);

  let activities = data.activities;
  if (activities == null) {
    activities = new Array<Bytes>(0);
  }

  activities.push(activityId);

  data.activities = activities;
  data.save();
}

export function handleLoanCancelled(event: LoanCancelled): void {
  let data = NamaLoan.load(event.params.loanId);

  if (data != null) {
    data.status = BigInt.fromI32(1);

    const activityId = event.transaction.hash;
    saveActivity(activityId, data.id, 'Cancel Loan', event.block.timestamp);
  
    let activities = data.activities;
    if (activities == null) {
      activities = new Array<Bytes>(0);
    }
  
    activities.push(activityId);
    data.activities = activities;
  
    data.save();
  }
}

export function handleMakeOffer(event: MakeOffer): void {
  let data = NamaLoan.load(event.params.loanId);

  if (data != null) {
    data.status = BigInt.fromI32(event.params.status);
    data.fundRaised = event.params.totalRaised;

    const lenderId = event.params.lender.toHexString();
    let lender = Lender.load(lenderId);
    if (lender == null) {
      lender = new Lender(lenderId);
    }
    lender.address = event.params.lender;
    lender.principle = event.params.amount;
    
    lender.loan = data.id;
    let lenders = data.lenders;
    if (lenders == null) {
      lenders = new Array<string>(0);
    }
    const idx = lenders.indexOf(lenderId);
    if (idx == -1) {
      lenders.push(lenderId);
      data.lenders = lenders;
      lender.save();
    }

    const activityId = event.transaction.hash;
    saveActivity(activityId, data.id, 'Make offer', event.block.timestamp);
    
    let activities = data.activities;
    if (activities == null) {
      activities = new Array<Bytes>(0);
    }

    activities.push(activityId);
    data.activities = activities;

    data.save();
  }
}

export function handleRevokeOffer(event: RevokeOffer): void {
  log.info('handle revoke offer event: {}', [event.transaction.hash.toHexString()])
  let data = NamaLoan.load(event.params.loanId);
  if (data != null) {
    data.status = BigInt.fromI32(event.params.status);
    data.fundRaised = event.params.totalRaised;

    let lender = Lender.load(event.params.lender.toHexString());
    if (lender == null) {
      lender = new Lender(event.params.lender.toHexString());
    }
    lender.address = event.params.lender;
    lender.principle = lender.principle.minus(event.params.amount);
    lender.loan = data.id;

    let lenders = data.lenders;
    if (lenders == null) {
      lenders = new Array<string>(0);
    }

    const idx = lenders.indexOf(lender.id);
    if (idx == -1) {
      lenders.push(lender.id);

      data.lenders = lenders;
      lender.save();
    }

    const activityId = event.transaction.hash;
    saveActivity(activityId, data.id, 'Revoke offer', event.block.timestamp);
    
    let activities = data.activities;
    if (activities == null) {
      activities = new Array<Bytes>(0);
    }
  
    activities.push(activityId);
    data.activities = activities;
  
    data.save();
  }
}

export function handleWithdrawFund(event: WithdrawFund): void {
  let data = NamaLoan.load(event.params.loanId);
  if (data != null) {
    data.status = BigInt.fromI32(3);

    const activityId = event.transaction.hash;
    saveActivity(activityId, data.id, 'Withdrew Fund', event.block.timestamp);
    
    let activities = data.activities;
    if (activities == null) {
      activities = new Array<Bytes>(0);
    }
  
    activities.push(activityId);
    data.activities = activities;
  
    data.save();
  }
}

export function handleLoanRepaid(event: LoanRepaid): void {
  let data = NamaLoan.load(event.params.loanId);

  if (data != null) {
    data.status = BigInt.fromI32(4);

    let amountRepaid = data.amountRepaid;
    if (amountRepaid === null) { // use triple = to compare nullable of BigInt type
      amountRepaid = BigInt.fromI32(0);
    }
    data.amountRepaid = event.params.amount.plus(amountRepaid);

    const activityId = event.transaction.hash;
    saveActivity(activityId, data.id, 'Loan Repayment', event.block.timestamp);
    
    let activities = data.activities;
    if (activities == null) {
      activities = new Array<Bytes>(0);
    }
  
    activities.push(activityId);
    data.activities = activities;
  
    data.save();
  }
}

export function handleLenderClaimed(event: LenderClaimed): void {
  // TODO implementation
  log.info('handle lender claimed event: {}', [event.transaction.hash.toHexString()])
}

export function handleLiquidated(event: Liquidated): void {
  // TODO implementation
  log.info('handle loan liquidated event: {}', [event.transaction.hash.toHexString()])
  let data = NamaLoan.load(event.params.loanId);

  if (data != null) {
    data.status = BigInt.fromI32(5);
    data.liquidator = event.params.liquidator;

    const activityId = event.transaction.hash;
    saveActivity(activityId, data.id, 'Loan Liquidated', event.block.timestamp);
    
    let activities = data.activities;
    if (activities == null) {
      activities = new Array<Bytes>(0);
    }
  
    activities.push(activityId);
    data.activities = activities;
  
    data.save();
  }
}

function saveActivity(activityId: Bytes, loanId: Bytes, event: string, timestamp: BigInt): void {
  let activity = Activity.load(activityId);
  if (activity == null) {
    activity = new Activity(activityId);
  }

  activity.loan = loanId;
  activity.event = event;
  activity.timestamp = timestamp;

  activity.save();
}